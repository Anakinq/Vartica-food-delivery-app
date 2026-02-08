// src/components/customer/DeliveryAgentUpgradeModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Package, AlertCircle, MapPin, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase/client';

// Define the bank options that match the ones in DeliveryDashboard
const BANK_OPTIONS = [
    { code: '044', name: 'Access Bank' },
    { code: '063', name: 'Access Bank (Diamond)' },
    { code: '035A', name: 'ALAT by WEMA' },
    { code: '401', name: 'ASO Savings and Loans' },
    { code: '023', name: 'Citibank Nigeria' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '562', name: 'Ekondo Microfinance Bank' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '214', name: 'First City Monument Bank' },
    { code: '901', name: 'FSDH Merchant Bank Limited' },
    { code: '00103', name: 'Globus Bank' },
    { code: '100022', name: 'GoMoney' },
    { code: '058', name: 'Guaranty Trust Bank' },
    { code: '030', name: 'Heritage Bank' },
    { code: '301', name: 'Jaiz Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '559', name: 'Kuda Bank' },
    { code: '50211', name: 'Kuda Microfinance Bank' },
    { code: '999992', name: 'OPay' },
    { code: '526', name: 'Parallex Bank' },
    { code: '999991', name: 'PalmPay' },
    { code: '076', name: 'Polaris Bank' },
    { code: '101', name: 'Providus Bank' },
    { code: '125', name: 'Rubies MFB' },
    { code: '51310', name: 'Sparkle Microfinance Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '068', name: 'Standard Chartered Bank' },
    { code: '232', name: 'Sterling Bank' },
    { code: '100', name: 'Suntrust Bank' },
    { code: '302', name: 'TAJ Bank' },
    { code: '102', name: 'Titan Bank' },
    { code: '032', name: 'Union Bank of Nigeria' },
    { code: '033', name: 'United Bank For Africa' },
    { code: '215', name: 'Unity Bank' },
    { code: '566', name: 'VFD Microfinance Bank' },
    { code: '035', name: 'Wema Bank' },
    { code: '057', name: 'Zenith Bank' },
];

interface DeliveryAgentUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormData {
    bankAccountNumber: string;
    bankName: string;
    termsAccepted: boolean;
}

export const DeliveryAgentUpgradeModal: React.FC<DeliveryAgentUpgradeModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const { profile, addDeliveryAgentRole } = useAuth();
    const [formData, setFormData] = useState<FormData>({
        bankAccountNumber: '',
        bankName: '',
        termsAccepted: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const initialFocusRef = useRef<HTMLButtonElement>(null);

    // Focus management for accessibility
    useEffect(() => {
        if (isOpen && initialFocusRef.current) {
            initialFocusRef.current.focus();
        }
    }, [isOpen]);

    // Trap focus within the modal
    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    const focusableElements = modalRef.current?.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );

                    if (focusableElements && focusableElements.length > 0) {
                        const firstElement = focusableElements[0] as HTMLElement;
                        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                        if (e.shiftKey && document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        } else if (!e.shiftKey && document.activeElement === lastElement) {
                            firstElement.focus();
                            e.preventDefault();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleInputChange = (field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        if (!formData.bankAccountNumber.trim()) {
            setError('Bank account number is required');
            return false;
        }
        if (!formData.bankName.trim()) {
            setError('Bank name is required');
            return false;
        }
        if (!formData.termsAccepted) {
            setError('You must accept the terms and conditions');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Call the function to add delivery agent role with default 'Foot' vehicle type
            await addDeliveryAgentRole('Foot');

            // Save bank details after creating delivery agent role
            if (profile?.id && formData.bankAccountNumber && formData.bankName) {
                const selectedBank = BANK_OPTIONS.find(bank =>
                    bank.name.toLowerCase() === formData.bankName.toLowerCase()
                );

                const { error: bankError } = await supabase
                    .from('agent_payout_profiles')
                    .upsert({
                        user_id: profile.id,
                        account_number: formData.bankAccountNumber.trim(),
                        account_name: profile.full_name || 'Unknown',
                        bank_code: selectedBank?.code || '',
                        verified: false
                    });

                if (bankError) {
                    console.error('[DeliveryAgentModal] Bank save error:', bankError);
                }
            }

            onSuccess();
            onClose();

        } catch (err) {
            console.error('[DeliveryAgentModal] === SUBMISSION FAILED ===');
            console.error('[DeliveryAgentModal] Full error:', JSON.stringify(err, null, 2));

            let errorMessage = 'Failed to register as delivery agent';

            if (err instanceof Error) {
                errorMessage = err.message;
                if (err.message.includes('null value')) {
                    errorMessage = 'Required data is missing. Please fill in all fields.';
                } else if (err.message.includes('duplicate key')) {
                    errorMessage = 'You are already registered as a delivery agent.';
                } else if (err.message.includes('foreign key')) {
                    errorMessage = 'Profile data missing. Please log out and log in again.';
                } else if (err.message.includes('Profile not found')) {
                    errorMessage = 'Profile not found. Please log out and log in again.';
                }
            } else if (typeof err === 'object' && err !== null) {
                const supabaseErr = err as { message?: string; details?: string; hint?: string; code?: string };
                errorMessage = supabaseErr.message || supabaseErr.details || supabaseErr.hint || errorMessage;
                if (supabaseErr.code) {
                    errorMessage += ` (Code: ${supabaseErr.code})`;
                }
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            aria-labelledby="delivery-agent-modal-title"
            aria-modal="true"
            role="dialog"
        >
            <div
                ref={modalRef}
                className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col"
                tabIndex={-1}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        onClose();
                    }
                }}
            >
                {/* Header - Fixed */}
                <div className="flex-shrink-0 p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 id="delivery-agent-modal-title" className="text-xl font-bold text-gray-900">Become a Campus Delivery Agent</h2>
                        <button
                            ref={initialFocusRef}
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                            <span className="text-red-700 text-sm">{error}</span>
                        </div>
                    )}

                    <div className="mb-6">
                        <p className="text-gray-600 text-sm">
                            Join our campus delivery network and earn money by delivering food to fellow students on foot.
                            Complete your profile to get started.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Account Number *
                            </label>
                            <input
                                type="text"
                                value={formData.bankAccountNumber}
                                onChange={(e) => handleInputChange('bankAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your 10-digit bank account number"
                                maxLength={10}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Name *
                            </label>
                            <select
                                value={formData.bankName}
                                onChange={(e) => handleInputChange('bankName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Select your bank</option>
                                {BANK_OPTIONS.map((bank) => (
                                    <option key={bank.code} value={bank.name}>
                                        {bank.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-start">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={formData.termsAccepted}
                                    onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
                                    I agree to the <a href="#" className="text-blue-600 hover:underline">Terms and Conditions</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>. I understand that as a campus delivery agent, I will be responsible for safely delivering orders to students on foot and maintaining professional conduct.
                                </label>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <Package className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-blue-900 mb-1">What You'll Need</h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Ability to walk around campus efficiently</li>
                                        <li>• Good communication skills</li>
                                        <li>• Bank account for payments</li>
                                        <li>• Smartphone for tracking orders</li>
                                        <li>• Reliable schedule for deliveries</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Register as Campus Delivery Agent'}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};