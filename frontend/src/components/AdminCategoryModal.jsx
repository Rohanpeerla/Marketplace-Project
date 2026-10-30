import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { categoryApi } from '../services/api';

export default function AdminCategoryModal({ isOpen, onClose, onCategoriesUpdated }) {
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form Mode: 'create' | 'edit' | null
  const [formMode, setFormMode] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Load categories
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoryApi.getAll();
      if (res.success && Array.isArray(res.categories)) {
        setCategories(res.categories);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && user?.role === 'admin') {
      loadCategories();
      setFormMode(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user, loadCategories]);

  if (!isOpen || user?.role !== 'admin') return null;

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setFormMode('create');
    setError(null);
    setSuccess(null);
  };

  // Open Edit Form
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setFormMode('edit');
    setError(null);
    setSuccess(null);
  };

  // Submit Form (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (formMode === 'create') {
        const res = await categoryApi.create({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        if (res.success) {
          setSuccess(`Category "${name}" created successfully!`);
          setFormMode(null);
          loadCategories();
          if (onCategoriesUpdated) onCategoriesUpdated();
        }
      } else if (formMode === 'edit' && editingCategory) {
        const res = await categoryApi.update(editingCategory.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        if (res.success) {
          setSuccess(`Category "${name}" updated successfully!`);
          setFormMode(null);
          loadCategories();
          if (onCategoriesUpdated) onCategoriesUpdated();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Category
  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"? Products under this category will have their category unlinked.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await categoryApi.delete(cat.id);
      setSuccess(`Category "${cat.name}" deleted successfully.`);
      loadCategories();
      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 text-lg">
              🛡️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Category Administration</h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Create, organize, and manage marketplace product taxonomies and categories.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-xl font-bold"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Status Banners */}
        {success && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 flex items-center justify-between">
            <span>✅ {success}</span>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center justify-between">
            <span>❌ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Marketplace Categories</h3>
              <p className="text-xs text-slate-500">
                Products in the marketplace are organized under these categories.
              </p>
            </div>

            <button
              type="button"
              id="admin-create-category-btn"
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 w-fit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Category
            </button>
          </div>

          {/* Inline Create / Edit Form */}
          {formMode && (
            <div className="p-5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  {formMode === 'create' ? 'Create New Category' : `Edit Category: ${editingCategory?.name}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setFormMode(null)}
                  className="text-purple-400 hover:text-purple-600 font-bold text-sm"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Sports & Outdoors"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description for customer catalog browsing..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setFormMode(null)}
                    className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold shadow-xs disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : formMode === 'create' ? 'Create Category' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories Table */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500">No categories found in database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Active Products</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {cat.name}
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {cat.description || '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {cat.product_count || 0} products
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cat)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-medium rounded transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium rounded transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
