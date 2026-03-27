// Wallet Top-Up Modal Component
// Allows users to add funds to their wallet using Paystack

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, CreditCard } from 'lucide-react';
import { CustomerWalletService } from '../../services/supabase/customer-wallet.service';
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
    const [paystackLoaded, setPaystackLoaded] = useState(false);
    const paymentRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen && !paystackLoaded) {
            loadPaystack();
        }
    }, [isOpen]);

    const loadPaystack = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading Paystack payment system...');

            // Check if Paystack is already loaded
            if ((window as any).PaystackPop) {
                console.log('Paystack already loaded from cache');
                setPaystackLoaded(true);
                setLoading(false);
                return;
            }

            // Check if paystack is available through global scope
            if ((window as any).paystackpop) {
                console.log('Paystack already loaded (lowercase)');
                setPaystackLoaded(true);
                setLoading(false);
                return;
            }

            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src*="paystack"]');
            if (existingScript) {
                console.log('Paystack script already in DOM, waiting for load...');
                // Wait for existing script to finish loading
                await new Promise((resolve) => setTimeout(resolve, 500));
                if ((window as any).PaystackPop || (window as any).paystackpop) {
                    setPaystackLoaded(true);
                    setLoading(false);
                    return;
                }
            }

            // Load Paystack script
            console.log('Loading Paystack from CDN...');
            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v1/inline.js';
            script.async = true;

            script.onload = () => {
                console.log('Paystack script loaded successfully');
                // Give a small delay for initialization
                setTimeout(() => {
                    if ((window as any).PaystackPop || (window as any).paystackpop) {
                        console.log('Paystack initialized successfully');
                        setPaystackLoaded(true);
                    } else {
                        console.error('Paystack loaded but not initialized');
                        setError('Payment system not ready. Please refresh and try again.');
                    }
                }, 200);
            };

            script.onerror = (e) => {
                console.error('Failed to load Paystack script:', e);
                setError('Failed to load payment system. Please check your internet connection and try again.');
            };

            document.body.appendChild(script);
        } catch (err) {
            console.error('Error in loadPaystack:', err);
            setError('Failed to initialize payment system. Please refresh and try again.');
        } finally {
            setLoading(false);
        }
    };

    const getUserEmail = async (): Promise<string> => {
        try {
            const { data: { session } } = await (supabase as any).auth.getSession();
            const user = session?.user;
            if (user?.email) return user.email;

            // Try to get from profile
            if (user?.id) {
                const { data: profile } = await (supabase as any)
                    .from('profiles')
                    .select('email')
                    .eq('id', user.id)
                    .maybeSingle();

                return profile?.email || user.email || 'customer@vartica.com';
            }
        } catch (e) {
            console.error('Error getting user email:', e);
        }
        return 'customer@vartica.com';
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

    const initiatePayment = async () => {
        console.log('=== INITIATE PAYMENT STARTED ===');
        console.log('Amount:', amount);
        console.log('Paystack loaded:', paystackLoaded);
        console.log('Processing:', processingPayment);

        if (amount < 100) {
            console.log('ERROR: Minimum amount not met');
            setError('Minimum amount is ₦100');
            return;
        }

        if (!paystackLoaded) {
            console.log('ERROR: Paystack not loaded yet');
            setError('Payment system still loading. Please wait a moment.');
            return;
        }

        console.log('Setting processing to true...');
        setProcessingPayment(true);
        setError(null);

        try {
            console.log('Getting user email...');
            const userEmail = await getUserEmail();
            console.log('User email:', userEmail);

            console.log('Getting user session...');
            const { data: { session } } = await (supabase as any).auth.getSession();
            const userId = session?.user?.id;
            console.log('User ID:', userId);

            if (!userId) {
                console.log('ERROR: User not authenticated');
                setError('User not authenticated');
                setProcessingPayment(false);
                return;
            }

            // Get public key from env
            const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxx';
            console.log('Public key exists:', !!publicKey);

            if (!(window as any).PaystackPop) {
                console.log('ERROR: PaystackPop not available');
                setError('Payment system not loaded. Please refresh and try again.');
                setProcessingPayment(false);
                return;
            }

            console.log('Paystack available, generating payment reference...');
            // Generate a unique reference
            const paymentRef = `WALLET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log('Payment reference:', paymentRef);

            // Use the correct Paystack setup method
            console.log('Opening Paystack modal...');
            const handler = (window as any).PaystackPop.setup({
                key: publicKey,
                email: userEmail,
                amount: amount * 100, // Paystack expects kobo
                reference: paymentRef,
                currency: 'NGN',
                onSuccess: async (response: any) => {
                    // Payment successful - verify with backend before crediting wallet
                    setProcessingPayment(true);
                    console.log('Paystack success, reference:', response.reference);

                    const reference = response.reference || paymentRef;

                    try {
                        // Create Supabase client for Edge Function call
                        const supabaseClient = createClient(
                            import.meta.env.VITE_SUPABASE_URL || '',
                            import.meta.env.VITE_SUPABASE_ANON_KEY || ''
                        );

                        // Try the Edge Function first
                        try {
                            const { data: verifyResult, error: verifyError } = await supabaseClient.functions.invoke(
                                'verify-wallet-payment',
                                {
                                    body: {
                                        user_id: userId,
                                        amount: amount,
                                        payment_reference: reference,
                                        description: 'Wallet top-up via Paystack'
                                    }
                                }
                            );

                            console.log('Verification result:', verifyResult);
                            console.log('Verification error:', verifyError);

                            if (verifyError) {
                                // Edge function failed - try direct RPC as fallback
                                console.log('Edge function failed, trying direct RPC:', verifyError.message);
                            } else if (verifyResult && verifyResult.success) {
                                // Success via Edge Function
                                console.log('Verified via Edge Function! New Balance:', verifyResult.new_balance);
                                onSuccess(amount);
                                onClose();
                                setProcessingPayment(false);
                                return;
                            } else if (verifyResult && verifyResult.already_processed) {
                                // Already processed - return success
                                console.log('Transaction already processed');
                                onSuccess(amount);
                                onClose();
                                setProcessingPayment(false);
                                return;
                            }
                        } catch (edgeFnError: any) {
                            // Edge function not available or errored - use direct RPC
                            console.log('Edge function not available, using direct RPC:', edgeFnError.message);
                        }

                        // Fallback: Direct RPC call (less secure but functional)
                        console.log('Using direct RPC fallback for wallet top-up');
                        const result = await CustomerWalletService.topUp(
                            userId,
                            amount,
                            reference,
                            'Wallet top-up via Paystack (fallback)'
                        );

                        console.log('Top-up result:', result);
                        console.log('Success:', result.success, 'New Balance:', result.new_balance, 'Transaction ID:', result.transaction_id);

                        if (result.success) {
                            onSuccess(amount);
                            onClose();
                        } else {
                            setError('Payment recorded but wallet not updated. Please contact support with reference: ' + reference);
                        }
                    } catch (err: any) {
                        console.error('Payment processing error:', err);
                        setError('Payment verification failed: ' + (err.message || 'Please contact support with reference: ' + reference));
                    } finally {
                        setProcessingPayment(false);
                    }
                },
                onClose: () => {
                    setProcessingPayment(false);
                }
            });

            // Open the Paystack payment modal
            console.log('Opening Paystack modal...');
            try {
                handler.openIframe();
                console.log('Paystack modal opened - waiting for payment completion');
            } catch (openError: any) {
                console.error('ERROR opening Paystack modal:', openError);
                setError('Failed to open payment window. Please check your internet connection and try again.');
                setProcessingPayment(false);
            }

        } catch (err: any) {
            setError(err.message || 'Payment failed. Please try again.');
            setProcessingPayment(false);
        }
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
                                    setPaystackLoaded(false);
                                    loadPaystack();
                                }}
                                className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                                Retry loading payment system
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
                            <button
                                onClick={initiatePayment}
                                disabled={amount < 100 || processingPayment || !paystackLoaded}
                                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center ${amount >= 100 && !processingPayment && paystackLoaded
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : !paystackLoaded ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Loading payment system...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="h-5 w-5 mr-2" />
                                        Pay ₦{amount.toLocaleString('en-NG')}
                                    </>
                                )}
                            </button>

                            {/* Security Note */}
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
