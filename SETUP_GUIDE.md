# Vartica - Setup Guide

## Initial Database Setup

To get Vartica running, you need to set up the 7 pre-registered cafeterias and optionally create test accounts.

### 1. Create Cafeteria Accounts

First, you need to manually create user accounts for the 7 cafeterias. You can do this through:
- Supabase Dashboard Authentication section
- Or by using the signup flow temporarily

Here are the 7 cafeterias that need accounts:
1. Cafeteria 1
2. Cafeteria 2
3. Med Cafeteria
4. Seasons Deli
5. Smoothie Shack
6. Staff Cafeteria
7. Captain Cook

### 2. Insert Cafeteria Records

After creating user accounts, run this SQL in Supabase SQL Editor to create the cafeteria records:

```sql
-- Replace the user_id values with the actual IDs from your auth.users table
INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
  ('USER_ID_1', 'Cafeteria 1', 'Main campus dining hall', true),
  ('USER_ID_2', 'Cafeteria 2', 'Student center cafeteria', true),
  ('USER_ID_3', 'Med Cafeteria', 'Medical school dining', true),
  ('USER_ID_4', 'Seasons Deli', 'Fresh sandwiches and salads', true),
  ('USER_ID_5', 'Smoothie Shack', 'Healthy smoothies and juices', true),
  ('USER_ID_6', 'Staff Cafeteria', 'Faculty and staff dining', true),
  ('USER_ID_7', 'Captain Cook', 'International cuisine', true);
```

### 3. Create Admin Account (Optional)

Create an admin user account and insert a profile record:

```sql
-- After creating the auth user, insert profile
INSERT INTO profiles (id, email, full_name, role)
VALUES ('ADMIN_USER_ID', 'admin@vartica.edu', 'System Admin', 'admin');
```

### 4. Create Late-Night Vendor Account (Optional)

```sql
-- After creating the auth user for late night vendor
INSERT INTO vendors (user_id, store_name, description, vendor_type, is_active)
VALUES ('LATENIGHT_USER_ID', 'Late-Night Vendors', 'Open 9PM - 3AM', 'late_night', true);
```

### 5. Create Test Promo Codes (Optional)

```sql
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_value, valid_from, valid_until, is_active)
VALUES
  ('WELCOME10', 'percentage', 10, 0, NOW(), NOW() + INTERVAL '30 days', true),
  ('SAVE5', 'fixed', 5, 20, NOW(), NOW() + INTERVAL '30 days', true);
```

## User Roles and Access

### Customer
- No authentication required for browsing
- Can browse all cafeterias, student vendors, and late-night vendors
- Add items to cart and checkout
- Track orders

### Cafeteria Staff
- Sign in only (no signup)
- Manage menu items
- Toggle item availability
- View orders

### Student Vendors
- Sign up and sign in
- Create their own store
- Manage menu items
- Automatically visible to customers once they add menu items

### Delivery Agents
- Sign up and sign in
- View available orders
- Accept max 2 orders at once (must be from same vendor)
- Update order status through delivery lifecycle

### Admin
- Sign in only (no signup)
- View all users and orders
- Full system oversight

## Testing the Application

1. Start the dev server: `npm run dev`
2. Create a student vendor account and add menu items
3. Create a delivery agent account
4. Browse as a customer and place an order
5. Sign in as delivery agent to accept and fulfill the order
6. Check admin dashboard to see system overview

## PWA Installation

The app is PWA-ready and can be installed on mobile devices:
1. Open the app in a mobile browser
2. Look for "Add to Home Screen" option
3. The app will install as a native-like app

## Next Steps

- Add real images for cafeterias and menu items
- Set up push notifications for order updates
- Implement in-app chat between customers and delivery agents
- Add rating system for delivery agents
- Implement real-time order tracking with maps
