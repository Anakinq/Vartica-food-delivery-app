// QR Code Generator Component
// Generates QR codes for user identity verification

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
    userId: string;
    size?: number;
    includeLabel?: boolean;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
    userId,
    size = 128,
    includeLabel = false
}) => {
    // Generate QR value - encode user ID for verification
    const qrValue = `VARTICA_VERIFY_USER_${userId}`;

    return (
        <div className="flex flex-col items-center">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                <QRCodeSVG
                    value={qrValue}
                    size={size}
                    level="M"
                    includeMargin={false}
                    imageSettings={{
                        src: '',
                        height: 0,
                        width: 0,
                        excavate: false
                    }}
                />
            </div>
            {includeLabel && (
                <p className="text-xs text-gray-500 mt-2">Scan to verify identity</p>
            )}
        </div>
    );
};

export default QRCodeGenerator;