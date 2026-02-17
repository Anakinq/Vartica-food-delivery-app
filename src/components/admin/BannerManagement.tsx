// Banner Management Component for Admin Dashboard
import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Image, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

interface Banner {
    id: string;
    title: string;
    subtitle?: string;
    image_url: string;
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
        link: '',
        is_active: true,
        display_order: 0,
    });

    useEffect(() => {
        if (isOpen) {
            fetchBanners();
        }
    }, [isOpen]);

    const fetchBanners = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching banners:', error);
        } else {
            setBanners(data || []);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingBanner) {
            // Update existing banner
            const { error } = await supabase
                .from('banners')
                .update({
                    title: formData.title,
                    subtitle: formData.subtitle || null,
                    image_url: formData.image_url,
                    link: formData.link || null,
                    is_active: formData.is_active,
                    display_order: formData.display_order,
                })
                .eq('id', editingBanner.id);

            if (error) {
                console.error('Error updating banner:', error);
            }
        } else {
            // Create new banner
            const { error } = await supabase
                .from('banners')
                .insert([{
                    title: formData.title,
                    subtitle: formData.subtitle || null,
                    image_url: formData.image_url,
                    link: formData.link || null,
                    is_active: formData.is_active,
                    display_order: formData.display_order,
                }]);

            if (error) {
                console.error('Error creating banner:', error);
            }
        }

        setShowForm(false);
        setEditingBanner(null);
        setFormData({ title: '', subtitle: '', image_url: '', link: '', is_active: true, display_order: 0 });
        fetchBanners();
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setFormData({
            title: banner.title,
            subtitle: banner.subtitle || '',
            image_url: banner.image_url,
            link: banner.link || '',
            is_active: banner.is_active,
            display_order: banner.display_order || 0,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (error) {
            console.error('Error deleting banner:', error);
        } else {
            fetchBanners();
        }
    };

    const toggleActive = async (banner: Banner) => {
        const { error } = await supabase
            .from('banners')
            .update({ is_active: !banner.is_active })
            .eq('id', banner.id);

        if (!error) {
            fetchBanners();
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
                                setFormData({ title: '', subtitle: '', image_url: '', link: '', is_active: true, display_order: banners.length + 1 });
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                                    <input
                                        type="url"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="https://..."
                                        required
                                    />
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
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                                >
                                    {editingBanner ? 'Update Banner' : 'Create Banner'}
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
