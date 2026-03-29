// Wallet Header Button Component
// Shows balance in header with tap to open wallet modal
// Includes eye toggle to show/hide balance

import React, { useState, useEffect } from 'react';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import { CustomerWalletService, CustomerWallet } from '../../services/supabase/customer-wallet.service';
import { useAuth } from '../../contexts/AuthContext';

interface WalletHeaderButtonProps {
    onClick?: () => void;
}

export const WalletHeaderButton: React.FC<WalletHeaderButtonProps> = ({ onClick }) => {
    const { user } = useAuth();
    const [wallet, setWallet] = useState<CustomerWallet | null>(null);
    const [showBalance, setShowBalance] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadWallet();
        }
    }, [user]);

    const loadWallet = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const walletData = await CustomerWalletService.getWallet(user.id);
            setWallet(walletData);
        } catch (error) {
            console.error('Error loading wallet:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatBalance = (balance: number) => {
        if (!showBalance) {
            return '••••';
        }
        return `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    };

    return (
        <button
            onClick={onClick}
            className="flex items-center space-x-2 bg-slate-800/50 hover:bg-slate-700/50 
                       border border-slate-600/30 rounded-full px-3 py-1.5 transition-all duration-200"
        >
            <Wallet className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-white">
                {loading ? (
                    <span className="text-slate-400">...</span>
                ) : (
                    formatBalance(wallet?.balance || 0)
                )}
            </span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowBalance(!showBalance);
                }}
                className="p-1 hover:bg-slate-600/50 rounded-full transition-colors"
            >
                {showBalance ? (
                    <EyeOff className="h-3 w-3 text-slate-400" />
                ) : (
                    <Eye className="h-3 w-3 text-green-400" />
                )}
            </button>
        </button>
    );
};

export default WalletHeaderButton;