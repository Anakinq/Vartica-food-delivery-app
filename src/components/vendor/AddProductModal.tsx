import React, { useState } from 'react';
import { X, Upload, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface AddProductModalProps {
    vendorId: string;
    onClose: () => void;
    onProductAdded: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
    vendorId,
    onClose,
    onProductAdded
}) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [sellerType, setSellerType] = useState('vendor');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        image_url: ''
    });

    // Fetch vendor's seller_type on mount
    useState(() => {
        const fetchSellerType = async () => {
            const { data: vendor } = await supabase
                .from('vendors')
                .select('seller_type')
                .eq('id', vendorId)
                .single();
            if (vendor?.seller_type) {
                setSellerType(vendor.seller_type);
            }
        };
        fetchSellerType();
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${vendorId}-${Date.now()}.${fileExt}`;
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
                .insert({
                    seller_id: vendorId,
                    seller_type: sellerType,
                    name: formData.name,
                    description: formData.description,
                    price: parseFloat(formData.price),
                    category: formData.category,
                    image_url: formData.image_url || '/images/1.jpg',
                    is_available: true
                });

            if (error) {
                throw error;
            }

            onProductAdded();
        } catch (error: any) {
            console.error('Error adding product:', error);
            showToast({ type: 'error', message: `Failed to add product: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Product Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Makeup, Perfume..."
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
                            placeholder="e.g., Makeup, Perfume, Clothing..."
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

                    {/* Image Upload */}
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
                                        className="w-full h-40 object-cover rounded-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, image_url: '' })}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
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
                                'Adding...'
                            ) : (
                                <>
                                    <Package className="h-5 w-5 mr-2" />
                                    Add Product
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductModal;
