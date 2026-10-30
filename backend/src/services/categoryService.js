const { categoryModel } = require('../models');
const { AppError } = require('../utils/appError');

/**
 * Retrieve all categories.
 * @returns {Promise<Array>}
 */
const getAllCategories = async () => {
  return categoryModel.findAll();
};

/**
 * Retrieve category by ID.
 * @param {string} id - Category UUID
 * @returns {Promise<Object>}
 */
const getCategoryById = async (id) => {
  const category = await categoryModel.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  return category;
};

/**
 * Create a new category (Admin only).
 * @param {Object} data
 * @param {string} data.name - Category name
 * @param {string} [data.description]
 * @returns {Promise<Object>}
 */
const createCategory = async ({ name, description }) => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new AppError('Category name is required', 400);
  }
  if (name.trim().length > 100) {
    throw new AppError('Category name must not exceed 100 characters', 400);
  }

  // Check for duplicate name
  const existing = await categoryModel.findByName(name);
  if (existing) {
    throw new AppError(`A category with the name "${name.trim()}" already exists`, 409);
  }

  return categoryModel.create({
    name,
    description,
  });
};

/**
 * Update an existing category (Admin only).
 * @param {string} id - Category UUID
 * @param {Object} data
 * @param {string} [data.name]
 * @param {string} [data.description]
 * @returns {Promise<Object>}
 */
const updateCategory = async (id, { name, description }) => {
  const existing = await categoryModel.findById(id);
  if (!existing) {
    throw new AppError('Category not found', 404);
  }

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Category name cannot be empty', 400);
    }
    if (name.trim().length > 100) {
      throw new AppError('Category name must not exceed 100 characters', 400);
    }

    const duplicate = await categoryModel.findByName(name);
    if (duplicate && duplicate.id !== id) {
      throw new AppError(`A category with the name "${name.trim()}" already exists`, 409);
    }
  }

  return categoryModel.update(id, { name, description });
};

/**
 * Delete a category (Admin only).
 * Associated products will automatically retain null category_id.
 * @param {string} id - Category UUID
 * @returns {Promise<Object>}
 */
const deleteCategory = async (id) => {
  const existing = await categoryModel.findById(id);
  if (!existing) {
    throw new AppError('Category not found', 404);
  }

  return categoryModel.remove(id);
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
