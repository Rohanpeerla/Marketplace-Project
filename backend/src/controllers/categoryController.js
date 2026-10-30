const { categoryService } = require('../services');

/**
 * List all categories.
 * GET /api/categories
 */
const getAll = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();
    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID.
 * GET /api/categories/:id
 */
const getById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new category (Admin only).
 * POST /api/categories
 */
const create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await categoryService.createCategory({ name, description });
    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category (Admin only).
 * PUT /api/categories/:id
 */
const update = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const category = await categoryService.updateCategory(req.params.id, { name, description });
    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category (Admin only).
 * DELETE /api/categories/:id
 */
const remove = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
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
};
