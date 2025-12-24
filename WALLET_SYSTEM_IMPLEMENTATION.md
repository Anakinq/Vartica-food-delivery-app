# Paystack-Powered Split Payment & Wallet Management System

## Overview
This implementation provides a complete Paystack-powered split payment and wallet management system for a delivery-only platform. The system handles payment splitting, agent wallet management, and automated payouts.

## Payment Flow & Split Logic

When a customer pays a total amount (e.g., ₦5,000), it's automatically split:
- **Food Amount**: ₦4,500 → held in the agent's food wallet (used to purchase food)
- **Delivery Fee**: ₦500 → further split as:
  - ₦300 → credited to the agent's earnings wallet (agent's take-home)
  - ₦200 → credited to the platform's wallet (revenue)

## Agent Wallet Structure

Each delivery agent has two separate wallet balances stored in the `agent_wallets` table:

1. **food_wallet_balance** (NUMERIC): 
   - Holds funds for food purchases
   - Non-withdrawable; only for order fulfillment
   - Used by agent to purchase food on behalf of customers

2. **earnings_wallet_balance** (NUMERIC):
   - Holds agent's delivery commission
   - Fully withdrawable to agent's bank account

## Database Schema

### Tables Created
1. `agent_wallets` - Stores agent wallet balances
2. `agent_payout_profiles` - Stores agent bank account details
3. `withdrawals` - Tracks withdrawal requests and status
4. `wallet_transactions` - Audit trail for all wallet transactions

### Key Features
- Row Level Security (RLS) on all wallet-related tables
- Automatic wallet creation when delivery agent is registered
- Comprehensive audit trail for all transactions
- Encrypted storage of sensitive bank details

## API Endpoints

### Payment Processing
- **`/api/paystack-webhook`** - Handles Paystack webhooks for payment verification and splits
  - Processes `charge.success` events to split payments
  - Handles `transfer.success` and `transfer.failed` events
  - Automatically updates wallet balances

### Withdrawal Management
- **`/api/withdraw`** - Handles agent withdrawal requests
  - Validates agent has sufficient earnings balance
  - Initiates Paystack transfers to agent's bank account
  - Updates withdrawal status in real-time

### Bank Verification
- **`/api/verify-bank-account`** - Verifies and saves agent bank details
  - Uses Paystack's Resolve Account Number API
  - Stores encrypted bank details
  - Updates verification status

## Supabase Functions

### `update_agent_wallet` Function
- PostgreSQL function to safely update agent wallets
- Handles both credit and debit operations
- Automatically logs transactions to audit trail
- Supports multiple transaction types

### `create_agent_wallet` Trigger
- Automatically creates wallet when delivery agent is registered
- Initializes both food and earnings wallets with zero balances

## Security & Compliance

### Data Protection
- Bank account numbers encrypted in database
- Row Level Security (RLS) on all wallet tables
- Secure webhook signature verification
- Proper input validation and sanitization

### Audit Trail
- All money movements tracked in `wallet_transactions` table
- Timestamp, transaction IDs, and status tracking
- Reference links to original orders/withdrawals

## Frontend Integration

### Delivery Dashboard (`DeliveryDashboard.tsx`)
- Shows separate balances for food and earnings wallets
- Allows agents to request withdrawals from earnings wallet only
- Bank account verification and management interface
- Real-time wallet balance updates

### Wallet Service (`wallet.service.ts`)
- Comprehensive service for wallet operations
- Methods for getting balances, requesting withdrawals, and verifying banks
- Proper error handling and validation

## Implementation Details

### Payment Split Calculation
```typescript
const PLATFORM_FEE_PERCENTAGE = 0.04; // 4% platform fee
const AGENT_EARNINGS_PERCENTAGE = 0.06; // 6% agent earnings from total amount

const platformFee = totalAmount * PLATFORM_FEE_PERCENTAGE;
const agentEarnings = totalAmount * AGENT_EARNINGS_PERCENTAGE;
const foodAmount = totalAmount - platformFee - agentEarnings;
```

### Automated Payouts
- Agents can withdraw only from `earnings_wallet_balance`
- Automated Paystack transfers using Paystack Transfers API
- Transfer status tracked via Paystack webhooks
- Idempotency and error handling for failed transfers

## Testing

### Test Case: ₦5,000 Payment Simulation
A test case (`test_payment_split.ts`) simulates:
- ₦5,000 payment processing
- Automatic splitting (₦4,500 to food wallet, ₦300 to earnings wallet, ₦200 to platform)
- Wallet balance verification
- Transaction history tracking

## Deployment

### Required Environment Variables
- `PAYSTACK_SECRET_KEY` - Paystack secret key for API access
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Database Migration
- Run the SQL migration in `supabase/migrations/20251223100000_create_wallet_system.sql`
- The migration creates all necessary tables, functions, and policies

## Error Handling

### Key Error Scenarios Covered
- Insufficient balance for withdrawals
- Invalid bank account details
- Paystack API failures
- Webhook signature verification failures
- Transfer failures and retries

## Key Features

1. **Real-time Wallet Updates**: Wallet balances update immediately upon payment confirmation
2. **Automated Payouts**: One-click withdrawal requests processed automatically via Paystack
3. **Bank Verification**: Paystack-verified bank account details with encryption
4. **Comprehensive Audit**: Complete transaction history with reference tracking
5. **Security First**: RLS, encrypted storage, and secure API endpoints
6. **Scalable Architecture**: PostgreSQL functions and triggers for consistent operations

This implementation provides a complete, production-ready wallet system with all the requested functionality.