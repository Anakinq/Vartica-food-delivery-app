// src/components/MenuItemForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { MenuItem, VendorCategory } from '../../lib/supabase/types';
import { uploadVendorImage } from '../../utils/imageUploader';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase/client';

interface MenuItemFormProps {
  item: MenuItem | null;
  onSave: (data: Partial<MenuItem>, imageFile?: File) => Promise<void>;
  onClose: () => void;
}

export const MenuItemForm: React.FC<MenuItemFormProps> = ({ item, onSave, onClose }) => {
  const { profile } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || 0,
    category: item?.category || '',
    category_id: item?.category_id || '',
    image_url: item?.image_url || '',
    is_available: item?.is_available ?? true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url ? decodeURIComponent(item.image_url) : null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic categories state
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'food' | 'product' | 'service' | 'general'>('general');

  // Determine if this is a business vendor vs food vendor
  // Business vendors: late_night_vendor, or any vendor that should show product categories
  const isBusinessVendor = profile?.vendor?.vendor_type === 'late_night' ||
    profile?.role === 'late_night_vendor' ||
    (profile?.vendor?.vendor_type && !['student'].includes(profile.vendor.vendor_type));

  // Default categories for business vendors
  const businessDefaultCategories = [
    { id: 'electronics', name: 'Electronics', category_type: 'product', sort_order: 1, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'accessories', name: 'Accessories', category_type: 'product', sort_order: 2, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'clothing', name: 'Clothing', category_type: 'product', sort_order: 3, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'services', name: 'Services', category_type: 'service', sort_order: 4, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'other', name: 'Other', category_type: 'general', sort_order: 5, is_active: true, vendor_id: profile?.vendor?.id || '' },
  ];

  // Fetch vendor categories from database
  const fetchVendorCategories = async () => {
    if (!profile?.vendor?.id) return;

    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('vendor_categories')
        .select('*')
        .eq('vendor_id', profile.vendor.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
      } else if (data) {
        setVendorCategories(data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchVendorCategories();
  }, [profile?.vendor?.id]);

  useEffect(() => {
    setImagePreview(item?.image_url ? decodeURIComponent(item.image_url) : null);
    setImageFile(null);
    setFormData({
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price || 0,
      category: item?.category || '',
      category_id: item?.category_id || '',
      image_url: item?.image_url ? decodeURIComponent(item.image_url) : '',
      is_available: item?.is_available ?? true,
    });
  }, [item]);

  // Add new custom category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !profile?.vendor?.id) return;

    try {
      const { data, error } = await supabase
        .from('vendor_categories')
        .insert({
          vendor_id: profile.vendor.id,
          name: newCategoryName.trim(),
          category_type: isBusinessVendor ? 'product' : isFoodVendor ? 'food' : 'general',
          sort_order: vendorCategories.length + 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        showError('Failed to add category: ' + error.message);
      } else {
        setVendorCategories([...vendorCategories, data]);
        setFormData({
          ...formData,
          category: data.name,
          category_id: data.id
        });
        setNewCategoryName('');
        setShowAddCategory(false);
      }
    } catch (err) {
      console.error('Error adding category:', err);
      showError('Failed to add category. Please try again.');
    }
  };

  // Delete custom category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Items in this category will not be deleted.')) return;

    try {
      const { error } = await supabase
        .from('vendor_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) {
        showError('Failed to delete category: ' + error.message);
      } else {
        setVendorCategories(vendorCategories.filter(c => c.id !== categoryId));
        // Clear category selection if deleted category was selected
        if (formData.category_id === categoryId) {
          setFormData({ ...formData, category: '', category_id: '' });
        }
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      showError('Failed to delete category. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    // Validate category
    if (!formData.category.trim()) {
      setError('Please select or add a category');
      setIsUploading(false);
      return;
    }

    try {
      await onSave({ ...formData }, imageFile || undefined);
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Failed to save item. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(item?.image_url || null);
    }
  };

  // Get categories to display
  // Use database categories if they exist, otherwise use default categories
  const displayCategories = vendorCategories.length > 0
    ? vendorCategories
    : businessDefaultCategories;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? 'Edit Product' : isBusinessVendor ? 'Add Product' : 'Add Menu Item'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isBusinessVendor ? "e.g., Laptop Stand" : "e.g., Cheeseburger"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isBusinessVendor ? "Describe your product/service..." : "Describe your item..."}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>

              {loadingCategories ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                  Loading categories...
                </div>
              ) : vendorCategories.length === 0 ? (
                // Default categories shown directly
                <select
                  value={formData.category_id || formData.category}
                  onChange={(e) => {
                    const selectedCat = businessDefaultCategories.find(c => c.id === e.target.value || c.name === e.target.value);
                    if (selectedCat) {
                      setFormData({
                        ...formData,
                        category: selectedCat.name,
                        category_id: selectedCat.id
                      });
                    } else {
                      setFormData({
                        ...formData,
                        category: e.target.value,
                        category_id: ''
                      });
                    }
                  }}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {businessDefaultCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : vendorCategories.length === 0 ? (
                // No categories yet - prompt to add one
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-3">No categories yet. Add your first category to organize your items.</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {showAddCategory ? (
                    // Inline add category form
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                      <p className="text-sm text-blue-700 mb-2">Add New Category</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          disabled={!newCategoryName.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCategory(false);
                            setNewCategoryName('');
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Category select with add button
                    <div className="flex gap-2">
                      <select
                        value={formData.category_id || formData.category}
                        onChange={(e) => {
                          const selectedCat = vendorCategories.find(c => c.id === e.target.value);
                          if (selectedCat) {
                            setFormData({
                              ...formData,
                              category: selectedCat.name,
                              category_id: selectedCat.id
                            });
                          } else {
                            setFormData({
                              ...formData,
                              category: e.target.value,
                              category_id: ''
                            });
                          }
                        }}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select category</option>
                        {displayCategories.map((cat: any) => (
                          <option key={cat.id || cat.value} value={cat.id || cat.value}>
                            {cat.name || cat.label}
                          </option>
                        ))}
                      </select>

                      {/* Add Category Button */}
                      <button
                        type="button"
                        onClick={() => setShowAddCategory(true)}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        title="Add custom category"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  )}

                  {/* Show delete button if it's a custom category */}
                  {formData.category_id && vendorCategories.find(c => c.id === formData.category_id) && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        Custom category
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(formData.category_id!)}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isBusinessVendor ? "Product Image" : "Product Image"}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview || ''}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-md border"
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="is_available" className="ml-2 text-sm font-medium text-gray-700">
              Available for order
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-70"
            >
              {isUploading ? 'Saving...' : item ? 'Update Product' : isBusinessVendor ? 'Add Product' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
