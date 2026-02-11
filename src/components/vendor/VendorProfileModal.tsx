import React, { useState, useEffect } from 'react';
import { X, Upload, Store, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface VendorProfileModalProps {
    vendorId: string;
    onClose: () => void;
    onProfileUpdated: () => void;
}

export const VendorProfileModal: React.FC<VendorProfileModalProps> = ({
    vendorId,
    onClose,
    onProfileUpdated
}) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);

    const [formData, setFormData] = useState({
        store_name: '',
        store_description: '',
        logo_url: ''
    });

    // Fetch current vendor profile on mount
    useEffect(() => {
        const fetchVendorProfile = async () => {
            const { data: vendor } = await supabase
                .from('vendors')
                .select('store_name, store_description, logo_url')
                .eq('id', vendorId)
                .single();

            if (vendor) {
                setFormData({
                    store_name: vendor.store_name || '',
                    store_description: vendor.store_description || '',
                    logo_url: vendor.logo_url || ''
                });
            }
        };
        fetchVendorProfile();
    }, [vendorId]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${vendorId}-logo-${Date.now()}.${fileExt}`;
            const filePath = `vendor-logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('vendor-logos')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('vendor-logos')
                .getPublicUrl(filePath);

            setFormData({ ...formData, logo_url: data.publicUrl });
            showToast({ type: 'success', message: 'Logo uploaded successfully!' });
        } catch (error: any) {
            console.error('Logo upload error:', error);
            showToast({ type: 'error', message: 'Failed to upload logo' });
        } finally {
            setImageUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.store_name.trim()) {
            showToast({ type: 'error', message: 'Please enter a store name' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('vendors')
                .update({
                    store_name: formData.store_name.trim(),
                    store_description: formData.store_description.trim(),
                    logo_url: formData.logo_url || null
                })
                .eq('id', vendorId);

            if (error) {
                throw error;
            }

            showToast({ type: 'success', message: 'Store profile updated successfully!' });
            onProfileUpdated();
            onClose();
        } catch (error: any) {
            console.error('Error updating vendor profile:', error);
            showToast({ type: 'error', message: `Failed to update: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Edit Store Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Logo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Store Logo
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            {formData.logo_url ? (
                                <div className="relative inline-block">
                                    <img
                                        src={formData.logo_url}
                                        alt="Store Logo"
                                        className="w-24 h-24 object-cover rounded-full mx-auto"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">Click to upload logo</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
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

                    {/* Store Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Store Name *
                        </label>
                        <div className="relative">
                            <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={formData.store_name}
                                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                                placeholder="Your Store Name"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Store Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Store Description
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <textarea
                                value={formData.store_description}
                                onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                                placeholder="Tell customers about your store..."
                                rows={3}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
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
                            className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VendorProfileModal;
