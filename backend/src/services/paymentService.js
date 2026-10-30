const paymentModel = require('../models/paymentModel');
const { orderModel, vendorModel } = require('../models');
const { pool } = require('../config/db');
const { razorpayClient, verifySignature } = require('../config/razorpay');
const config = require('../config/env');
const { AppError } = require('../utils/appError');

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * 1. Create a Razorpay Test Mode Order.
 * Validates authenticated customer ownership of all target orders.
 * Computes authoritative payment total strictly from PostgreSQL.
 * Creates Razorpay Order and records payment records in PostgreSQL.
 */
const createPaymentOrder = async (userId, data = {}) => {
  const { orderIds, orderId } = data;
  const rawIds = orderIds || (orderId ? [orderId] : []);

  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw new AppError('At least one valid orderId is required to create a payment order', 400);
  }

  // Deduplicate and validate format
  const targetIds = [...new Set(rawIds)].filter((id) => typeof id === 'string' && id.trim());
  if (targetIds.length === 0) {
    throw new AppError('Valid orderId UUIDs must be provided', 400);
  }

  // 1. Fetch all requested orders from PostgreSQL
  const ordersSql = `
    SELECT id, user_id, vendor_id, total_amount::FLOAT AS total_amount, order_status, payment_status
    FROM orders
    WHERE id = ANY($1::uuid[]);
  `;
  const { rows: orders } = await pool.query(ordersSql, [targetIds]);

  if (orders.length !== targetIds.length) {
    throw new AppError('One or more specified orders could not be found', 404);
  }

  // 2. Validate customer ownership and payment eligibility
  for (const ord of orders) {
    if (ord.user_id !== userId) {
      throw new AppError('You are not authorized to make payment for this order', 403);
    }
    if (ord.order_status === 'cancelled') {
      throw new AppError(`Order #${ord.id.slice(0, 8)} is cancelled and cannot be paid for`, 409);
    }
    if (ord.payment_status === 'paid') {
      throw new AppError(`Order #${ord.id.slice(0, 8)} is already paid`, 409);
    }
  }

  // 3. Compute total amount strictly from PostgreSQL
  const totalAmount = round2(orders.reduce((sum, ord) => sum + ord.total_amount, 0));
  if (totalAmount <= 0) {
    throw new AppError('Order payment amount must be greater than zero', 400);
  }

  // Razorpay expects smallest currency unit (paise for INR: 100 paise = 1 INR)
  const amountInSubunits = Math.round(totalAmount * 100);
  const currency = config.razorpayCurrency || 'INR';
  const receipt = `rcpt_${orders[0].id.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

  // 4. Create Razorpay Test Order via SDK
  const razorpayOrder = await razorpayClient.orders.create({
    amount: amountInSubunits,
    currency,
    receipt,
    notes: {
      userId,
      orderIds: targetIds.join(','),
      orderCount: targetIds.length.toString(),
    },
  });

  // 5. Upsert payment records in PostgreSQL for each order
  await paymentModel.withTransaction(async (client) => {
    for (const ord of orders) {
      await paymentModel.upsertPayment(client, {
        orderId: ord.id,
        amount: ord.total_amount,
        currency,
        status: 'created',
        razorpayOrderId: razorpayOrder.id,
        paymentProvider: 'razorpay',
      });
    }
  });

  // 6. Return client response (Key Secret is NEVER exposed)
  return {
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount, // subunits (paise)
    currency: razorpayOrder.currency,
    keyId: razorpayClient.getKeyId(),
    orderIds: targetIds,
    totalAmount,
    receipt,
  };
};

/**
 * 2. Verify Razorpay Payment Signature.
 * Cryptographically verifies HMAC SHA-256 signature against razorpay_order_id and razorpay_payment_id.
 * Upon verification: marks payment records as 'paid' and updates orders to 'paid' / 'confirmed'.
 */
const verifyPayment = async (userId, data = {}) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

  if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
    throw new AppError('razorpay_order_id is required for verification', 400);
  }
  if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
    throw new AppError('razorpay_payment_id is required for verification', 400);
  }
  if (!razorpay_signature || typeof razorpay_signature !== 'string') {
    throw new AppError('razorpay_signature is required for verification', 400);
  }

  // 1. Fetch linked payment records in PostgreSQL
  const payments = await paymentModel.findPaymentsByRazorpayOrderId(razorpay_order_id);
  if (!payments || payments.length === 0) {
    throw new AppError(`No payment order found for Razorpay Order ID: ${razorpay_order_id}`, 404);
  }

  // Verify ownership
  for (const pay of payments) {
    if (pay.user_id !== userId) {
      throw new AppError('You are not authorized to verify this payment', 403);
    }
  }

  // Check if already processed
  const allPaid = payments.every((p) => p.status === 'paid');
  if (allPaid) {
    return {
      success: true,
      message: 'Payment already verified and paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'paid',
      orderIds: payments.map((p) => p.order_id),
    };
  }

  // 2. Cryptographic signature check
  const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    // Mark payment as failed on forged/tampered signature
    await paymentModel.withTransaction(async (client) => {
      await paymentModel.markPaymentsFailed(client, {
        razorpayOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    });
    throw new AppError('Invalid payment signature. Verification failed.', 400);
  }

  // 3. Mark payments as paid and update orders inside atomic transaction
  const orderIds = payments.map((p) => p.order_id);
  await paymentModel.withTransaction(async (client) => {
    // Update payments table
    await paymentModel.markPaymentsPaid(client, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    // Update orders: payment_status = 'paid', and order_status moves from 'pending' -> 'confirmed'
    await paymentModel.updateOrdersAfterPayment(client, orderIds, 'paid', 'confirmed');
  });

  return {
    success: true,
    message: 'Payment verified and captured successfully',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    status: 'paid',
    orderIds,
  };
};

/**
 * 3. Handle Payment Failure / Cancellation.
 * Marks payment records as 'failed'.
 */
const handlePaymentFailure = async (userId, data = {}) => {
  const { razorpay_order_id, payment_id } = data;

  if (!razorpay_order_id) {
    throw new AppError('razorpay_order_id is required', 400);
  }

  const payments = await paymentModel.findPaymentsByRazorpayOrderId(razorpay_order_id);
  if (!payments || payments.length === 0) {
    throw new AppError('Payment order not found', 404);
  }

  for (const pay of payments) {
    if (pay.user_id !== userId) {
      throw new AppError('You are not authorized to update this payment', 403);
    }
  }

  const orderIds = payments.map((p) => p.order_id);
  await paymentModel.withTransaction(async (client) => {
    await paymentModel.markPaymentsFailed(client, {
      razorpayOrderId: razorpay_order_id,
      paymentId: payment_id || null,
    });
    await paymentModel.updateOrdersAfterPayment(client, orderIds, 'failed');
  });

  return {
    success: true,
    message: 'Payment marked as failed',
    razorpayOrderId: razorpay_order_id,
    status: 'failed',
    orderIds,
  };
};

/**
 * 4. Retrieve Payment Details by Order ID.
 * Supports Customer (own order), Vendor (own vendor order), or Admin.
 */
const getPaymentByOrderId = async (user, orderId) => {
  const order = await orderModel.findOrderById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (user.role === 'customer' && order.user_id !== user.id) {
    throw new AppError('You are not authorized to view this order payment', 403);
  }

  if (user.role === 'vendor') {
    const vendor = await vendorModel.findByUserId(user.id);
    if (!vendor || order.vendor_id !== vendor.id) {
      throw new AppError('You are not authorized to view this order payment', 403);
    }
  }

  const payment = await paymentModel.findPaymentByOrderId(orderId);
  return {
    orderId,
    orderTotal: order.total_amount,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    payment: payment || null,
  };
};

/**
 * 5. Retrieve Public Payment Gateway Config (Safe for Frontend).
 */
const getPublicConfig = () => {
  return {
    keyId: razorpayClient.getKeyId(),
    currency: config.razorpayCurrency || 'INR',
    mode: 'test',
  };
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  getPaymentByOrderId,
  getPublicConfig,
};
