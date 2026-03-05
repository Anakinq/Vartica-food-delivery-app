// Toast Vendor Registration
import React, { useState } from 'react';
import { ArrowLeft, Store, Phone, MapPin, Camera, Check } from 'lucide-react';
import { ToastService } from '../../services/supabase/toast.service';
import { useToast } from '../../contexts/ToastContext';

interface ToastVendorRegisterProps {
    onBack: () => void;
    onSuccess: () => void;
}

// Hostel options
const HOSTEL_OPTIONS = [
    'New Female Hostel 1',
    'New Female Hostel 2',
    'Abuad Hostel',
    'Wema Hostel',
    'Male Hostel 1',
    'Male Hostel 2',
    'Male Hostel 3',
    'Male Hostel 4',
    'Male Hostel 5',
    'Male Hostel 6',
    'Medical Male Hostel 1',
    'Medical Male Hostel 2',
    'Female Medical Hostel 1',
    'Female Medical Hostel 2',
    'Female Medical Hostel 3',
    'Female Medical Hostel 4',
    'Female Medical Hostel 5',
    'Female Medical Hostel 6',
];

export const ToastVendorRegister: React.FC<ToastVendorRegisterProps> = ({ onBack, onSuccess }) => {
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [registering, setRegistering] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        hostel_location: '',
        price: 700,
        extras: {
            butter: 100,
            egg: 200,
            tea: 300
        }
    });

    const handleSubmit = async () => {
        if (!formData.name || !formData.phone || !formData.hostel_location) {
            toast.showToast('Please fill all required fields', 'error');
            return;
        }

        try {
            setRegistering(true);
            await ToastService.registerVendor({
                name: formData.name,
                phone: formData.phone,
                hostel_location: formData.hostel_location,
                price: formData.price,
                extras: formData.extras,
                is_open: true
            });
            toast.showToast('Registration successful! Welcome to Toast Vendors!', 'success');
            onSuccess();
        } catch (error: any) {
            console.error('Registration error:', error);
            toast.showToast(error.message || 'Registration failed', 'error');
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 z-10 p-4 border-b border-gray-800">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-xl font-bold text-white ml-2">Become a Toast Vendor</h1>
                </div>
            </div>

            <div className="p-4 pb-24">
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-8">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-green-500' : 'bg-gray-700'} text-white font-bold`}>
                        1
                    </div>
                    <div className={`w-12 h-1 ${step >= 2 ? 'bg-green-500' : 'bg-gray-700'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-green-500' : 'bg-gray-700'} text-white font-bold`}>
                        2
                    </div>
                    <div className={`w-12 h-1 ${step >= 3 ? 'bg-green-500' : 'bg-gray-700'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-green-500' : 'bg-gray-700'} text-white font-bold`}>
                        3
                    </div>
                </div>

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="bg-gray-800 rounded-xl p-4">
                            <h2 className="text-white font-bold mb-4 flex items-center">
                                <Store className="w-5 h-5 mr-2 text-green-400" />
                                Shop Details
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Shop Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Mama T's Toast"
                                        className="w-full bg-gray-700 text-white rounded-lg p-3 placeholder-gray-500 border-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="08012345678"
                                        className="w-full bg-gray-700 text-white rounded-lg p-3 placeholder-gray-500 border-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => formData.name && formData.phone && setStep(2)}
                            disabled={!formData.name || !formData.phone}
                            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white py-4 rounded-lg font-bold transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {/* Step 2: Location */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="bg-gray-800 rounded-xl p-4">
                            <h2 className="text-white font-bold mb-4 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-green-400" />
                                Select Your Hostel
                            </h2>

                            <p className="text-gray-400 text-sm mb-4">
                                This is where you'll be selling your toast. Students from this hostel will be able to order from you.
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                {HOSTEL_OPTIONS.map(hostel => (
                                    <button
                                        key={hostel}
                                        onClick={() => setFormData({ ...formData, hostel_location: hostel })}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all ${formData.hostel_location === hostel
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        {hostel}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg font-bold transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => formData.hostel_location && setStep(3)}
                                disabled={!formData.hostel_location}
                                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white py-4 rounded-lg font-bold transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Pricing */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="bg-gray-800 rounded-xl p-4">
                            <h2 className="text-white font-bold mb-4 flex items-center">
                                <Store className="w-5 h-5 mr-2 text-green-400" />
                                Set Your Price
                            </h2>

                            <div className="mb-6">
                                <label className="block text-gray-400 text-sm mb-2">Price per Toast Bread</label>
                                <div className="flex items-center justify-center">
                                    <button
                                        onClick={() => setFormData({ ...formData, price: Math.max(300, formData.price - 50) })}
                                        className="w-12 h-12 bg-gray-700 rounded-lg text-white text-xl font-bold hover:bg-gray-600"
                                    >
                                        -
                                    </button>
                                    <span className="text-4xl font-bold text-green-400 mx-6">₦{formData.price}</span>
                                    <button
                                        onClick={() => setFormData({ ...formData, price: Math.min(2000, formData.price + 50) })}
                                        className="w-12 h-12 bg-gray-700 rounded-lg text-white text-xl font-bold hover:bg-gray-600"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-gray-400 text-sm">Optional Extras (customers pay extra):</p>

                                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                    <span className="text-white">🧈 Butter</span>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mr-2">+₦</span>
                                        <input
                                            type="number"
                                            value={formData.extras.butter}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                extras: { ...formData.extras, butter: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-20 bg-gray-600 text-white rounded p-2 text-center"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                    <span className="text-white">🥚 Egg</span>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mr-2">+₦</span>
                                        <input
                                            type="number"
                                            value={formData.extras.egg}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                extras: { ...formData.extras, egg: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-20 bg-gray-600 text-white rounded p-2 text-center"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                    <span className="text-white">🍵 Tea</span>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 mr-2">+₦</span>
                                        <input
                                            type="number"
                                            value={formData.extras.tea}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                extras: { ...formData.extras, tea: parseInt(e.target.value) || 0 }
                                            })}
                                            className="w-20 bg-gray-600 text-white rounded p-2 text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-lg font-bold transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={registering}
                                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white py-4 rounded-lg font-bold transition-colors"
                            >
                                {registering ? 'Registering...' : 'Complete Registration'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToastVendorRegister;
