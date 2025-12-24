import { supabase } from '../../lib/supabase';

interface WalletBalance {
    food_wallet_balance: string;
    earnings_wallet_balance: string;
}

interface PayoutProfile {
    bank_name: string;
    account_number_encrypted: string;
    account_name: string;
    is_verified: boolean;
}

interface WithdrawalRequest {
    amount: number;
}

interface BankVerificationRequest {
    account_number: string;
    bank_code: string;
}

export class WalletService {
    // Get agent's wallet balances
    static async getWalletBalances(agentId: string): Promise<WalletBalance | null> {
        try {
            const { data, error } = await supabase
                .from('agent_wallets')
                .select('food_wallet_balance, earnings_wallet_balance')
                .eq('agent_id', agentId)
                .single();

            if (error) {
                console.error('Error fetching wallet balances:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in getWalletBalances:', error);
            throw error;
        }
    }

    // Get agent's payout profile
    static async getPayoutProfile(agentId: string): Promise<PayoutProfile | null> {
        try {
            const { data, error } = await supabase
                .from('agent_payout_profiles')
                .select('bank_name, account_number_encrypted, account_name, is_verified')
                .eq('agent_id', agentId)
                .single();

            if (error) {
                console.error('Error fetching payout profile:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in getPayoutProfile:', error);
            throw error;
        }
    }

    // Create or update payout profile
    static async setPayoutProfile(agentId: string, profile: Omit<PayoutProfile, 'is_verified'>): Promise<void> {
        try {
            // Check if profile exists
            const { data: existingProfile } = await supabase
                .from('agent_payout_profiles')
                .select('id')
                .eq('agent_id', agentId)
                .single();

            let result;
            if (existingProfile) {
                // Update existing profile
                result = await supabase
                    .from('agent_payout_profiles')
                    .update({
                        ...profile,
                        is_verified: false // Reset verification status
                    })
                    .eq('agent_id', agentId);
            } else {
                // Create new profile
                result = await supabase
                    .from('agent_payout_profiles')
                    .insert([{
                        agent_id: agentId,
                        ...profile,
                        is_verified: false
                    }]);
            }

            if (result.error) {
                console.error('Error setting payout profile:', result.error);
                throw result.error;
            }
        } catch (error) {
            console.error('Error in setPayoutProfile:', error);
            throw error;
        }
    }

    // Request a withdrawal
    static async requestWithdrawal(agentId: string, withdrawal: WithdrawalRequest): Promise<void> {
        try {
            // First, verify the agent has sufficient balance
            const balances = await this.getWalletBalances(agentId);
            if (!balances) {
                throw new Error('Wallet not found');
            }

            const earningsBalance = parseFloat(balances.earnings_wallet_balance);
            if (withdrawal.amount > earningsBalance) {
                throw new Error('Insufficient balance for withdrawal');
            }

            // Make API call to initiate withdrawal
            const response = await fetch('/api/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agent_id: agentId,
                    amount: withdrawal.amount
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Withdrawal request failed');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Withdrawal request failed');
            }
        } catch (error) {
            console.error('Error in requestWithdrawal:', error);
            throw error;
        }
    }

    // Verify bank account
    static async verifyBankAccount(agentId: string, verification: BankVerificationRequest): Promise<void> {
        try {
            const response = await fetch('/api/verify-bank-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agent_id: agentId,
                    account_number: verification.account_number,
                    bank_code: verification.bank_code
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Bank verification failed');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Bank verification failed');
            }
        } catch (error) {
            console.error('Error in verifyBankAccount:', error);
            throw error;
        }
    }

    // Get withdrawal history
    static async getWithdrawalHistory(agentId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching withdrawal history:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error in getWithdrawalHistory:', error);
            throw error;
        }
    }

    // Get wallet transaction history
    static async getTransactionHistory(agentId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('wallet_transactions')
                .select('*')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching transaction history:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error in getTransactionHistory:', error);
            throw error;
        }
    }
}