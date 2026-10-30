const { productModel, productImageModel, vendorModel, categoryModel } = require('../models');
const { AppError } = require('../utils/appError');

/**
 * Helper to assert vendor ownership or admin authority over a product.
 * Returns { product, vendor } if authorized, throws AppError otherwise.
 * @param {Object} user - Decoded JWT user { id, email, role }
 * @param {string} productId - Product UUID
 * @returns {Promise<Object>} { product, vendor }
 */
const assertProductAuthority = async (user, productId) => {
  const product = await productModel.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Admin has universal authority
  if (user.role === 'admin') {
    return { product, vendor: null };
  }

  // Vendor authority requires ownership
  if (user.role === 'vendor') {
    const vendor = await vendorModel.findByUserId(user.id);
    if (!vendor) {
      throw new AppError('Vendor profile not found for this account', 404);
    }

    if (vendor.id !== product.vendor_id) {
      throw new AppError('You are not authorized to modify this product', 403);
    }

    return { product, vendor };
  }

  // Customers or other roles are forbidden
  throw new AppError('Insufficient permissions to manage products', 403);
};

/**
 * List products with filtering and pagination.
 * @param {Object} queryOptions
 * @returns {Promise<Object>}
 */
const getProducts = async (queryOptions = {}) => {
  return productModel.findFiltered(queryOptions);
};

/**
 * Get product details by ID.
 * @param {string} id - Product UUID
 * @returns {Promise<Object>}
 */
const getProductById = async (id) => {
  const product = await productModel.findById(id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  return product;
};

/**
 * Create a new product.
 * Accessible only by approved vendors (or admins specifying a valid vendor).
 * @param {Object} user - Authenticated user
 * @param {Object} data - Product creation payload
 * @returns {Promise<Object>} Created product
 */
const createProduct = async (user, data) => {
  let targetVendorId;

  if (user.role === 'vendor') {
    const vendor = await vendorModel.findByUserId(user.id);
    if (!vendor) {
      throw new AppError('Vendor profile not found. Please register as a vendor first.', 404);
    }

    // Enforce approval status
    if (vendor.status !== 'approved') {
      throw new AppError(
        `Vendor account is ${vendor.status}. Only approved vendors can create products.`,
        403
      );
    }

    // Always determine vendor_id from authenticated vendor profile, NEVER trust client input
    targetVendorId = vendor.id;
  } else if (user.role === 'admin') {
    if (!data.vendorId) {
      throw new AppError('Admin must specify a valid vendorId to associate with the product', 400);
    }
    const vendor = await vendorModel.findById(data.vendorId);
    if (!vendor) {
      throw new AppError('Specified vendor does not exist', 404);
    }
    targetVendorId = vendor.id;
  } else {
    throw new AppError('Only approved vendors and administrators can create products', 403);
  }

  // Validate product fields
  const { name, description, price, stock, categoryId, status = 'active', imageUrl, images } = data;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('Product name is required', 400);
  }
  if (name.trim().length > 200) {
    throw new AppError('Product name must not exceed 200 characters', 400);
  }

  if (price === undefined || price === null || isNaN(price) || Number(price) < 0) {
    throw new AppError('A valid non-negative product price is required', 400);
  }

  const parsedStock = parseInt(stock, 10);
  if (isNaN(parsedStock) || parsedStock < 0) {
    throw new AppError('Product stock must be a non-negative integer', 400);
  }

  // Validate category if provided
  if (categoryId) {
    const category = await categoryModel.findById(categoryId);
    if (!category) {
      throw new AppError('Specified category does not exist', 400);
    }
  }

  // Create product record in PostgreSQL
  const newProduct = await productModel.create({
    vendorId: targetVendorId,
    categoryId: categoryId || null,
    name,
    description,
    price: Number(price),
    stock: parsedStock,
    status: status === 'inactive' ? 'inactive' : 'active',
  });

  // Handle initial image attachment if provided
  if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
    await productImageModel.add({
      productId: newProduct.id,
      imageUrl: imageUrl.trim(),
      isPrimary: true,
    });
  } else if (Array.isArray(images) && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const url = typeof img === 'string' ? img : img.imageUrl;
      if (url && typeof url === 'string' && url.trim()) {
        await productImageModel.add({
          productId: newProduct.id,
          imageUrl: url.trim(),
          isPrimary: i === 0,
        });
      }
    }
  }

  return productModel.findById(newProduct.id);
};

/**
 * Update an existing product.
 * Requires product ownership for vendors; admins can update any product.
 * @param {Object} user - Authenticated user
 * @param {string} productId - Product UUID
 * @param {Object} updateData - Update attributes
 * @returns {Promise<Object>} Updated product
 */
const updateProduct = async (user, productId, updateData) => {
  const { product, vendor } = await assertProductAuthority(user, productId);

  // If vendor, check that vendor status remains approved
  if (vendor && vendor.status !== 'approved') {
    throw new AppError(`Vendor account is ${vendor.status} and cannot update products`, 403);
  }

  // Validate fields if provided
  if (updateData.name !== undefined) {
    if (!updateData.name || typeof updateData.name !== 'string' || !updateData.name.trim()) {
      throw new AppError('Product name cannot be empty', 400);
    }
    if (updateData.name.trim().length > 200) {
      throw new AppError('Product name must not exceed 200 characters', 400);
    }
  }

  if (updateData.price !== undefined) {
    if (isNaN(updateData.price) || Number(updateData.price) < 0) {
      throw new AppError('Product price must be a non-negative number', 400);
    }
  }

  if (updateData.stock !== undefined) {
    const parsedStock = parseInt(updateData.stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      throw new AppError('Product stock must be a non-negative integer', 400);
    }
  }

  if (updateData.categoryId !== undefined && updateData.categoryId !== null) {
    const category = await categoryModel.findById(updateData.categoryId);
    if (!category) {
      throw new AppError('Specified category does not exist', 400);
    }
  }

  if (updateData.status !== undefined && !['active', 'inactive'].includes(updateData.status)) {
    throw new AppError('Product status must be either "active" or "inactive"', 400);
  }

  // Never allow changing product ID or vendor ID
  const sanitizedUpdate = {
    name: updateData.name,
    description: updateData.description,
    price: updateData.price,
    stock: updateData.stock,
    categoryId: updateData.categoryId,
    status: updateData.status,
  };

  await productModel.update(productId, sanitizedUpdate);
  return productModel.findById(productId);
};

/**
 * Soft delete product (set status to 'inactive').
 * Requires product ownership for vendors; admins can delete any product.
 * @param {Object} user - Authenticated user
 * @param {string} productId - Product UUID
 * @returns {Promise<Object>}
 */
const deleteProduct = async (user, productId) => {
  await assertProductAuthority(user, productId);
  return productModel.softDelete(productId);
};

/**
 * Add image URL to product.
 * S3-ready modular design for Stage 4 image URL storage.
 * @param {Object} user - Authenticated user
 * @param {string} productId - Product UUID
 * @param {Object} imageData
 * @param {string} imageData.imageUrl - URL string
 * @param {boolean} [imageData.isPrimary=false]
 * @returns {Promise<Object>} Added image record
 */
const addProductImage = async (user, productId, { imageUrl, isPrimary = false }) => {
  await assertProductAuthority(user, productId);

  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    throw new AppError('Image URL is required', 400);
  }

  const newImage = await productImageModel.add({
    productId,
    imageUrl: imageUrl.trim(),
    isPrimary: Boolean(isPrimary),
  });

  return newImage;
};

/**
 * Delete image from product.
 * @param {Object} user - Authenticated user
 * @param {string} productId - Product UUID
 * @param {string} imageId - Image UUID
 * @returns {Promise<Object>}
 */
const removeProductImage = async (user, productId, imageId) => {
  await assertProductAuthority(user, productId);

  const image = await productImageModel.findById(imageId);
  if (!image || image.product_id !== productId) {
    throw new AppError('Product image not found', 404);
  }

  const removed = await productImageModel.remove(imageId);
  return removed;
};

module.exports = {
  assertProductAuthority,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  removeProductImage,
};
