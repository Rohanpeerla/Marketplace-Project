const { productService } = require('../services');

/**
 * List products with query filters.
 * GET /api/products
 */
const getAll = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      category_id,
      vendor_id,
      min_price,
      max_price,
      status,
      search,
    } = req.query;

    const result = await productService.getProducts({
      page,
      limit,
      categoryId: category_id,
      vendorId: vendor_id,
      minPrice: min_price,
      maxPrice: max_price,
      status,
      search,
    });

    return res.status(200).json({
      success: true,
      products: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product details by ID.
 * GET /api/products/:id
 */
const getById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create product (Approved Vendor only).
 * POST /api/products
 */
const create = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category_id,
      categoryId,
      status,
      imageUrl,
      images,
      vendorId,
    } = req.body;

    const product = await productService.createProduct(req.user, {
      name,
      description,
      price,
      stock,
      categoryId: categoryId || category_id,
      status,
      imageUrl,
      images,
      vendorId,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Product owner vendor or Admin).
 * PUT /api/products/:id
 */
const update = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      category_id,
      categoryId,
      status,
    } = req.body;

    const product = await productService.updateProduct(req.user, req.params.id, {
      name,
      description,
      price,
      stock,
      categoryId: categoryId !== undefined ? categoryId : category_id,
      status,
    });

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (Product owner vendor or Admin).
 * DELETE /api/products/:id
 */
const remove = async (req, res, next) => {
  try {
    const deleted = await productService.deleteProduct(req.user, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Product deactivated successfully',
      product: deleted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add image to product.
 * POST /api/products/:id/images
 */
const addImage = async (req, res, next) => {
  try {
    const { image_url, imageUrl, is_primary, isPrimary } = req.body;
    const image = await productService.addProductImage(req.user, req.params.id, {
      imageUrl: imageUrl || image_url,
      isPrimary: isPrimary !== undefined ? isPrimary : is_primary,
    });

    return res.status(201).json({
      success: true,
      message: 'Product image added successfully',
      image,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove image from product.
 * DELETE /api/products/:id/images/:imageId
 */
const removeImage = async (req, res, next) => {
  try {
    await productService.removeProductImage(req.user, req.params.id, req.params.imageId);
    return res.status(200).json({
      success: true,
      message: 'Product image removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  addImage,
  removeImage,
};
