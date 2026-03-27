// Delivery Agent Identity Verification Component
// Allows agents to verify customer identity via QR scan or PIN entry

import React, { useState } from 'react';
import { Camera, Key, CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react';
import QRScanner from './QRScanner';
import QRCodeGenerator from './QRCodeGenerator';

interface DeliveryVerificationProps {
    orderId: string;
    customerId: string;
    customerName?: string;
    orderNumber: string;
    deliveryPin?: string;
    onVerified: () => void;
    onClose: () => void;
}

const DeliveryVerification: React.FC<DeliveryVerificationProps> = ({
    orderId,
    customerId,
    customerName = 'Customer',
    orderNumber,
    deliveryPin,
    onVerified,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'qr' | 'pin'>('qr');
    const [showScanner, setShowScanner] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'failed'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleQRScan = async (scannedUserId: string) => {
        if (scannedUserId === customerId) {
            setVerificationStatus('success');
            setTimeout(() => {
                onVerified();
            }, 1500);
        } else {
            setVerificationStatus('failed');
            setErrorMessage('QR code does not match the customer for this order');
        }
    };

    const handlePinSubmit = async () => {
        if (pinInput.length !== 4) {
            setErrorMessage('Please enter a 4-digit PIN');
            return;
        }

        // Call the verify function from the service
        try {
            const { CustomerWalletService } = await import('../../services/supabase/customer-wallet.service');
            const isValid = await CustomerWalletService.verifyDeliveryPin(orderId, pinInput);
            
            if (isValid) {
                setVerificationStatus('success');
                setTimeout(() => {
                    onVerified();
                }, 1500);
            } else {
                setVerificationStatus('failed');
                setErrorMessage('Invalid PIN. Please check and try again.');
            }
        } catch (error) {
            console.error('PIN verification error:', error);
            setErrorMessage('Failed to verify PIN. Please try again.');
        }
    };

    const handleReset = () => {
        setVerificationStatus('idle');
        setErrorMessage('');
        setPinInput('');
    };

    if (verificationStatus === 'success') {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verified!</h2>
                    <p className="text-gray-600">Customer identity confirmed for Order #{orderNumber}</p>
                </div>
            </div>
        );
    }

    if (verificationStatus === 'failed') {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center shadow-2xl">
                    <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                    <p className="text-gray-600 mb-4">{errorMessage}</p>
                    <button
                        onClick={handleReset}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Verify Customer</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
                            <XCircle className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-medium">{customerName}</p>
                            <p className="text-sm text-blue-100">Order #{orderNumber}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('qr')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'qr'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500'
                        }`}
                    >
                        <Camera className="h-4 w-4 inline mr-2" />
                        Scan QR
                    </button>
                    <button
                        onClick={() => setActiveTab('pin')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'pin'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500'
                        }`}
                    >
                        <Key className="h-4 w-4 inline mr-2" />
                        Enter PIN
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'qr' ? (
                        <div className="text-center">
                            {showScanner ? (
                                <QRScanner
                                    expectedUserId={customerId}
                                    onScanSuccess={handleQRScan}
                                    onClose={() => setShowScanner(false)}
                                    label="Scan Customer's QR"
                                />
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-4">
                                            Ask the customer to show their QR code from the app
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                                    >
                                        Open Scanner
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-center">
                            {deliveryPin ? (
                                <>
                                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-600 mb-2">Customer's PIN</p>
                                        <p className="text-4xl font-bold tracking-widest text-gray-900">
                                            {deliveryPin}
                                        </p>
                                    </div>
                                    <p className="text-gray-600 mb-4">
                                        Ask the customer for their 4-digit PIN
                                    </p>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={pinInput}
                                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Enter PIN"
                                            className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                    {errorMessage && (
                                        <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
                                    )}
                                    <button
                                        onClick={handlePinSubmit}
                                        disabled={pinInput.length !== 4}
                                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        Verify PIN
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                                    <p className="text-gray-600">
                                        No PIN available for this order. Please use QR code verification.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('qr')}
                                        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                                    >
                                        Use QR Scan
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {errorMessage && activeTab === 'qr' && (
                        <p className="text-red-500 text-sm text-center mt-4">{errorMessage}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryVerification;