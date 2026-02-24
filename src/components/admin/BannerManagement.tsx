// Banner Management Component for Admin Dashboard
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit, Trash2, Image, ExternalLink, Upload, X as XIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

interface Banner {
    id: string;
    title: string;
    subtitle?: string;
    image_url: string;
    image_path?: string;
    link?: string;
    is_active: boolean;
    display_order: number;
    valid_from?: string;
    valid_until?: string;
}

interface BannerManagementProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BannerManagement: React.FC<BannerManagementProps> = ({ isOpen, onClose }) => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        image_url: '',
        image_path: '',
        link: '',
        is_active: true,
        display_order: 0,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchBanners();
        }
    }, [isOpen]);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('banners')
                .select('*');

            if (error) {
                console.error('Error fetching banners:', error);
            } else {
                setBanners(data || []);
            }
        } catch (err) {
            console.error('Error fetching banners:', err);
        }
        setLoading(false);
    };

    const uploadImage = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('banners')
            .upload(fileName, file);

        if (error) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }

        const { data: publicUrlData } = supabase.storage
            .from('banners')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageUrl = formData.image_url;
            let imagePath = formData.image_path;

            // Upload new image if file is selected
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
                imagePath = imageUrl.split('/').pop() || '';
            }

            if (editingBanner) {
                // Update existing banner
                const { error } = await supabase
                    .from('banners')
                    .update({
                        title: formData.title,
                        subtitle: formData.subtitle || null,
                        image_url: imageUrl,
                        image_path: imagePath || null,
                        link: formData.link || null,
                        is_active: formData.is_active,
                        display_order: formData.display_order,
                    })
                    .eq('id', editingBanner.id);

                if (error) {
                    throw new Error(`Error updating banner: ${error.message}`);
                }
            } else {
                // Create new banner
                const { error } = await supabase
                    .from('banners')
                    .insert([{
                        title: formData.title,
                        subtitle: formData.subtitle || null,
                        image_url: imageUrl,
                        image_path: imagePath || null,
                        link: formData.link || null,
                        is_active: formData.is_active,
                        display_order: formData.display_order,
                    }]);

                if (error) {
                    throw new Error(`Error creating banner: ${error.message}`);
                }
            }

            setShowForm(false);
            setEditingBanner(null);
            setFormData({ title: '', subtitle: '', image_url: '', image_path: '', link: '', is_active: true, display_order: 0 });
            setImageFile(null);
            setImagePreview(null);
            fetchBanners();
        } catch (error) {
            console.error('Error saving banner:', error);
            alert(error instanceof Error ? error.message : 'Failed to save banner');
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setFormData({
            title: banner.title,
            subtitle: banner.subtitle || '',
            image_url: banner.image_url,
            image_path: banner.image_path || '',
            link: banner.link || '',
            is_active: banner.is_active,
            display_order: banner.display_order || 0,
        });
        setImagePreview(banner.image_url);
        setImageFile(null);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        try {
            const { error } = await supabase.from('banners').delete().eq('id', id);
            if (error) {
                throw new Error(`Error deleting banner: ${error.message}`);
            }
            fetchBanners();
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete banner');
        }
    };

    const toggleActive = async (banner: Banner) => {
        try {
            const { error } = await supabase
                .from('banners')
                .update({ is_active: !banner.is_active })
                .eq('id', banner.id);

            if (error) {
                throw new Error(`Error updating banner: ${error.message}`);
            }
            fetchBanners();
        } catch (error) {
            console.error('Error toggling banner:', error);
            alert(error instanceof Error ? error.message : 'Failed to update banner');
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }

            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setFormData({ ...formData, image_url: '' });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl rounded-2xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <Image className="h-6 w-6 text-gray-700" />
                            <h2 className="text-xl font-bold text-gray-900">Banner Management</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>

                    {/* Add Button */}
                    <div className="p-6 border-b border-gray-100">
                        <button
                            onClick={() => {
                                setEditingBanner(null);
                                setFormData({ title: '', subtitle: '', image_url: '', image_path: '', link: '', is_active: true, display_order: banners.length + 1 });
                                setImageFile(null);
                                setImagePreview(null);
                                setShowForm(true);
                            }}
                            className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Add New Banner</span>
                        </button>
                    </div>

                    {/* Form */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="p-6 border-b border-gray-200 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                                    <input
                                        type="text"
                                        value={formData.subtitle}
                                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image *</label>
                                    <div className="mt-1">
                                        {imagePreview ? (
                                            <div className="relative inline-block">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="h-32 w-32 object-cover rounded-lg border-2 border-gray-300"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-600 font-medium">Click to upload image</p>
                                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                                                </div>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                />
                                            </label>
                                        )}
                                    </div>
                                    {formData.image_url && !imagePreview && (
                                        <p className="text-sm text-gray-500 mt-2">Current image: {formData.image_url}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                                    <input
                                        type="url"
                                        value={formData.link}
                                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        min="0"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">Active</label>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
                                    disabled={uploading || (!imageFile && !formData.image_url)}
                                >
                                    {uploading ? 'Uploading...' : (editingBanner ? 'Update Banner' : 'Create Banner')}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Banner List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading banners...</div>
                        ) : banners.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No banners found. Add your first banner!</div>
                        ) : (
                            <div className="space-y-4">
                                {banners.map((banner) => (
                                    <div
                                        key={banner.id}
                                        className={`flex items-center p-4 rounded-xl border ${banner.is_active ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'}`}
                                    >
                                        <img
                                            src={banner.image_url}
                                            alt={banner.title}
                                            className="w-24 h-16 object-cover rounded-lg"
                                        />
                                        <div className="flex-1 ml-4">
                                            <h3 className="font-semibold text-gray-900">{banner.title}</h3>
                                            <p className="text-sm text-gray-500">{banner.subtitle}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className={`text-xs px-2 py-1 rounded-full ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                    {banner.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className="text-xs text-gray-400">Order: {banner.display_order}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => toggleActive(banner)}
                                                className={`p-2 rounded-lg ${banner.is_active ? 'text-gray-400 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`}
                                                title={banner.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {banner.is_active ? '👁️' : '✅'}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(banner)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            >
                                                <Edit className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(banner.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BannerManagement;