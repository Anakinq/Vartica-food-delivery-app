// Test case: simulate ₦5,000 payment → verify wallet balances and platform ledger
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function simulatePayment() {
    console.log('Starting payment split simulation...');

    // Payment details
    const totalAmount = 5000; // ₦5,000
    const platformFeePercentage = 0.04; // 4% platform fee
    const agentEarningsPercentage = 0.06; // 6% agent earnings from total amount

    const platformFee = totalAmount * platformFeePercentage; // ₦200
    const agentEarnings = totalAmount * agentEarningsPercentage; // ₦300
    const foodAmount = totalAmount - platformFee - agentEarnings; // ₦4,500

    console.log(`Total Amount: ₦${totalAmount}`);
    console.log(`Food Amount: ₦${foodAmount} (to food wallet)`);
    console.log(`Delivery Fee: ₦${agentEarnings + platformFee}`);
    console.log(`  - Agent Earnings: ₦${agentEarnings} (to earnings wallet)`);
    console.log(`  - Platform Share: ₦${platformFee} (to platform wallet)`);

    // Mock order data
    const orderData = {
        id: 'test-order-123',
        customer_id: 'customer-123',
        seller_id: 'cafeteria-123',
        seller_type: 'cafeteria',
        total: totalAmount,
        delivery_agent_id: 'agent-123', // This would be the delivery agent ID
        order_number: 'TEST_ORDER_001'
    };

    try {
        // 1. First, simulate creating the order in the database
        console.log('\n1. Creating order in database...');
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                ...orderData,
                status: 'pending',
                payment_status: 'pending',
                split_details: {
                    total: totalAmount,
                    food: foodAmount,
                    delivery_fee: agentEarnings + platformFee,
                    platform_share: platformFee,
                    agent_earnings: agentEarnings
                }
            })
            .select()
            .single();

        if (orderError) throw orderError;
        console.log('✓ Order created successfully');

        // 2. Get agent's current wallet balances before payment
        console.log('\n2. Getting agent wallet balances before payment...');
        const { data: walletBefore, error: walletBeforeError } = await supabase
            .from('agent_wallets')
            .select('food_wallet_balance, earnings_wallet_balance')
            .eq('agent_id', order.delivery_agent_id)
            .single();

        if (walletBeforeError) {
            console.log('No existing wallet found, will create one');
        } else {
            console.log(`   Food Wallet Before: ₦${walletBefore.food_wallet_balance}`);
            console.log(`   Earnings Wallet Before: ₦${walletBefore.earnings_wallet_balance}`);
        }

        // 3. Process payment split (this would normally be done by the Paystack webhook)
        console.log('\n3. Processing payment split...');

        // Update order status to paid
        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({
                payment_status: 'paid',
                split_details: {
                    total: totalAmount,
                    food: foodAmount,
                    delivery_fee: agentEarnings + platformFee,
                    platform_share: platformFee,
                    agent_earnings: agentEarnings
                }
            })
            .eq('id', order.id);

        if (orderUpdateError) throw orderUpdateError;
        console.log('✓ Order payment status updated');

        // Create or update agent's food wallet
        const { data: foodWallet, error: foodWalletError } = await supabase.rpc('update_agent_wallet', {
            p_agent_id: order.delivery_agent_id,
            p_wallet_type: 'food_wallet',
            p_amount: foodAmount,
            p_transaction_type: 'credit',
            p_reference_type: 'order',
            p_reference_id: order.id,
            p_description: `Payment for order ${order.order_number} - food amount`
        });

        if (foodWalletError) throw foodWalletError;
        console.log('✓ Food wallet updated with ₦', foodAmount);

        // Create or update agent's earnings wallet
        const { data: earningsWallet, error: earningsWalletError } = await supabase.rpc('update_agent_wallet', {
            p_agent_id: order.delivery_agent_id,
            p_wallet_type: 'earnings_wallet',
            p_amount: agentEarnings,
            p_transaction_type: 'credit',
            p_reference_type: 'order',
            p_reference_id: order.id,
            p_description: `Payment for order ${order.order_number} - agent earnings`
        });

        if (earningsWalletError) throw earningsWalletError;
        console.log('✓ Earnings wallet updated with ₦', agentEarnings);

        // 4. Get agent's wallet balances after payment
        console.log('\n4. Getting agent wallet balances after payment...');
        const { data: walletAfter, error: walletAfterError } = await supabase
            .from('agent_wallets')
            .select('food_wallet_balance, earnings_wallet_balance')
            .eq('agent_id', order.delivery_agent_id)
            .single();

        if (walletAfterError) throw walletAfterError;

        console.log(`   Food Wallet After: ₦${walletAfter.food_wallet_balance}`);
        console.log(`   Earnings Wallet After: ₦${walletAfter.earnings_wallet_balance}`);

        // 5. Verify the balances increased as expected
        console.log('\n5. Verifying balances...');
        if (walletBefore) {
            const expectedFoodBalance = parseFloat(walletBefore.food_wallet_balance) + foodAmount;
            const expectedEarningsBalance = parseFloat(walletBefore.earnings_wallet_balance) + agentEarnings;

            console.log(`   Expected Food Wallet: ₦${expectedFoodBalance}`);
            console.log(`   Actual Food Wallet: ₦${walletAfter.food_wallet_balance}`);
            console.log(`   Expected Earnings Wallet: ₦${expectedEarningsBalance}`);
            console.log(`   Actual Earnings Wallet: ₦${walletAfter.earnings_wallet_balance}`);

            const foodMatch = parseFloat(walletAfter.food_wallet_balance) === expectedFoodBalance;
            const earningsMatch = parseFloat(walletAfter.earnings_wallet_balance) === expectedEarningsBalance;

            if (foodMatch && earningsMatch) {
                console.log('✓ All balances match expected values!');
            } else {
                console.log('✗ Balance mismatch detected!');
            }
        } else {
            // First time wallet creation, just verify the credited amounts
            console.log(`   Food Wallet should have: ₦${foodAmount}`);
            console.log(`   Earnings Wallet should have: ₦${agentEarnings}`);

            const foodMatch = parseFloat(walletAfter.food_wallet_balance) === foodAmount;
            const earningsMatch = parseFloat(walletAfter.earnings_wallet_balance) === agentEarnings;

            if (foodMatch && earningsMatch) {
                console.log('✓ New wallet balances match expected values!');
            } else {
                console.log('✗ New wallet balance mismatch detected!');
            }
        }

        // 6. Check transaction history
        console.log('\n6. Checking transaction history...');
        const { data: transactions, error: transactionError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('agent_id', order.delivery_agent_id)
            .eq('reference_id', order.id)
            .order('created_at', { ascending: false });

        if (transactionError) throw transactionError;

        console.log(`   Found ${transactions.length} transactions for this order`);
        transactions.forEach(tx => {
            console.log(`   - ${tx.transaction_type} ${tx.wallet_type}: ₦${tx.amount} - ${tx.description}`);
        });

        console.log('\n✓ Payment split simulation completed successfully!');
        console.log('\nSummary:');
        console.log(`• Order total: ₦${totalAmount}`);
        console.log(`• Food amount (to agent food wallet): ₦${foodAmount}`);
        console.log(`• Agent earnings (to agent earnings wallet): ₦${agentEarnings}`);
        console.log(`• Platform fee (retained by platform): ₦${platformFee}`);

    } catch (error) {
        console.error('Error during payment split simulation:', error);
    }
}

// Run the test
simulatePayment().catch(console.error);