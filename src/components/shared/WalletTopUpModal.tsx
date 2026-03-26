// Wallet Top-Up Modal Component
// Allows users to add funds to their wallet using Paystack

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, CreditCard } from 'lucide-react';
import { CustomerWalletService } from '../../services/supabase/customer-wallet.service';
import { supabase } from '../../lib/supabase/client';

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
        try {
            // Check if Paystack is already loaded
            if ((window as any).PaystackPop) {
                setPaystackLoaded(true);
                setLoading(false);
                return;
            }

            // Check if paystack is available through global scope
            if ((window as any).paystackpop) {
                setPaystackLoaded(true);
                setLoading(false);
                return;
            }

            // Load Paystack script
            const script = document.createElement('script');
            script.src = 'https://js.paystack.co/v1/inline.js';
            script.async = true;
            script.onload = () => {
                // Give a small delay for initialization
                setTimeout(() => {
                    if ((window as any).PaystackPop || (window as any).paystackpop) {
                        setPaystackLoaded(true);
                    } else {
                        setError('Payment system not ready. Please try again.');
                    }
                }, 100);
            };
            script.onerror = () => {
                setError('Failed to load payment system. Please try again.');
            };
            document.body.appendChild(script);
        } catch (err) {
            setError('Failed to initialize payment system');
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
        if (amount < 100) {
            setError('Minimum amount is ₦100');
            return;
        }

        setProcessingPayment(true);
        setError(null);

        try {
            const userEmail = await getUserEmail();
            const { data: { session } } = await (supabase as any).auth.getSession();
            const userId = session?.user?.id;

            if (!userId) {
                setError('User not authenticated');
                setProcessingPayment(false);
                return;
            }

            // Get public key from env
            const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxx';

            if (!(window as any).PaystackPop) {
                setError('Payment system not loaded. Please refresh and try again.');
                setProcessingPayment(false);
                return;
            }

            // Generate a unique reference
            const paymentRef = `WALLET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Use the correct Paystack setup method
            const handler = (window as any).PaystackPop.setup({
                key: publicKey,
                email: userEmail,
                amount: amount * 100, // Paystack expects kobo
                reference: paymentRef,
                currency: 'NGN',
                onSuccess: async (response: any) => {
                    // Payment successful - credit the wallet
                    try {
                        const result = await CustomerWalletService.topUp(
                            userId,
                            amount,
                            response.reference,
                            `Wallet top-up via Paystack`
                        );

                        if (result.success) {
                            onSuccess(amount);
                            onClose();
                        } else {
                            setError('Failed to credit wallet. Please contact support.');
                        }
                    } catch (err) {
                        setError('Failed to process payment. Please contact support.');
                    } finally {
                        setProcessingPayment(false);
                    }
                },
                onClose: () => {
                    setProcessingPayment(false);
                }
            });

            // Open the Paystack payment modal
            handler.openIframe();

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
                                disabled={amount < 100 || processingPayment}
                                className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center ${amount >= 100 && !processingPayment
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Processing...
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