import React, { useState, useEffect } from 'react';
import { X, Upload, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface EditProductModalProps {
    product: any;
    onClose: () => void;
    onProductUpdated: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
    product,
    onClose,
    onProductUpdated
}) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);

    const [formData, setFormData] = useState({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        image_url: product.image_url || ''
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${product.seller_id}-${product.id}-${Date.now()}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('menu-images')
                .getPublicUrl(filePath);

            setFormData({ ...formData, image_url: data.publicUrl });
            showToast({ type: 'success', message: 'Image uploaded successfully!' });
        } catch (error: any) {
            console.error('Image upload error:', error);
            showToast({ type: 'error', message: 'Failed to upload image' });
        } finally {
            setImageUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.category) {
            showToast({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('menu_items')
                .update({
                    name: formData.name.trim(),
                    description: formData.description.trim(),
                    price: parseFloat(formData.price),
                    category: formData.category.trim(),
                    image_url: formData.image_url || '/images/1.jpg'
                })
                .eq('id', product.id);

            if (error) {
                throw error;
            }

            showToast({ type: 'success', message: 'Product updated successfully!' });
            onProductUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error updating product:', error);
            showToast({ type: 'error', message: `Failed to update: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Edit Product</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Product Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Image
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            {formData.image_url ? (
                                <div className="relative">
                                    <img
                                        src={formData.image_url}
                                        alt="Product"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, image_url: '' })}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                    <label className="absolute bottom-2 left-1/2 transform -translate-x-1/2 cursor-pointer bg-black/50 text-white px-3 py-1 rounded-lg text-sm hover:bg-black/70">
                                        Change Image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={imageUploading}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Click to upload image</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={imageUploading}
                                    />
                                </label>
                            )}
                            {imageUploading && (
                                <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                            )}
                        </div>
                    </div>

                    {/* Product Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Product Name"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category *
                        </label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="Category"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price (₦) *
                        </label>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe your product..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? (
                                'Saving...'
                            ) : (
                                <>
                                    <Package className="h-5 w-5 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProductModal;
