const PDFDocument = require('pdfkit');
const orderModel = require('../models/orderModel');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const crypto = require('crypto');

class InvoiceService {
  /**
   * Ensure order has a valid invoice number
   */
  async ensureInvoiceNumber(order) {
    if (order.invoice_number) return order.invoice_number;
    const year = new Date(order.created_at || Date.now()).getFullYear();
    const shortId = (order.id.replace(/-/g, '') + crypto.randomBytes(2).toString('hex')).slice(0, 8).toUpperCase();
    const invNum = `INV-${year}-${shortId}`;
    await query('UPDATE orders SET invoice_number = $1 WHERE id = $2', [invNum, order.id]);
    order.invoice_number = invNum;
    return invNum;
  }

  /**
   * Generate Invoice PDF stream for an order
   */
  async generateInvoicePdf(orderId, currentUser) {
    const order = await orderModel.findOrderById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Authorization: User must be owner, vendor for this order, or admin
    const isOwner = currentUser.id === order.user_id;
    const isAdmin = currentUser.role === 'admin';
    const isVendor = currentUser.vendorId && currentUser.vendorId === order.vendor_id;

    if (!isOwner && !isAdmin && !isVendor) {
      throw new AppError('You are not authorized to download this invoice', 403);
    }

    await this.ensureInvoiceNumber(order);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Document styling constants
    const primaryColor = '#2563EB'; // Royal Blue
    const darkColor = '#1F2937';
    const mutedColor = '#6B7280';
    const lightBg = '#F3F4F6';

    // 1. Header & Brand
    doc.fillColor(primaryColor)
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('MarketHub', 40, 40);

    doc.fillColor(mutedColor)
       .fontSize(10)
       .font('Helvetica')
       .text('Multi-Vendor E-Commerce Marketplace', 40, 65);

    // Invoice Meta on Right
    doc.fillColor(darkColor)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('TAX INVOICE', 350, 40, { align: 'right' });

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(mutedColor)
       .text(`Invoice No: ${order.invoice_number}`, 350, 60, { align: 'right' })
       .text(`Order ID: ${order.id}`, 350, 72, { align: 'right' })
       .text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 350, 84, { align: 'right' })
       .text(`Status: ${order.order_status.toUpperCase()} | Payment: ${order.payment_status.toUpperCase()}`, 350, 96, { align: 'right' });

    doc.moveTo(40, 115).lineTo(555, 115).strokeColor('#E5E7EB').stroke();

    // 2. Billing & Vendor Information
    const colY = 130;
    // Billed To
    doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Billed To (Customer):', 40, colY);
    doc.fillColor(darkColor).fontSize(10).font('Helvetica')
       .text(order.customer_name || 'Valued Customer', 40, colY + 16)
       .text(order.customer_email || '', 40, colY + 30)
       .fillColor(mutedColor).fontSize(9)
       .text(`Shipping Address: ${order.shipping_address}`, 40, colY + 44, { width: 230 });

    // Sold By (Vendor)
    doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Sold By (Merchant):', 310, colY);
    doc.fillColor(darkColor).fontSize(10).font('Helvetica')
       .text(order.vendor_name || 'MarketHub Verified Merchant', 310, colY + 16)
       .text(order.vendor_email || '', 310, colY + 30);

    // 3. Line Items Table
    const tableTop = 230;
    doc.rect(40, tableTop, 515, 24).fill(lightBg);

    doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold')
       .text('Item Description', 50, tableTop + 7)
       .text('Qty', 320, tableTop + 7, { width: 40, align: 'center' })
       .text('Price (INR)', 380, tableTop + 7, { width: 80, align: 'right' })
       .text('Total (INR)', 470, tableTop + 7, { width: 80, align: 'right' });

    let currentY = tableTop + 30;
    doc.font('Helvetica').fontSize(9).fillColor(darkColor);

    const items = order.items || [];
    let subtotalCalc = 0;

    items.forEach((item, index) => {
      const lineSubtotal = Number(item.subtotal || item.price * item.quantity);
      subtotalCalc += lineSubtotal;

      if (index % 2 === 1) {
        doc.rect(40, currentY - 4, 515, 20).fill('#FAFAFA');
      }

      doc.fillColor(darkColor)
         .text(item.productName || item.name || 'Product Item', 50, currentY, { width: 260, ellipsis: true })
         .text(String(item.quantity), 320, currentY, { width: 40, align: 'center' })
         .text(Number(item.price).toFixed(2), 380, currentY, { width: 80, align: 'right' })
         .text(lineSubtotal.toFixed(2), 470, currentY, { width: 80, align: 'right' });

      currentY += 22;
    });

    doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor('#E5E7EB').stroke();
    currentY += 15;

    // 4. Totals Calculation Box
    const totalsX = 350;
    doc.fontSize(10).font('Helvetica').fillColor(darkColor);

    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`INR ${subtotalCalc.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });
    currentY += 18;

    const discount = Number(order.discount_amount || 0);
    if (discount > 0) {
      const couponLabel = order.coupon_code ? `Discount (${order.coupon_code}):` : 'Discount:';
      doc.fillColor('#059669').text(couponLabel, totalsX, currentY);
      doc.text(`- INR ${discount.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });
      currentY += 18;
    }

    doc.moveTo(totalsX, currentY).lineTo(555, currentY).strokeColor('#9CA3AF').stroke();
    currentY += 8;

    const finalTotal = Number(order.total_amount || (subtotalCalc - discount));
    doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor);
    doc.text('Final Payable:', totalsX, currentY);
    doc.text(`INR ${finalTotal.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });

    // 5. Payment Details & Notes
    currentY += 50;
    doc.fontSize(9).font('Helvetica').fillColor(mutedColor);
    doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 40, currentY);
    doc.text('Thank you for shopping with MarketHub! For questions regarding this order, contact support.', 40, currentY + 15);
    doc.text('This is a computer-generated invoice and does not require a physical signature.', 40, currentY + 30);

    doc.end();

    return {
      doc,
      filename: `invoice-${order.invoice_number}.pdf`,
      order
    };
  }
}

module.exports = new InvoiceService();

