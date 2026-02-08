# Supabase RLS (Row Level Security) Policies

## Overview
This document outlines the recommended RLS policies for the Vartica Food Delivery app tables.

## Tables and Required RLS Policies

### 1. `profiles` table
```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Anyone can read profiles (for vendor/customer lookup)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);
```

### 2. `vendors` table
```sql
-- Vendors can view their own vendor record
CREATE POLICY "Vendors can view own record"
ON vendors FOR SELECT
USING (auth.uid() = user_id);

-- Vendors can update their own record
CREATE POLICY "Vendors can update own record"
ON vendors FOR UPDATE
USING (auth.uid() = user_id);

-- Authenticated users can view all vendors (for customer browsing)
CREATE POLICY "Authenticated users can view vendors"
ON vendors FOR SELECT
USING (auth.role() = 'authenticated');
```

### 3. `cafeterias` table
```sql
-- Cafeterias can view their own record
CREATE POLICY "Cafeterias can view own record"
ON cafeterias FOR SELECT
USING (auth.uid() = user_id);

-- Cafeterias can update their own record
CREATE POLICY "Cafeterias can update own record"
ON cafeterias FOR UPDATE
USING (auth.uid() = user_id);

-- Authenticated users can view all cafeterias
CREATE POLICY "Authenticated users can view cafeterias"
ON cafeterias FOR SELECT
USING (auth.role() = 'authenticated');
```

### 4. `menu_items` table
```sql
-- Vendors can CRUD their own menu items
CREATE POLICY "Vendors can insert own menu items"
ON menu_items FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = seller_id
));

CREATE POLICY "Vendors can update own menu items"
ON menu_items FOR UPDATE
USING (auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = seller_id
));

CREATE POLICY "Vendors can delete own menu items"
ON menu_items FOR DELETE
USING (auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = seller_id
));

-- Everyone can view available menu items
CREATE POLICY "Anyone can view menu items"
ON menu_items FOR SELECT
USING (is_available = true OR auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = seller_id
));
```

### 5. `orders` table
```sql
-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (auth.uid() = customer_id);

-- Vendors can view orders for their items
CREATE POLICY "Vendors can view own orders"
ON orders FOR SELECT
USING (auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = seller_id
));

-- Delivery agents can view assigned orders
CREATE POLICY "Delivery agents can view assigned orders"
ON orders FOR SELECT
USING (auth.uid() = delivery_agent_id);

-- Vendors can create orders (system-generated)
CREATE POLICY "Vendors can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = seller_id
));

-- Vendors can update their orders
CREATE POLICY "Vendors can update own orders"
ON orders FOR UPDATE
USING (auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = seller_id
));
```

### 6. `wallet_transactions` table
```sql
-- Users can view their own wallet transactions
CREATE POLICY "Users can view own wallet transactions"
ON wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Only service_role can insert/update (system operations)
CREATE POLICY "Service role can manage wallet transactions"
ON wallet_transactions FOR ALL
USING (false)
WITH CHECK (false);
```

### 7. `vendor_categories` table
```sql
-- Vendors can manage their own categories
CREATE POLICY "Vendors can CRUD own categories"
ON vendor_categories FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM vendors WHERE id = vendor_id
));
```

## Enable RLS on All Tables

Run this SQL to enable RLS on all tables:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafeterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

## Verification Commands

Check if RLS is enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

Check existing policies:
```sql
SELECT * FROM pg_policies WHERE policyschema = 'public';
```

## Security Notes

1. **Service Role Key** - Never expose in frontend, use only for admin operations
2. **Anon Key** - Safe for public use, limited by RLS policies
3. **Test in Supabase Dashboard** - Use "Row Level Security" debugger to verify policies
