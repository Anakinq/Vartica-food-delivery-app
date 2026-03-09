// src/components/MenuItemForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { MenuItem, VendorCategory, CafeteriaCategory } from '../../lib/supabase/types';
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
  const [cafeteriaCategories, setCafeteriaCategories] = useState<CafeteriaCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Determine if this is a cafeteria user
  const isCafeteria = profile?.role === 'cafeteria';

  // Determine if this is a business vendor vs food vendor
  const isBusinessVendor = profile?.vendor?.vendor_type === 'late_night' ||
    (profile?.vendor?.vendor_type && !['student'].includes(profile.vendor.vendor_type));

  // Default categories for cafeterias (food-based)
  const cafeteriaDefaultCategories = [
    { id: 'breakfast', name: 'Breakfast', category_type: 'food' as const, sort_order: 1, is_active: true, cafeteria_id: '' },
    { id: 'lunch', name: 'Lunch', category_type: 'food' as const, sort_order: 2, is_active: true, cafeteria_id: '' },
    { id: 'dinner', name: 'Dinner', category_type: 'food' as const, sort_order: 3, is_active: true, cafeteria_id: '' },
    { id: 'snacks', name: 'Snacks', category_type: 'food' as const, sort_order: 4, is_active: true, cafeteria_id: '' },
    { id: 'drinks', name: 'Drinks', category_type: 'food' as const, sort_order: 5, is_active: true, cafeteria_id: '' },
    { id: 'desserts', name: 'Desserts', category_type: 'food' as const, sort_order: 6, is_active: true, cafeteria_id: '' },
    { id: 'other', name: 'Other', category_type: 'general' as const, sort_order: 7, is_active: true, cafeteria_id: '' },
  ];

  // Default categories for business vendors
  const businessDefaultCategories = [
    { id: 'electronics', name: 'Electronics', category_type: 'product' as const, sort_order: 1, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'accessories', name: 'Accessories', category_type: 'product' as const, sort_order: 2, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'clothing', name: 'Clothing', category_type: 'product' as const, sort_order: 3, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'services', name: 'Services', category_type: 'service' as const, sort_order: 4, is_active: true, vendor_id: profile?.vendor?.id || '' },
    { id: 'other', name: 'Other', category_type: 'general' as const, sort_order: 5, is_active: true, vendor_id: profile?.vendor?.id || '' },
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
        console.error('Error fetching vendor categories:', error);
      } else if (data) {
        setVendorCategories(data);
      }
    } catch (err) {
      console.error('Error fetching vendor categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch cafeteria categories from database
  const fetchCafeteriaCategories = async (cafeteriaId: string) => {
    if (!cafeteriaId) return;

    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('cafeteria_categories')
        .select('*')
        .eq('cafeteria_id', cafeteriaId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching cafeteria categories:', error);
      } else if (data) {
        setCafeteriaCategories(data as unknown as CafeteriaCategory[]);
      }
    } catch (err) {
      console.error('Error fetching cafeteria categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (isCafeteria && profile?.cafeteria?.id) {
      fetchCafeteriaCategories(profile.cafeteria.id);
    } else if (profile?.vendor?.id) {
      fetchVendorCategories();
    }
  }, [profile?.vendor?.id, profile?.cafeteria?.id, isCafeteria]);

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
    if (!newCategoryName.trim()) return;

    try {
      if (isCafeteria && profile?.cafeteria?.id) {
        // Add to cafeteria_categories
        const { data, error } = await supabase
          .from('cafeteria_categories')
          .insert({
            cafeteria_id: profile.cafeteria.id,
            name: newCategoryName.trim(),
            category_type: 'food',
            sort_order: cafeteriaCategories.length + 1,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          showError('Failed to add category: ' + error.message);
        } else {
          setCafeteriaCategories([...cafeteriaCategories, data]);
          setFormData({
            ...formData,
            category: data.name,
            category_id: data.id
          });
          setNewCategoryName('');
          setShowAddCategory(false);
        }
      } else if (profile?.vendor?.id) {
        // Add to vendor_categories
        const { data, error } = await supabase
          .from('vendor_categories')
          .insert({
            vendor_id: profile.vendor.id,
            name: newCategoryName.trim(),
            category_type: 'general',
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
      if (isCafeteria) {
        const { error } = await supabase
          .from('cafeteria_categories')
          .update({ is_active: false })
          .eq('id', categoryId);

        if (error) {
          showError('Failed to delete category: ' + error.message);
        } else {
          setCafeteriaCategories(cafeteriaCategories.filter(c => c.id !== categoryId));
          if (formData.category_id === categoryId) {
            setFormData({ ...formData, category: '', category_id: '' });
          }
        }
      } else {
        const { error } = await supabase
          .from('vendor_categories')
          .update({ is_active: false })
          .eq('id', categoryId);

        if (error) {
          showError('Failed to delete category: ' + error.message);
        } else {
          setVendorCategories(vendorCategories.filter(c => c.id !== categoryId));
          if (formData.category_id === categoryId) {
            setFormData({ ...formData, category: '', category_id: '' });
          }
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
      // Convert empty category_id to null for UUID field
      const dataToSave = {
        ...formData,
        category_id: formData.category_id || null
      };
      await onSave(dataToSave, imageFile || undefined);
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

  // Get categories to display based on user type
  const getDisplayCategories = () => {
    if (isCafeteria) {
      return cafeteriaCategories.length > 0 ? cafeteriaCategories : cafeteriaDefaultCategories;
    } else {
      return vendorCategories.length > 0 ? vendorCategories : businessDefaultCategories;
    }
  };

  const getDefaultCategories = () => isCafeteria ? cafeteriaDefaultCategories : businessDefaultCategories;

  const displayCategories = getDisplayCategories();

  // Check if current category is a custom category
  const isCustomCategory = () => {
    if (isCafeteria) {
      return cafeteriaCategories.some(c => c.id === formData.category_id);
    } else {
      return vendorCategories.some(c => c.id === formData.category_id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? 'Edit Item' : isCafeteria ? 'Add Menu Item' : isBusinessVendor ? 'Add Product' : 'Add Menu Item'}
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
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isCafeteria ? "e.g., Cheeseburger" : isBusinessVendor ? "e.g., Laptop Stand" : "e.g., Small Fries"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isBusinessVendor ? "Describe your product/service..." : "Describe your item..."}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-4 py-3 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Category *
              </label>

              {loadingCategories ? (
                <div className="w-full px-4 py-3 border border-gray-500 rounded-lg bg-gray-200">
                  Loading categories...
                </div>
              ) : (
                <div className="relative">
                  {showAddCategory ? (
                    // Inline add category form
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-2 font-medium">Add New Category</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="flex-1 px-3 py-2 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddCategory}
                          disabled={!newCategoryName.trim()}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCategory(false);
                            setNewCategoryName('');
                          }}
                          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
                          const categories = isCafeteria ? cafeteriaCategories : vendorCategories;
                          const defaults = getDefaultCategories();
                          const selectedCat = categories.find(c => c.id === e.target.value || c.name === e.target.value)
                            || defaults.find(c => c.id === e.target.value || c.name === e.target.value);
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
                        className="flex-1 px-4 py-3 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select category</option>
                        {displayCategories.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>

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
                  {formData.category_id && isCustomCategory() && (
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
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Image
            </label>
            <div className="border-2 border-dashed border-gray-500 rounded-lg p-4 text-center">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setFormData({ ...formData, image_url: '' });
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <Upload className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-700">Click to upload image</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-500 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_available" className="text-sm font-medium text-gray-900">
              Available for order
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-500 text-gray-800 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? 'Saving...' : item ? 'Update' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function Upload(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

export default MenuItemForm;
