// QR Code Scanner Component
// Scans and verifies QR codes for identity confirmation

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Camera, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface QRScannerProps {
    expectedUserId?: string;
    onScanSuccess: (scannedUserId: string) => void;
    onClose: () => void;
    label?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
    expectedUserId,
    onScanSuccess,
    onClose,
    label = 'Scan QR Code'
}) => {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        // Start scanner when component mounts
        startScanner();

        return () => {
            // Cleanup on unmount
            const scannerElement = document.getElementById('qr-scanner');
            if (scannerElement) {
                scannerElement.innerHTML = '';
            }
        };
    }, []);

    const startScanner = async () => {
        setScanning(true);
        setCameraError(null);

        try {
            const scanner = new Html5QrcodeScanner(
                'qr-scanner',
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                /* verbose= */ false
            );

            scanner.render(
                (decodedText) => {
                    // QR code scanned successfully
                    handleScanResult(decodedText);
                    scanner.clear();
                },
                (error) => {
                    // Scan error - usually just "No multiFormatReaders" which is normal
                    // console.log('Scan error:', error);
                }
            );
        } catch (err: any) {
            console.error('Camera error:', err);
            setCameraError('Unable to access camera. Please check permissions.');
            setScanning(false);
        }
    };

    const handleScanResult = (decodedText: string) => {
        setScanning(false);

        // Parse the QR code value
        // Expected format: VARTICA_VERIFY_USER_{userId}
        if (decodedText.startsWith('VARTICA_VERIFY_USER_')) {
            const scannedUserId = decodedText.replace('VARTICA_VERIFY_USER_', '');
            
            if (expectedUserId && scannedUserId !== expectedUserId) {
                setResult({
                    success: false,
                    message: 'Invalid user. This QR code does not match the expected person.'
                });
            } else {
                setResult({
                    success: true,
                    message: 'Identity verified successfully!'
                });
                onScanSuccess(scannedUserId);
            }
        } else {
            // Try to use as direct user ID (backward compatibility)
            if (expectedUserId && decodedText === expectedUserId) {
                setResult({
                    success: true,
                    message: 'Identity verified successfully!'
                });
                onScanSuccess(decodedText);
            } else {
                setResult({
                    success: false,
                    message: 'Invalid QR code. Please scan a valid Vartica user QR code.'
                });
            }
        }
    };

    const handleRetry = () => {
        setResult(null);
        setScanning(true);
        startScanner();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold">{label}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {result ? (
                        <div className="text-center py-6">
                            <div className={`mb-4 ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                                {result.success ? (
                                    <CheckCircle className="h-16 w-16 mx-auto" />
                                ) : (
                                    <AlertCircle className="h-16 w-16 mx-auto" />
                                )}
                            </div>
                            <p className={`text-lg font-semibold mb-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                {result.message}
                            </p>
                            <button
                                onClick={result.success ? onClose : handleRetry}
                                className={`px-6 py-2 rounded-lg font-medium ${
                                    result.success
                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {result.success ? 'Continue' : 'Try Again'}
                            </button>
                        </div>
                    ) : cameraError ? (
                        <div className="text-center py-6">
                            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <p className="text-red-600 font-medium mb-4">{cameraError}</p>
                            <button
                                onClick={startScanner}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div id="qr-scanner" className="w-full"></div>
                            <p className="text-center text-sm text-gray-500 mt-4">
                                {scanning ? 'Point your camera at the QR code' : 'Initializing camera...'}
                            </p>
                            {scanning && (
                                <div className="flex justify-center mt-2">
                                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRScanner;