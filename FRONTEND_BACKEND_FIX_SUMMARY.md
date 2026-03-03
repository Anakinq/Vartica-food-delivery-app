# Frontend/Backend Fixes Summary

## Overview
This document summarizes all fixes applied to resolve conflicts between the frontend and backend in the Vartica Food Delivery App.

## Backend Fixes Applied

### 1. agent_wallets Table (comprehensive_frontend_backend_fixes.sql)
Added missing columns:
- `customer_funds` - DECIMAL(10,2) - funds from food wallet
- `delivery_earnings` - DECIMAL(10,2) - earnings from deliveries  
- `food_wallet_balance` - DECIMAL(10,2)
- `earnings_wallet_balance` - DECIMAL(10,2)
- `pending_withdrawal` - DECIMAL(10,2)
- `total_withdrawals` - DECIMAL(10,2)
- `updated_at` - TIMESTAMPTZ

### 2. vendor_wallets Table
Added missing columns:
- `pending_earnings` - DECIMAL(10,2)
- `total_earnings` - DECIMAL(10,2)
- `withdrawn_earnings` - DECIMAL(10,2)
- `pending_withdrawal` - DECIMAL(10,2)
- `updated_at` - TIMESTAMPTZ

### 3. Withdrawals Table (Unified)
- Created `withdrawals` table as the main table (replaces `agent_withdrawals`)
- Added `withdrawal_type` column with enum: 'earnings', 'food', 'customer_funds', 'delivery_earnings'
- Added status: 'pending', 'pending_approval', 'processing', 'completed', 'failed', 'rejected'
- Added all admin tracking fields (approved_by, rejected_by, rejection_reason, etc.)

### 4. admin_withdrawals_view
Created unified view for admin dashboard with:
- All withdrawal fields
- Agent profile info (name, email, phone)
- Payout profile info (account_name, account_number, bank_code, bank_name)

### 5. Helper Functions
Created SQL functions:
- `get_agent_id_from_user(user_id)` - Get agent UUID from user UUID
- `get_vendor_id_from_user(user_id)` - Get vendor UUID from user UUID
- `get_user_id_from_agent(agent_id)` - Get user UUID from agent UUID
- `get_user_id_from_vendor(vendor_id)` - Get user UUID from vendor UUID
- `get_agent_wallet_by_user(user_id)` - Get agent wallet details
- `get_vendor_wallet_by_user(user_id)` - Get vendor wallet details

### 6. RLS Policies
Consolidated and fixed RLS policies:
- Withdrawals: Agents can view/insert, Admins can view all, Service role can manage all
- agent_wallets: Agents can view/update own, Service role can manage all
- vendor_wallets: Vendors can view/update own, Service role can manage all

## Frontend Fixes Applied

### 1. AdminDashboard.tsx
Changed all table references from `agent_withdrawals` to `withdrawals`:
- Line 56: SELECT query for checking withdrawal
- Line 76: UPDATE for approving withdrawal  
- Line 107: SELECT for marking as sent
- Line 128: UPDATE for marking as sent
- Line 165: SELECT for rejecting withdrawal
- Line 185: UPDATE for rejecting withdrawal

### 2. Types (src/types/index.ts)
Updated `WithdrawalRecord` interface:
- Added `withdrawal_type` field
- Added 'rejected' to status enum
- Added admin view fields (agent_name, agent_email, payout_account_name, etc.)

### 3. Already Correct (No Changes Needed)
- `DeliveryDashboard.tsx` - Already uses correct table 'withdrawals'
- `wallet.service.ts` - Already uses correct table 'withdrawals'

## Usage

### Run SQL Fix
Execute `comprehensive_frontend_backend_fixes.sql` in Supabase SQL Editor to apply all database changes.

### Build Frontend
The frontend should now compile without TypeScript errors related to withdrawal table references.

## Verification Queries

```sql
-- Check agent_wallets columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'agent_wallets';

-- Check vendor_wallets columns  
SELECT column_name FROM information_schema.columns WHERE table_name = 'vendor_wallets';

-- Check withdrawals table exists
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals');

-- Check admin_withdrawals_view exists
SELECT EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'admin_withdrawals_view');
```

## Related Files
- `comprehensive_frontend_backend_fixes.sql` - Main SQL fix file
- `src/components/admin/AdminDashboard.tsx` - Admin dashboard with fixed table references
- `src/types/index.ts` - Updated TypeScript types
