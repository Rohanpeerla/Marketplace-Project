import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { vendorApi, productApi, categoryApi } from '../services/api';

export default function VendorDashboardModal({ isOpen, onClose }) {
  const { user, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'profile'
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Profile Form Fields
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Products State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);
  const [productSuccess, setProductSuccess] = useState(null);

  // Product Add / Edit Modal Sub-state
  const [productModalMode, setProductModalMode] = useState(null); // 'add' | 'edit' | 'images' | null
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Product Form Fields
  const [pName, setPName] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pStock, setPStock] = useState('0');
  const [pCategoryId, setPCategoryId] = useState('');
  const [pStatus, setPStatus] = useState('active');
  const [pImageUrl, setPImageUrl] = useState('');

  // Image Management Sub-state
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageIsPrimary, setNewImageIsPrimary] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageError, setImageError] = useState(null);

  // Load Vendor Profile
  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await vendorApi.getMe();
      if (res.success && res.vendor) {
        setVendorProfile(res.vendor);
        setBusinessName(res.vendor.business_name || '');
        setBusinessEmail(res.vendor.business_email || '');
        setPhone(res.vendor.phone || '');
        setAddress(res.vendor.address || '');
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to fetch vendor profile.');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Load Vendor Products & Categories
  const loadVendorProducts = useCallback(async (vendorId) => {
    if (!vendorId) return;
    setLoadingProducts(true);
    setProductError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        productApi.getAll({ vendorId, status: 'all', limit: 100 }),
        categoryApi.getAll(),
      ]);

      if (prodRes.success && Array.isArray(prodRes.products)) {
        setProducts(prodRes.products);
      }
      if (catRes.success && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
      }
    } catch (err) {
      setProductError(err.message || 'Failed to fetch vendor products.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && user?.role === 'vendor') {
      loadProfile();
    }
  }, [isOpen, user, loadProfile]);

  useEffect(() => {
    if (vendorProfile?.id) {
      loadVendorProducts(vendorProfile.id);
    }
  }, [vendorProfile, loadVendorProducts]);

  if (!isOpen || user?.role !== 'vendor') return null;

  const isApproved = vendorProfile?.status === 'approved';

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const res = await vendorApi.updateMe({
        businessName,
        businessEmail,
        phone,
        address,
      });

      if (res.success && res.vendor) {
        setVendorProfile(res.vendor);
        setProfileMessage('Vendor profile updated successfully!');
        if (refreshProfile) refreshProfile();
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Create Product Form
  const handleOpenAddProduct = () => {
    if (!isApproved) return;
    setPName('');
    setPDescription('');
    setPPrice('');
    setPStock('10');
    setPCategoryId(categories[0]?.id || '');
    setPStatus('active');
    setPImageUrl('');
    setProductModalMode('add');
    setProductError(null);
    setProductSuccess(null);
  };

  // Open Edit Product Form
  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setPName(prod.name || '');
    setPDescription(prod.description || '');
    setPPrice(String(prod.price ?? ''));
    setPStock(String(prod.stock ?? '0'));
    setPCategoryId(prod.category_id || '');
    setPStatus(prod.status || 'active');
    setProductModalMode('edit');
    setProductError(null);
    setProductSuccess(null);
  };

  // Open Images Management View
  const handleOpenImages = async (prod) => {
    try {
      const full = await productApi.getById(prod.id);
      setEditingProduct(full.product || prod);
      setProductModalMode('images');
      setNewImageUrl('');
      setNewImageIsPrimary(false);
      setImageError(null);
    } catch {
      setEditingProduct(prod);
      setProductModalMode('images');
    }
  };

  // Submit Add Product
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    setProductError(null);

    try {
      if (productModalMode === 'add') {
        const res = await productApi.create({
          name: pName,
          description: pDescription,
          price: parseFloat(pPrice),
          stock: parseInt(pStock, 10),
          categoryId: pCategoryId || null,
          status: pStatus,
          imageUrl: pImageUrl.trim() ? pImageUrl.trim() : undefined,
        });

        if (res.success) {
          setProductSuccess(`"${pName}" created successfully!`);
          setProductModalMode(null);
          loadVendorProducts(vendorProfile.id);
        }
      } else if (productModalMode === 'edit' && editingProduct) {
        const res = await productApi.update(editingProduct.id, {
          name: pName,
          description: pDescription,
          price: parseFloat(pPrice),
          stock: parseInt(pStock, 10),
          categoryId: pCategoryId || null,
          status: pStatus,
        });

        if (res.success) {
          setProductSuccess(`"${pName}" updated successfully!`);
          setProductModalMode(null);
          loadVendorProducts(vendorProfile.id);
        }
      }
    } catch (err) {
      setProductError(err.message || 'Operation failed.');
    } finally {
      setSavingProduct(false);
    }
  };

  // Handle Delete / Deactivate Product
  const handleDeleteProduct = async (prod) => {
    if (!window.confirm(`Are you sure you want to deactivate "${prod.name}"?`)) return;

    try {
      await productApi.delete(prod.id);
      setProductSuccess(`"${prod.name}" has been deactivated.`);
      loadVendorProducts(vendorProfile.id);
    } catch (err) {
      setProductError(err.message || 'Failed to deactivate product.');
    }
  };

  // Add Image to Product
  const handleAddImage = async (e) => {
    e.preventDefault();
    if (!newImageUrl.trim() || !editingProduct) return;
    setSavingImage(true);
    setImageError(null);

    try {
      await productApi.addImage(editingProduct.id, {
        imageUrl: newImageUrl.trim(),
        isPrimary: newImageIsPrimary,
      });

      // Refresh product details
      const refreshed = await productApi.getById(editingProduct.id);
      setEditingProduct(refreshed.product);
      setNewImageUrl('');
      setNewImageIsPrimary(false);
      loadVendorProducts(vendorProfile.id);
    } catch (err) {
      setImageError(err.message || 'Failed to add image.');
    } finally {
      setSavingImage(false);
    }
  };

  // Remove Image from Product
  const handleRemoveImage = async (imageId) => {
    if (!editingProduct) return;
    try {
      await productApi.removeImage(editingProduct.id, imageId);
      const refreshed = await productApi.getById(editingProduct.id);
      setEditingProduct(refreshed.product);
      loadVendorProducts(vendorProfile.id);
    } catch (err) {
      setImageError(err.message || 'Failed to remove image.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-lg">
              🏪
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Vendor Management Dashboard</h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    vendorProfile?.status === 'approved'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : vendorProfile?.status === 'rejected'
                      ? 'bg-rose-950 text-rose-400 border-rose-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}
                >
                  {vendorProfile?.status || 'Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {vendorProfile?.business_name || 'Loading vendor shop...'} &bull; {user?.email}
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

        {/* Status / Alert Banners */}
        {!isApproved && vendorProfile && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-900 flex items-center gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span>
              <strong>Account Pending Approval:</strong> Your vendor application is currently awaiting administrator review. You can manage your profile, but creating and publishing products requires an approved status.
            </span>
          </div>
        )}

        {productSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 flex items-center justify-between">
            <span>✅ {productSuccess}</span>
            <button
              type="button"
              onClick={() => setProductSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {productError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center justify-between">
            <span>❌ {productError}</span>
            <button
              type="button"
              onClick={() => setProductError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📦 My Products</span>
            <span className="px-2 py-0.2 rounded-full text-xs bg-slate-200 text-slate-700">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚙️ Vendor Profile</span>
          </button>
        </div>

        {/* Body Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: PRODUCTS LIST */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Products Catalog</h3>
                  <p className="text-xs text-slate-500">
                    Manage your active inventory, update prices and stock levels, and organize product photos.
                  </p>
                </div>

                <button
                  type="button"
                  id="vendor-add-product-btn"
                  disabled={!isApproved}
                  onClick={handleOpenAddProduct}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ${
                    isApproved
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={!isApproved ? 'Requires approved vendor status' : 'Add new product'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              </div>

              {/* Products Table */}
              {loadingProducts ? (
                <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                  Loading your product catalog...
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="text-4xl mb-2">📦</div>
                  <h4 className="text-sm font-bold text-slate-800">No products added yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {isApproved
                      ? 'Click the "Add Product" button above to publish your first marketplace item.'
                      : 'Your vendor account is pending review. Once approved, you can add products.'}
                  </p>
                  {isApproved && (
                    <button
                      type="button"
                      onClick={handleOpenAddProduct}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                    >
                      Create First Product
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Price</th>
                        <th className="py-3 px-3">Stock</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {products.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                {prod.primary_image ? (
                                  <img
                                    src={prod.primary_image}
                                    alt={prod.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    📦
                                  </div>
                                )}
                              </div>
                              <div className="truncate max-w-[200px]">
                                <span className="font-semibold text-slate-900 block truncate">
                                  {prod.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  ID: {prod.id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              {prod.category_name || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            ${Number(prod.price).toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                prod.stock <= 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : prod.stock <= 5
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {prod.stock} units
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                prod.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {prod.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenImages(prod)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded transition"
                                title="Manage product images"
                              >
                                Images ({prod.image_count || (prod.primary_image ? 1 : 0)})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(prod)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-medium rounded transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium rounded transition"
                              >
                                Deactivate
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
          )}

          {/* TAB 2: VENDOR PROFILE */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Vendor Business Profile</h3>
                <p className="text-xs text-slate-500">
                  Update your storefront information displayed to customers across the marketplace.
                </p>
              </div>

              {profileMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <span>✅ {profileMessage}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <span>❌ {profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Contact / Business Email
                  </label>
                  <input
                    type="email"
                    required
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1-555-0100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Account Status
                    </label>
                    <input
                      type="text"
                      disabled
                      value={vendorProfile?.status ? vendorProfile.status.toUpperCase() : 'PENDING'}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Business Address
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Suite, Street Address, City, State, ZIP"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile || loadingProfile}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 transition disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* SUB-MODAL 1: ADD / EDIT PRODUCT */}
        {productModalMode && productModalMode !== 'images' && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setProductModalMode(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 overflow-y-auto max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  {productModalMode === 'add' ? 'Add New Product' : `Edit "${editingProduct?.name}"`}
                </h3>
                <button
                  type="button"
                  onClick={() => setProductModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    placeholder="e.g. Ergonomic Keyboard"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="49.99"
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Stock Count *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="10"
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Category
                    </label>
                    <select
                      value={pCategoryId}
                      onChange={(e) => setPCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="">Select a Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Listing Status
                    </label>
                    <select
                      value={pStatus}
                      onChange={(e) => setPStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                {productModalMode === 'add' && (
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Primary Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={pImageUrl}
                      onChange={(e) => setPImageUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detailed specifications, features, and warranty details..."
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setProductModalMode(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-xs disabled:opacity-50 transition"
                  >
                    {savingProduct ? 'Saving...' : productModalMode === 'add' ? 'Publish Product' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUB-MODAL 2: MANAGE IMAGES */}
        {productModalMode === 'images' && editingProduct && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setProductModalMode(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 overflow-y-auto max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Images</h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">{editingProduct.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductModalMode(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {imageError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {imageError}
                </div>
              )}

              {/* Current Images Gallery */}
              <div className="space-y-2 mb-6">
                <span className="text-xs font-semibold uppercase text-slate-600 block">
                  Current Gallery Images
                </span>

                {Array.isArray(editingProduct.images) && editingProduct.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {editingProduct.images.map((img) => (
                      <div
                        key={img.id}
                        className="relative rounded-xl border border-slate-200 overflow-hidden group bg-slate-50 flex flex-col"
                      >
                        <div className="aspect-video bg-slate-100 overflow-hidden">
                          <img
                            src={img.image_url}
                            alt="Product preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-2 flex items-center justify-between bg-white text-[10px]">
                          {img.is_primary ? (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase">
                              Primary
                            </span>
                          ) : (
                            <span className="text-slate-400">Additional</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img.id)}
                            className="text-rose-600 hover:text-rose-800 font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
                    No images uploaded yet.
                  </div>
                )}
              </div>

              {/* Add New Image URL Form */}
              <form onSubmit={handleAddImage} className="space-y-3 pt-3 border-t border-slate-200 text-xs">
                <span className="font-semibold uppercase text-slate-600 block">Add Image URL</span>
                <div>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="new-image-primary"
                    checked={newImageIsPrimary}
                    onChange={(e) => setNewImageIsPrimary(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="new-image-primary" className="text-slate-700 cursor-pointer">
                    Set as Primary (Hero) Image
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setProductModalMode(null)}
                    className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Done
                  </button>
                  <button
                    type="submit"
                    disabled={savingImage || !newImageUrl.trim()}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50"
                  >
                    {savingImage ? 'Adding...' : 'Add Image'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

