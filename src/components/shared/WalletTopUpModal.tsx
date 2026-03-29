// Wallet Top-Up Modal Component
// Uses Paystack inline checkout - Final version with better error handling

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

interface WalletTopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (amount: number) => void;
    currentBalance: number;
}

const PREDEFINED_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export const WalletTopUpModal: React.FC<WalletTopUpModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    currentBalance
}) => {
    const [amount, setAmount] = useState<number>(0);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paystackReady, setPaystackReady] = useState(false);

    // Store payment data in refs
    const userIdRef = useRef<string>('');
    const amountRef = useRef<number>(0);
    const paymentRef = useRef<string>('');
    const initializedRef = useRef(false);
    const handlerRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            checkPaystackReady();
        }
    }, [isOpen]);

    // Check if Paystack is loaded and ready
    const checkPaystackReady = () => {
        if ((window as any).PaystackPop) {
            console.log('Paystack ready (from global)');
            setPaystackReady(true);
            return;
        }

        if ((window as any).paystackpop) {
            console.log('Paystack ready (lowercase)');
            setPaystackReady(true);
            return;
        }

        loadPaystackScript();
    };

    const loadPaystackScript = () => {
        setLoading(true);

        const existingScript = document.querySelector('script[src*="paystack"]');
        if (existingScript) {
            console.log('Paystack script already exists, waiting...');
            setTimeout(() => {
                if ((window as any).PaystackPop || (window as any).paystackpop) {
                    setPaystackReady(true);
                }
                setLoading(false);
            }, 500);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;

        script.onload = () => {
            console.log('Paystack script loaded');
            setTimeout(() => {
                if ((window as any).PaystackPop || (window as any).paystackpop) {
                    setPaystackReady(true);
                    console.log('Paystack initialized');
                }
            }, 100);
            setLoading(false);
        };

        script.onerror = () => {
            console.error('Failed to load Paystack');
            setError('Failed to load payment system');
            setLoading(false);
        };

        document.body.appendChild(script);
    };

    // Get user info
    const getUserInfo = async (): Promise<{ userId: string; email: string }> => {
        const { data: { session } } = await (supabase as any).auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            throw new Error('User not authenticated');
        }

        const { data: profile } = await (supabase
            .from('profiles') as any)
            .select('email')
            .eq('id', userId)
            .maybeSingle();

        const email = profile?.email || session?.user?.email || 'customer@vartica.com';
        return { userId, email };
    };

    // Handle Paystack success with better error handling
    const handlePaymentSuccess = async (response: any) => {
        console.log('✅ PAYSTACK SUCCESS!', response);

        try {
            setProcessingPayment(true);

            const supabaseClient = createClient(
                import.meta.env.VITE_SUPABASE_URL || 'https://jbqhbuogmxqzotlorahn.supabase.co',
                import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTc2NDgsImV4cCI6MjA3NDk3MzY0OH0.APsgWNwZnGnBZpBZTGqL61O3pPLKu4eDmfpsFvk2XMQ'
            );

            console.log('Calling verify-wallet-payment...');

            // FIX: Use direct fetch instead of supabase.functions.invoke()
            // This sends data in the correct format
            const { data: { session } } = await supabase.auth.getSession();
            const fetchResponse = await fetch(
                'https://jbqhbuogmxqzotlorahn.supabase.co/functions/v1/verify-wallet-payment',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOizdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTc2NDgsImV4cCI6MjA3NDk3MzY0OH0.APsgWNwZnGnBZpBZTGqL61O3pPLKu4eDmfpsFvk2XMQ'
                    },
                    body: JSON.stringify({
                        user_id: userIdRef.current,
                        amount: amountRef.current,
                        payment_reference: response.reference,
                        description: 'Wallet top-up via Paystack'
                    })
                }
            );

            const data = await fetchResponse.json();
            const error = fetchResponse.ok ? null : { message: data.error || 'Payment verification failed' };

            console.log('Edge function response:', data, error);

            if (error) {
                console.error('Edge function error:', error);

                // Try to extract error details from various sources
                let errorMsg = 'Payment verification failed';

                // Check if it's a FunctionsHttpError with context
                if ((error as any).context) {
                    try {
                        const body = await (error as any).context.json().catch(() => null);
                        console.log('Error response body:', body);
                        if (body?.error) {
                            errorMsg = body.error;
                        } else if (body?.message) {
                            errorMsg = body.message;
                        }
                    } catch (e) {
                        console.log('Could not parse error body');
                    }
                }

                // Fallback to other error properties
                if (errorMsg === 'Payment verification failed') {
                    if (error.message) errorMsg = error.message;
                    else if ((error as any).data?.error) errorMsg = (error as any).data.error;
                    else if ((error as any).data?.message) errorMsg = (error as any).data.message;
                }

                setError(errorMsg);
            } else if (data?.success) {
                console.log('✅ Wallet credited! New balance:', data.new_balance);
                onSuccess(amountRef.current);
                onClose();
            } else {
                console.error('Verification failed:', data);
                setError(data?.error || 'Payment verification failed');
            }
        } catch (err: any) {
            console.error('Verification error:', err);
            setError('Payment verification failed: ' + (err.message || err.toString() || 'Unknown error'));
        } finally {
            setProcessingPayment(false);
            initializedRef.current = false;
            handlerRef.current = null;
        }
    };

    // Open Paystack payment modal
    const openPaymentModal = async () => {
        if (initializedRef.current && handlerRef.current) {
            if (handlerRef.current.openIframe) {
                handlerRef.current.openIframe();
                return;
            }
        }

        initializedRef.current = true;
        setProcessingPayment(true);
        setError(null);

        try {
            const { userId, email } = await getUserInfo();
            userIdRef.current = userId;
            amountRef.current = amount;

            const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxx';
            const ref = `WALLET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            paymentRef.current = ref;

            console.log('Opening Paystack modal with ref:', ref);

            let PaystackPop: any = (window as any).PaystackPop || (window as any).paystackpop;

            if (!PaystackPop) {
                throw new Error('Paystack not loaded');
            }

            console.log('PaystackPop type:', typeof PaystackPop);

            // Use setup() method like the working Checkout component
            const handler = PaystackPop.setup({
                key: publicKey,
                email: email,
                amount: amount * 100,
                ref: ref,
                currency: 'NGN',
                callback: (res: any) => {
                    console.log('✅ Paystack callback:', res);
                    handlePaymentSuccess(res);
                },
                onClose: () => {
                    console.log('Paystack modal closed');
                    setProcessingPayment(false);
                    initializedRef.current = false;
                    handlerRef.current = null;
                }
            });

            handlerRef.current = handler;
            console.log('Handler created via setup(), methods:', Object.keys(handler));

            handler.openIframe();
            console.log('✅ Modal opened via openIframe()');

        } catch (err: any) {
            console.error('Error opening payment:', err);
            setError('Failed to open payment: ' + err.message);
            setProcessingPayment(false);
            initializedRef.current = false;
            handlerRef.current = null;
        }
    };

    const handleAmountSelect = (value: number) => {
        setAmount(value);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (value: string) => {
        const numValue = parseInt(value) || 0;
        setCustomAmount(value);
        setAmount(numValue);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Add Funds to Wallet</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Current Balance */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <p className="text-sm text-gray-600">Current Balance</p>
                        <p className="text-xl font-bold text-gray-800">
                            ₦{currentBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-red-600">{error}</p>
                            <button
                                onClick={() => {
                                    setError(null);
                                    initializedRef.current = false;
                                    handlerRef.current = null;
                                    setProcessingPayment(false);
                                }}
                                className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                            <span className="ml-2 text-gray-600">Loading payment system...</span>
                        </div>
                    ) : (
                        <>
                            {/* Predefined Amounts */}
                            <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Select Amount</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {PREDEFINED_AMOUNTS.map((value) => (
                                        <button
                                            key={value}
                                            onClick={() => handleAmountSelect(value)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${amount === value && !customAmount
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            ₦{value.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Amount */}
                            <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Or Enter Custom Amount</p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                                    <input
                                        type="number"
                                        value={customAmount}
                                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                                        placeholder="Enter amount"
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        min="100"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Minimum: ₦100</p>
                            </div>

                            {/* Pay Button */}
                            <div className="mt-4">
                                {processingPayment ? (
                                    <div className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center">
                                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                        Processing Payment...
                                    </div>
                                ) : amount >= 100 && paystackReady ? (
                                    <button
                                        onClick={openPaymentModal}
                                        className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 flex items-center justify-center"
                                    >
                                        <CreditCard className="mr-2 h-5 w-5" />
                                        Pay ₦{amount.toLocaleString()}
                                    </button>
                                ) : amount >= 100 ? (
                                    <button
                                        onClick={() => loadPaystackScript()}
                                        className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 flex items-center justify-center"
                                    >
                                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                        Loading Payment...
                                    </button>
                                ) : (
                                    <div className="w-full bg-gray-300 text-gray-500 py-3 rounded-lg font-semibold text-center">
                                        Minimum ₦100 required
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-center text-gray-500 mt-3">
                                Secure payment powered by Paystack
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
