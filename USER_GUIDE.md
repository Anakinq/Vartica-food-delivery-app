# Vartica Food Delivery App - User Guide

Welcome to **Vartica**, a campus food delivery application that connects students with local vendors and delivery agents. This guide will walk you through all the features and how to use them.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Account Management](#account-management)
3. [Ordering Food](#ordering-food)
4. [Delivery Agent Features](#delivery-agent-features)
5. [Vendor Features](#vendor-features)
6. [Payment & Wallet System](#payment--wallet-system)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Supported Roles
Vartica supports multiple user roles:
- **Customer** - Students who want to order food
- **Delivery Agent** - Campus delivery personnel
- **Vendor** - Food sellers (cafeterias and restaurants)
- **Admin** - Platform administrators

### How to Sign Up

#### Method 1: Email Sign Up
1. Open the Vartica app
2. Tap **"Sign Up"**
3. Enter your:
   - Email address
   - Password (min. 6 characters)
   - Full name
   - Phone number
4. Select your role (Customer, Delivery Agent, or Vendor)
5. Verify your email (check inbox for confirmation link)
6. Complete your profile

#### Method 2: Google Sign Up (OAuth)
1. Tap **"Sign in with Google"**
2. Select your Google account
3. Grant permissions
4. Select your role
5. Complete profile setup

---

## Account Management

### Updating Your Profile

1. Tap the **Profile** icon (bottom navigation)
2. Tap **Edit Profile**
3. Update any of the following:
   - Full name
   - Phone number
   - Profile picture
   - Hostel/Location (for deliveries)
4. Tap **Save**

### Adding Bank Details (For Delivery Agents & Vendors)

To receive payments, you must add your bank account:

1. Go to **Profile**
2. Tap **Payment Methods** or **Bank Details**
3. Select your bank from the list
4. Enter your **Account Number**
5. The system will verify your account automatically
6. Tap **Save**

> ⚠️ **Important:** Bank details are required for withdrawal of earnings.

---

## Ordering Food

### Browsing Menu

1. Open the app - you'll see the **Home** screen
2. Browse **Categories** (e.g., Swallow, Rice, Drinks, Snacks)
3. Tap a category to see available items
4. Tap any item to see details, price, and options

### Adding Items to Cart

1. From the menu item, select **quantity**
2. Tap **Add to Cart**
3. Continue browsing or tap **Cart** to checkout
4. You can also add **special instructions** (e.g., "no pepper")

### Checkout Process

1. Review your **Cart**
2. Apply **Promo Code** (if you have one)
3. Select **Delivery Address** (your hostel)
4. Choose **Delivery Method**:
   - **Pickup** - Collect from vendor yourself
   - **Vendor Delivery** - Vendor delivers
   - **Agent Delivery** - Campus delivery agent delivers
5. Tap **Proceed to Payment**

### Payment

1. Review your **Order Summary**
2. Tap **Pay with Paystack**
3. Complete payment via the secure gateway
4. Wait for payment confirmation
5. Order is created and sent to vendor

> 💡 **Dev Mode:** In development, you can use "Simulate Payment" to test without real payment.

### Tracking Your Order

1. Go to **Orders** tab
2. Tap on your active order
3. See real-time status updates:
   - **Pending** - Order placed, waiting for vendor
   - **Accepted** - Vendor confirmed
   - **Preparing** - Vendor is cooking
   - **Ready** - Food ready for pickup/delivery
   - **Picked Up** - Delivery agent has the food
   - **Delivered** - Order completed

### Rating & Review

After delivery:
1. Go to your **Order History**
2. Find the delivered order
3. Tap **Rate**
4. Give stars (1-5) and leave a comment

---

## Delivery Agent Features

### Getting Started as a Delivery Agent

1. Sign up or upgrade to **Delivery Agent** role
2. Wait for **Admin Approval** (required before going online)
3. Once approved, complete your profile:
   - Add phone number
   - Add vehicle type (bike, car, walking)
   - Add bank details for earnings

### Going Online

1. Open the **Delivery Dashboard**
2. Tap the **Online/Offline toggle**
3. When online, you'll receive **Available Orders** notifications

### Accepting Orders

1. View **Available Orders** list
2. Tap on an order to see details:
   - Pickup location (vendor/cafeteria)
   - Delivery location (customer's hostel)
   - Delivery fee (your earnings)
   - Order items
3. Tap **Accept Order**
4. Order moves to your **Active Orders**

### Delivering Orders

1. Go to **Active Orders**
2. Tap on the order
3. Tap **Start Delivery**
4. Pick up food from vendor
5. Tap **Picked Up**
6. Deliver to customer's location
7. Tap **Delivered** to complete

> 💰 **Earnings:** You earn the delivery fee shown on each order.

### Wallet & Withdrawals

#### Two Wallet System
- **Food Wallet** - Customer's payment held for food cost
- **Earnings Wallet** - Your actual earnings from delivery fees

#### Withdrawing Earnings

1. Tap **Wallet** in the dashboard
2. View your **Earnings Wallet** balance
3. Tap **Withdraw**
4. Enter amount (minimum ₦100)
5. Tap **Submit Request**
6. Admin will review and process payment to your bank

---

## Vendor Features

### Setting Up Your Shop

1. Sign up as a **Vendor**
2. Wait for **Admin Approval**
3. Add your **Shop Details**:
   - Shop name
   - Category
   - Location
   - Opening hours
4. Add **Menu Items** with prices

### Managing Orders

1. View **Incoming Orders** on dashboard
2. Tap to see order details
3. Tap **Accept** or **Reject**
4. Update status as you prepare:
   - **Preparing** - Cooking in progress
   - **Ready** - Food ready for pickup
5. Hand over to customer or delivery agent

### Earnings & Withdrawals

1. View **Wallet** on dashboard
2. See **Total Earnings** and **Pending Earnings**
3. Request **Withdrawal** when balance is sufficient
4. Admin processes payment to your bank

---

## Payment & Wallet System

### How Payments Work

| Step | Description |
|------|-------------|
| 1 | Customer pays via Paystack |
| 2 | Payment held in escrow |
| 3 | Order accepted by vendor |
| 4 | Agent accepts (if applicable) |
| 5 | Wallets credited automatically |
| 6 | Order delivered |
| 7 | Vendors/Agents can withdraw |

### Payment Distribution

For an order:
- **Platform Fee**: ₦200 per order
- **Vendor**: Total - Platform Fee
- **Delivery Agent**: Delivery Fee

### Withdrawal Process

1. Ensure **Bank Details** are saved
2. Request withdrawal (min ₦100)
3. Admin reviews request (manual)
4. Payment sent to bank account
5. Status updates to "Completed"

---

## Troubleshooting

### Common Issues

#### "Order payment failed"
- Check internet connection
- Verify card details
- Try again or use dev mode

#### "Bank verification failed"
- Ensure account number is correct
- Bank name must match your bank
- Try a different bank

#### "Cannot go online"
- Check if you're an approved delivery agent
- Contact admin for approval

#### "Withdrawal failed"
- Minimum withdrawal is ₦100
- Ensure bank details are saved
- Check that balance is sufficient

### Getting Help

1. Tap **Contact Support** from profile
2. Submit your issue
3. Admin will respond

---

## App Features Summary

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Email & Google sign up/in |
| 🍔 **Menu Browsing** | Category-based food browsing |
| 🛒 **Shopping Cart** | Add multiple items |
| 📦 **Order Tracking** | Real-time status updates |
| 💬 **Chat** | In-app messaging with vendor |
| 📞 **Voice Call** | Voice communication |
| ⭐ **Ratings** | Rate vendors and agents |
| 💰 **Wallet** | Track earnings & withdraw |
| 🔔 **Notifications** | Order & promo notifications |

---

## Version Info

- **App Version**: 1.0.0
- **Platform**: Web / PWA
- **Payment Gateway**: Paystack (Nigeria)

---

*Last Updated: March 2026*
