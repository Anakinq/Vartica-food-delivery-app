// src/components/MenuItemForm.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { MenuItem } from '../../lib/supabase';
import { uploadVendorImage } from '../../utils/imageUploader';

interface MenuItemFormProps {
  item: MenuItem | null;
  onSave: (data: Partial<MenuItem>, imageFile?: File) => Promise<void>; // ✅ now async
  onClose: () => void;
}

export const MenuItemForm: React.FC<MenuItemFormProps> = ({ item, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || 0,
    category: item?.category || '',
    customCategory: '',
    image_url: item?.image_url || '',
    is_available: item?.is_available ?? true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url ? decodeURIComponent(item.image_url) : null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  useEffect(() => {
    setImagePreview(item?.image_url ? decodeURIComponent(item.image_url) : null);
    setImageFile(null);
    // Check if the current category is a custom one
    const predefinedCategories = ['Main Course', 'Swallow', 'Protein', 'Drink', 'Snack', 'Salad', 'Pizza', 'Side', 'Soup'];
    const isCustom = item?.category && !predefinedCategories.includes(item.category);

    setFormData({
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price || 0,
      category: isCustom ? '' : (item?.category || ''),
      customCategory: isCustom ? (item?.category || '') : '',
      image_url: item?.image_url ? decodeURIComponent(item.image_url) : '',
      is_available: item?.is_available ?? true,
    });
    setShowCustomCategory(isCustom);
  }, [item]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__custom__') {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value, customCategory: '' });
    }
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, customCategory: e.target.value, category: e.target.value });
  };

  const getFinalCategory = () => {
    if (showCustomCategory) {
      return formData.customCategory;
    }
    return formData.category;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    // Validate category
    const finalCategory = getFinalCategory();
    if (!finalCategory.trim()) {
      setError('Please select or enter a category');
      setIsUploading(false);
      return;
    }

    console.log('Form data being submitted:', formData);
    console.log('Image file being submitted:', imageFile);
    console.log('Has image file:', !!imageFile);

    try {
      await onSave({ ...formData, category: finalCategory }, imageFile || undefined);
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Failed to save item. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    console.log('Image file selected:', file);
    console.log('File name:', file?.name);
    console.log('File size:', file?.size);
    console.log('File type:', file?.type);

    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      console.log('Image preview URL created:', url);
      // Clean up later (optional but good practice)
      // We can't easily useEffect here, so we rely on browser cleanup
    } else {
      setImagePreview(item?.image_url || null);
      console.log('No file selected, using existing image URL:', item?.image_url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? 'Edit Menu Item' : 'Add Menu Item'}
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
              placeholder="e.g., Cheeseburger"
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
              placeholder="Describe your item..."
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
                Category
              </label>
              <select
                value={showCustomCategory ? '' : formData.category}
                onChange={handleCategoryChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                <option value="Main Course">Main Course</option>
                <option value="Swallow">Swallow</option>
                <option value="Protein">Protein</option>
                <option value="Drink">Drink</option>
                <option value="Snack">Snack</option>
                <option value="Salad">Salad</option>
                <option value="Pizza">Pizza</option>
                <option value="Side">Side</option>
                <option value="Soup">Soup</option>
                <option value="__custom__">+ Add Custom Category</option>
              </select>
              {showCustomCategory && (
                <input
                  type="text"
                  value={formData.customCategory}
                  onChange={handleCustomCategoryChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                  placeholder="Enter custom category"
                  autoFocus
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Food Image
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
              {isUploading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};