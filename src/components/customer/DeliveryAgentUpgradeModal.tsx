// src/components/customer/DeliveryAgentUpgradeModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Bike, Car, Package, AlertCircle, MapPin, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DeliveryAgentUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface FormData {
    vehicleType: 'Bike' | 'Car' | 'Motorcycle';
    licensePlate: string;
    insuranceDetails: string;
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
        vehicleType: 'Bike',
        licensePlate: '',
        insuranceDetails: '',
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
        if (!formData.licensePlate.trim()) {
            setError('License plate number is required');
            return false;
        }
        if (!formData.insuranceDetails.trim()) {
            setError('Insurance details are required');
            return false;
        }
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
        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            // Call the function to add delivery agent role
            await addDeliveryAgentRole(formData.vehicleType);

            // Update the profile to reflect the role change and close modal
            onSuccess();
            onClose();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to register as delivery agent');
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
                className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                tabIndex={-1}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        onClose();
                    }
                }}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 id="delivery-agent-modal-title" className="text-2xl font-bold text-gray-900">Become a Delivery Agent</h2>
                        <button
                            ref={initialFocusRef}
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close modal"
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

                    <div className="mb-6">
                        <p className="text-gray-600 text-sm">
                            Join our delivery network and earn money by delivering food to customers.
                            Complete your profile to get started.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Vehicle Type *
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'Bike', label: 'Bike', icon: Bike },
                                    { value: 'Motorcycle', label: 'Motorcycle', icon: Bike }, // Using Bike icon as Motorcycle doesn't exist in lucide-react
                                    { value: 'Car', label: 'Car', icon: Car }
                                ].map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handleInputChange('vehicleType', value as any)}
                                        className={`p-4 border rounded-lg text-center transition-colors ${formData.vehicleType === value
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                    >
                                        <Icon className="h-6 w-6 mx-auto mb-2" />
                                        <div className="font-medium text-sm">{label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                License Plate Number *
                            </label>
                            <input
                                type="text"
                                value={formData.licensePlate}
                                onChange={(e) => handleInputChange('licensePlate', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter license plate number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Insurance Details *
                            </label>
                            <textarea
                                value={formData.insuranceDetails}
                                onChange={(e) => handleInputChange('insuranceDetails', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter insurance company name and policy number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Account Number *
                            </label>
                            <input
                                type="text"
                                value={formData.bankAccountNumber}
                                onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your bank account number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bank Name *
                            </label>
                            <input
                                type="text"
                                value={formData.bankName}
                                onChange={(e) => handleInputChange('bankName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your bank name"
                            />
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
                                    I agree to the <a href="#" className="text-blue-600 hover:underline">Terms and Conditions</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>. I understand that as a delivery agent, I will be responsible for safely delivering orders to customers and maintaining professional conduct.
                                </label>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <Package className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                                <div>
                                    <h4 className="font-medium text-blue-900 mb-1">What You'll Need</h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Valid vehicle registration and insurance</li>
                                        <li>• Reliable transportation</li>
                                        <li>• Valid driver's license (if applicable)</li>
                                        <li>• Bank account for payments</li>
                                        <li>• Smartphone for tracking orders</li>
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
                                {loading ? 'Processing...' : 'Register as Delivery Agent'}
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