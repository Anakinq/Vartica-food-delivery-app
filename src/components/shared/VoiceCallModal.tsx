import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface VoiceCallModalProps {
    orderId: string;
    orderNumber: string;
    recipientName: string;
    onClose: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
    orderId,
    orderNumber,
    recipientName,
    onClose
}) => {
    const { user } = useAuth();
    const [isCalling, setIsCalling] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');

    const audioRef = useRef<HTMLAudioElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Simulate call duration timer
    useEffect(() => {
        if (callStatus === 'connected') {
            intervalRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [callStatus]);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startCall = async () => {
        setCallStatus('ringing');
        setIsCalling(true);

        // Simulate call connection (in real app, this would use WebRTC)
        setTimeout(() => {
            setCallStatus('connected');
            setIsConnected(true);
        }, 3000);
    };

    const endCall = () => {
        setCallStatus('ended');
        setIsConnected(false);
        setIsCalling(false);
        setCallDuration(0);

        // Close modal after a short delay
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Voice Call</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="text-center py-8">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Phone className="h-12 w-12 text-blue-600" />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900">{recipientName}</h3>
                        <p className="text-gray-500 mb-2">Order #{orderNumber}</p>

                        {callStatus === 'ringing' && (
                            <p className="text-gray-600">Calling...</p>
                        )}
                        {callStatus === 'connected' && (
                            <p className="text-gray-600">{formatTime(callDuration)}</p>
                        )}
                        {callStatus === 'ended' && (
                            <p className="text-gray-600">Call ended</p>
                        )}
                    </div>

                    <div className="flex justify-center space-x-6 py-4">
                        {callStatus !== 'ended' && (
                            <>
                                <button
                                    onClick={toggleMute}
                                    className={`p-4 rounded-full ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'} hover:opacity-90`}
                                >
                                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                                </button>

                                <button
                                    onClick={endCall}
                                    className="p-4 bg-red-500 rounded-full text-white hover:bg-red-600"
                                >
                                    <PhoneOff className="h-6 w-6" />
                                </button>

                                <button className="p-4 bg-gray-100 rounded-full text-gray-600 hover:opacity-90">
                                    <Volume2 className="h-6 w-6" />
                                </button>
                            </>
                        )}
                    </div>

                    {callStatus === 'idle' && (
                        <div className="mt-6">
                            <button
                                onClick={startCall}
                                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center"
                            >
                                <Phone className="h-5 w-5 mr-2" />
                                Start Voice Call
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden audio element for receiving audio streams */}
            <audio ref={audioRef} className="hidden" autoPlay />
        </div>
    );
};