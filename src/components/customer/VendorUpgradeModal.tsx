// src/components/customer/VendorUpgradeModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Store, Clock, Truck, FileText, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase/client';

interface VendorUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormData {
    storeName: string;
    description: string;
    vendorType: 'student' | 'late_night';
    matricNumber?: string;
    department?: string;
    availableFrom?: string;
    availableUntil?: string;
    deliveryMode: 'self_delivery' | 'pickup_only' | 'both';
    deliveryFeeSelf?: number;
    allowAgentDelivery: boolean;
}

export const VendorUpgradeModal: React.FC<VendorUpgradeModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep(1);
            setFormData({
                storeName: '',
                description: '',
                vendorType: 'student',
                deliveryMode: 'both',
                allowAgentDelivery: true
            });
            setError('');
            setApplicationSubmitted(false);
        }
    }, [isOpen]);
    const { profile, refreshProfile } = useAuth();
    const { success: showSuccess, error: showError } = useToast();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        storeName: '',
        description: '',
        vendorType: 'student',
        deliveryMode: 'both',
        allowAgentDelivery: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [applicationSubmitted, setApplicationSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateStep1 = () => {
        if (!formData.storeName.trim()) {
            setError('Store name is required');
            return false;
        }
        if (!formData.description.trim()) {
            setError('Description is required');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (formData.vendorType === 'student') {
            if (!formData.matricNumber?.trim()) {
                setError('Matriculation number is required for student vendors');
                return false;
            }
            if (!formData.department?.trim()) {
                setError('Department is required for student vendors');
                return false;
            }
        }
        if (formData.vendorType === 'late_night') {
            if (!formData.availableFrom || !formData.availableUntil) {
                setError('Operating hours are required for late night vendors');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;

        setLoading(true);
        setError('');

        try {
            // Call the RPC function to handle vendor upgrade
            const { data, error } = await supabase.rpc('upgrade_customer_to_vendor', {
                p_user_id: profile?.id,
                p_store_name: formData.storeName,
                p_description: formData.description,
                p_vendor_type: formData.vendorType,
                p_matric_number: formData.matricNumber || null,
                p_department: formData.department || null,
                p_available_from: formData.availableFrom || null,
                p_available_until: formData.availableUntil || null,
                p_delivery_mode: formData.deliveryMode,
                p_delivery_fee_self: formData.deliveryFeeSelf || 0,
                p_allow_agent_delivery: formData.allowAgentDelivery
            });

            if (error) throw new Error(error.message);

            if (data && !data.success) {
                throw new Error(data.error);
            }

            // Set application submitted state
            setApplicationSubmitted(true);

            // Update the profile to reflect the role change and close modal
            setTimeout(async () => {
                try {
                    await refreshProfile();
                    onSuccess();
                    onClose();
                } catch (error) {
                    console.error('Error refreshing profile:', error);
                    // Fallback to showing a message to user
                    showSuccess('Application submitted! Please refresh the page to see profile changes.');
                    onSuccess();
                    onClose();
                }
            }, 3000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit vendor application');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
            setError('');
        }
    };

    const prevStep = () => {
        setStep(1);
        setError('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col">
                {/* Header - Fixed */}
                <div className="flex-shrink-0 p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">Become a Vendor</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Become a Vendor</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                            <span className="text-red-700 text-sm">{error}</span>
                        </div>
                    )}

                    {applicationSubmitted && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                            <div className="flex justify-center mb-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="font-semibold text-green-800 mb-1">Application Submitted!</h3>
                            <p className="text-green-700 text-sm">Your vendor application has been submitted successfully. Our team will review it shortly.</p>
                            <p className="text-green-600 text-xs mt-2">You can continue using your account normally while we process your application.</p>
                        </div>
                    )}

                    {!applicationSubmitted && (
                        <div className="mb-6">
                            <div className="flex items-center justify-center space-x-4 mb-6">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    1
                                </div>
                                <div className={`h-1 w-16 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}></div>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    2
                                </div>
                            </div>
                            <p className="text-center text-sm text-gray-600">
                                {step === 1 ? 'Basic Information' : 'Business Details'}
                            </p>
                        </div>
                    )}

                    {!applicationSubmitted && step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Store Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.storeName}
                                    onChange={(e) => handleInputChange('storeName', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter your store name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Describe your business"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vendor Type *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('vendorType', 'student')}
                                        className={`p-4 border rounded-lg text-center transition-colors ${formData.vendorType === 'student'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        <User className="h-6 w-6 mx-auto mb-2" />
                                        <div className="font-medium">Student Vendor</div>
                                        <div className="text-xs text-gray-500 mt-1">Campus-based selling</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('vendorType', 'late_night')}
                                        className={`p-4 border rounded-lg text-center transition-colors ${formData.vendorType === 'late_night'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        <Clock className="h-6 w-6 mx-auto mb-2" />
                                        <div className="font-medium">Late Night Vendor</div>
                                        <div className="text-xs text-gray-500 mt-1">Evening operations</div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Delivery Mode *
                                </label>
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('deliveryMode', 'self_delivery')}
                                        className={`w-full p-4 border rounded-lg text-left transition-colors ${formData.deliveryMode === 'self_delivery'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <Truck className="h-5 w-5 mr-3" />
                                            <div>
                                                <div className="font-medium">Self Delivery</div>
                                                <div className="text-sm text-gray-500">You deliver directly to hostels</div>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('deliveryMode', 'pickup_only')}
                                        className={`w-full p-4 border rounded-lg text-left transition-colors ${formData.deliveryMode === 'pickup_only'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <Store className="h-5 w-5 mr-3" />
                                            <div>
                                                <div className="font-medium">Pickup Only</div>
                                                <div className="text-sm text-gray-500">Customers pick up from your location</div>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('deliveryMode', 'both')}
                                        className={`w-full p-4 border rounded-lg text-left transition-colors ${formData.deliveryMode === 'both'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <Truck className="h-5 w-5 mr-3" />
                                            <div>
                                                <div className="font-medium">Both</div>
                                                <div className="text-sm text-gray-500">Customer chooses at checkout</div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!applicationSubmitted && step === 2 && (
                        <div className="space-y-4">
                            {formData.vendorType === 'student' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Matriculation Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.matricNumber || ''}
                                            onChange={(e) => handleInputChange('matricNumber', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter your matric number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Department *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.department || ''}
                                            onChange={(e) => handleInputChange('department', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter your department"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.vendorType === 'late_night' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Available From *
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.availableFrom || ''}
                                            onChange={(e) => handleInputChange('availableFrom', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Available Until *
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.availableUntil || ''}
                                            onChange={(e) => handleInputChange('availableUntil', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <FileText className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-blue-900 mb-1">Important Information</h4>
                                        <ul className="text-sm text-blue-700 space-y-1">
                                            <li>• Your vendor application will be reviewed by admins</li>
                                            <li>• You'll receive notifications about your application status</li>
                                            <li>• Commission fees apply to all transactions</li>
                                            <li>• You can start selling once approved</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!applicationSubmitted && (
                        <div className="flex space-x-3 pt-6">
                            {step === 2 && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Previous
                                </button>
                            )}

                            {step === 1 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Processing...' : 'Submit Application'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};