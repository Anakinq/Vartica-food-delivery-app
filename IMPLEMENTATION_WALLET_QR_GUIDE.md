# Implementation Guide - Customer Wallet System & Identity Verification

## Files Created

### Database Files (Run in Supabase SQL Editor)

1. **`create_customer_wallet_system.sql`** - Database schema
   - Creates `customer_wallets` table
   - Creates `customer_wallet_transactions` table
   - Adds columns to orders: `refunded_at`, `delivery_pin`, `payment_reference`
   - Creates RLS policies
   - Auto-creates wallet for new users

2. **`create_customer_wallet_rpc_functions.sql`** - Backend functions
   - `top_up_wallet()` - Add funds to wallet
   - `deduct_wallet_balance()` - Deduct for order payment
   - `refund_order_to_wallet()` - Refund on cancellation/return
   - `get_customer_wallet()` - Get balance
   - `get_customer_transactions()` - Get transaction history
   - `generate_delivery_pin()` - Generate 4-digit PIN
   - `verify_delivery_pin()` - Verify PIN

---

### Frontend Files (React Components)

3. **`src/services/supabase/customer-wallet.service.ts`**
   - CustomerWalletService class with all wallet operations

4. **`src/components/shared/WalletDashboard.tsx`**
   - Customer wallet dashboard with balance & transactions

5. **`src/components/shared/QRCodeGenerator.tsx`**
   - Generates QR codes for user identity verification

6. **`src/components/shared/QRScanner.tsx`**
   - Scans and verifies QR codes

7. **`src/components/shared/DeliveryVerification.tsx`**
   - Agent verification interface (QR + PIN)

8. **`src/hooks/useQueries.ts`** (Modified)
   - Added `useCustomerWallet()` and `useCustomerWalletTransactions()` hooks

---

### NPM Packages Installed
- `qrcode.react` - QR code generation
- `html5-qrcode` - QR code scanning

---

## Execution Order

### Step 1: Run Database Schema
Copy contents of `create_customer_wallet_system.sql` and run in Supabase SQL Editor.

### Step 2: Run RPC Functions
Copy contents of `create_customer_wallet_rpc_functions.sql` and run in Supabase SQL Editor.

### Step 3: Frontend is Ready
All TypeScript/React files are created automatically. Just run:
```bash
npm run dev
```

---

## How to Integrate

### 1. Show Wallet Dashboard in Customer Home
```tsx
import WalletDashboard from './components/shared/WalletDashboard';

// Add state
const [showWallet, setShowWallet] = useState(false);

// Add button in navbar
<button onClick={() => setShowWallet(true)}>
    My Wallet
</button>

// Add component
{showWallet && <WalletDashboard 
    isOpen={showWallet} 
    onClose={() => setShowWallet(false)} 
/>}
```

### 2. Use Wallet at Checkout
```tsx
import { CustomerWalletService } from './services/supabase/customer-wallet.service';

// Check balance before checkout
const canUseWallet = await CustomerWalletService.canAffordOrder(user.id, total);

// If yes, deduct from wallet
await CustomerWalletService.deduct(user.id, total, orderId, 'Order payment');
```

### 3. Handle Order Cancellation/Refund
```tsx
import { CustomerWalletService } from './services/supabase/customer-wallet.service';

// When customer cancels before agent accepts
if (order.status === 'pending') {
    await CustomerWalletService.refundOrder(order.id, 'Order cancelled');
}

// When agent marks as returned
if (newStatus === 'returned') {
    await CustomerWalletService.refundOrder(order.id, 'Order returned');
}
```

### 4. Add Verification to Delivery Dashboard
```tsx
import DeliveryVerification from './components/shared/DeliveryVerification';

// Show verification before marking order as delivered
<button onClick={() => setShowVerification(true)}>
    Confirm Delivery
</button>

{showVerification && <DeliveryVerification
    orderId={order.id}
    customerId={order.customer_id}
    customerName={order.customer?.full_name}
    orderNumber={order.order_number}
    deliveryPin={order.delivery_pin}
    onVerified={() => completeDelivery(order.id)}
    onClose={() => setShowVerification(false)}
/>}
```

---

## Features Summary

### Wallet System
- ✅ Top up via Paystack
- ✅ Pay at checkout
- ✅ Auto-refund on cancellation
- ✅ Auto-refund on agent "returned" status
- ✅ Transaction history
- ✅ Double refund prevention (refunded_at column)

### Identity Verification
- ✅ QR code generation (customer shows to agent)
- ✅ QR code scanning (agent scans customer)
- ✅ 4-digit PIN entry (alternative to QR)
- ✅ Verification component for agents

---

## Security Measures
- RLS policies on all tables
- Idempotent transactions (prevent duplicates)
- Double refund prevention (checks refunded_at before refunding)
- Transaction atomicity in RPC functions