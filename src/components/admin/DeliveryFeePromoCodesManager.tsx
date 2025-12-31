// src/components/admin/DeliveryFeePromoCodesManager.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const DeliveryFeePromoCodesManager: React.FC = () => {
    const { profile } = useAuth();
    const [promoCodes, setPromoCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_order_value: '0',
        max_discount: '',
        usage_limit: '',
        valid_until: '',
    });

    useEffect(() => {
        fetchPromoCodes();
    }, []);

    const fetchPromoCodes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('delivery_fee_discount_promo_codes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPromoCodes(data || []);
        } catch (err) {
            setError('Failed to fetch promo codes');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePromoCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            // Validate form data
            if (!formData.code.trim()) {
                setError('Promo code is required');
                return;
            }

            if (!formData.discount_value) {
                setError('Discount value is required');
                return;
            }

            if (formData.discount_type === 'percentage' && (parseFloat(formData.discount_value) < 0 || parseFloat(formData.discount_value) > 100)) {
                setError('Percentage discount must be between 0 and 100');
                return;
            }

            const promoCodeData = {
                code: formData.code.trim().toUpperCase(),
                discount_type: formData.discount_type,
                discount_value: parseFloat(formData.discount_value),
                min_order_value: parseFloat(formData.min_order_value) || 0,
                max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
                valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
                created_by: profile?.id,
            };

            const { error } = await supabase
                .from('delivery_fee_discount_promo_codes')
                .insert([promoCodeData]);

            if (error) throw error;

            setSuccess('Promo code created successfully!');
            setFormData({
                code: '',
                discount_type: 'percentage',
                discount_value: '',
                min_order_value: '0',
                max_discount: '',
                usage_limit: '',
                valid_until: '',
            });

            // Refresh the list
            fetchPromoCodes();
        } catch (err) {
            setError(`Failed to create promo code: ${(err as Error).message}`);
            console.error(err);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('delivery_fee_discount_promo_codes')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setSuccess(`Promo code ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
            fetchPromoCodes();
        } catch (err) {
            setError(`Failed to update promo code: ${(err as Error).message}`);
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this promo code?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('delivery_fee_discount_promo_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccess('Promo code deleted successfully!');
            fetchPromoCodes();
        } catch (err) {
            setError(`Failed to delete promo code: ${(err as Error).message}`);
            console.error(err);
        }
    };

    if (profile?.role !== 'admin') {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
                <p className="text-gray-600">Only administrators can access this page.</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-black mb-6">Delivery Fee Discount Promo Codes</h2>

            {/* Success/Error Messages */}
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}

            {/* Create Promo Code Form */}
            <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-black mb-4">Create New Delivery Fee Discount Promo Code</h3>
                <form onSubmit={handleCreatePromoCode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-black mb-2">Promo Code</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                            placeholder="e.g., FREEDELIVERY"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-black mb-2">Discount Type</label>
                        <select
                            value={formData.discount_type}
                            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                        >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-black mb-2">
                            Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(₦)'}
                        </label>
                        <input
                            type="number"
                            value={formData.discount_value}
                            onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                            placeholder={`e.g., ${formData.discount_type === 'percentage' ? '10' : '100'}`}
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-black mb-2">Min Order Value (₦)</label>
                        <input
                            type="number"
                            value={formData.min_order_value}
                            onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                            placeholder="0"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-black mb-2">Max Discount (₦) (Optional)</label>
                        <input
                            type="number"
                            value={formData.max_discount}
                            onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                            placeholder="e.g., 200"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-black mb-2">Usage Limit (Optional)</label>
                        <input
                            type="number"
                            value={formData.usage_limit}
                            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                            placeholder="e.g., 100"
                            min="1"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-black mb-2">Valid Until (Optional)</label>
                        <input
                            type="datetime-local"
                            value={formData.valid_until}
                            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                        >
                            Create Promo Code
                        </button>
                    </div>
                </form>
            </div>

            {/* Promo Codes List */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-black mb-4">Existing Delivery Fee Discount Promo Codes</h3>

                {loading ? (
                    <div className="text-center py-8">Loading promo codes...</div>
                ) : promoCodes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No promo codes found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-semibold text-black">Code</th>
                                    <th className="text-left py-3 px-4 font-semibold text-black">Discount</th>
                                    <th className="text-left py-3 px-4 font-semibold text-black">Min Order</th>
                                    <th className="text-left py-3 px-4 font-semibold text-black">Usage</th>
                                    <th className="text-left py-3 px-4 font-semibold text-black">Valid Until</th>
                                    <th className="text-left py-3 px-4 font-semibold text-black">Status</th>
                                    <th className="text-left py-3 px-4 font-semibold text-black">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promoCodes.map((code) => (
                                    <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium">{code.code}</td>
                                        <td className="py-3 px-4">
                                            {code.discount_type === 'percentage'
                                                ? `${code.discount_value}%`
                                                : `₦${parseFloat(code.discount_value).toFixed(2)}`}
                                        </td>
                                        <td className="py-3 px-4">₦{parseFloat(code.min_order_value || 0).toFixed(2)}</td>
                                        <td className="py-3 px-4">
                                            {code.used_count || 0} / {code.usage_limit || '∞'}
                                        </td>
                                        <td className="py-3 px-4">
                                            {code.valid_until ? new Date(code.valid_until).toLocaleDateString() : 'No limit'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${code.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {code.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleToggleActive(code.id, code.is_active)}
                                                className={`mr-2 px-3 py-1 rounded-lg text-sm font-medium ${code.is_active
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    }`}
                                            >
                                                {code.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(code.id)}
                                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};