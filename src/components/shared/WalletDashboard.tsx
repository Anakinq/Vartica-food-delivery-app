// Customer Wallet Dashboard Component
// Shows balance and transaction history

import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, X, Loader2 } from 'lucide-react';
import { CustomerWalletService, WalletTransaction, CustomerWallet } from '../../services/supabase/customer-wallet.service';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { WalletTopUpModal } from './WalletTopUpModal';

interface WalletDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

const WalletDashboard: React.FC<WalletDashboardProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [wallet, setWallet] = useState<CustomerWallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'balance' | 'history'>('balance');
    const [showTopUpModal, setShowTopUpModal] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            loadData();
        }
    }, [isOpen, user]);

    const loadData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const [walletData, transactionsData] = await Promise.all([
                CustomerWalletService.getWallet(user.id),
                CustomerWalletService.getTransactions(user.id, 20, 0)
            ]);
            setWallet(walletData);
            setTransactions(transactionsData);
        } catch (error) {
            console.error('Error loading wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTopUpSuccess = async (amount: number) => {
        // Reload wallet data to get the updated balance from database
        await loadData();
        
        showToast(`Successfully added ₦${amount.toLocaleString()} to your wallet!`, 'success');
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'credit':
                return <ArrowUpRight className="h-4 w-4 text-green-500" />;
            case 'debit':
                return <ArrowDownLeft className="h-4 w-4 text-red-500" />;
            case 'refund':
                return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
            default:
                return <Wallet className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'credit':
                return 'text-green-600';
            case 'debit':
                return 'text-red-600';
            case 'refund':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">My Wallet</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="text-center">
                        <p className="text-orange-100 text-sm mb-1">Available Balance</p>
                        <p className="text-4xl font-bold">
                            {loading ? (
                                <span className="text-2xl">Loading...</span>
                            ) : (
                                `₦${(wallet?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
                            )}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'balance'
                            ? 'text-green-600 border-b-2 border-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Wallet className="h-4 w-4 inline mr-2" />
                        Balance
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'history'
                            ? 'text-orange-600 border-b-2 border-orange-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <History className="h-4 w-4 inline mr-2" />
                        History
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    ) : activeTab === 'balance' ? (
                        <div className="space-y-4">
                            {/* Quick Actions */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowTopUpModal(true)}
                                        className="py-2 px-4 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                                    >
                                        Top Up
                                    </button>
                                    <button className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                                        Payment Options
                                    </button>
                                </div>
                            </div>

                            {/* Wallet Info */}
                            <div className="text-center text-xs text-gray-500 mt-4">
                                <p>Wallet ID: {wallet?.id?.substring(0, 8) || 'N/A'}...</p>
                                <p>Created: {wallet?.created_at ? new Date(wallet.created_at).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.length === 0 ? (
                                <div className="text-center py-8">
                                    <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No transactions yet</p>
                                    <p className="text-gray-400 text-sm">Your transaction history will appear here</p>
                                </div>
                            ) : (
                                transactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-full">
                                                {getTransactionIcon(transaction.transaction_type)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 capitalize">
                                                    {transaction.transaction_type}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {transaction.description || transaction.transaction_type}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {formatDate(transaction.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`text-sm font-bold ${getTransactionColor(transaction.transaction_type)}`}>
                                            {transaction.transaction_type === 'debit' ? '-' : '+'}
                                            ₦{transaction.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            <WalletTopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                onSuccess={handleTopUpSuccess}
                currentBalance={wallet?.balance || 0}
            />
        </div>
    );
};

export default WalletDashboard;