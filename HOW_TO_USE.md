# Vartica Food Delivery App - How to Use

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Roles](#user-roles)
4. [Customer Features](#customer-features)
5. [Cafeteria/Vendor Features](#cafeteriacommon-vendor-features)
6. [Delivery Agent Features](#delivery-agent-features)
7. [Admin Features](#admin-features)
8. [Wallet System](#wallet-system)
9. [Chat System](#chat-system)
10. [Troubleshooting](#troubleshooting)

## Overview

Vartica is a comprehensive food delivery platform designed for university campuses. The platform connects customers with cafeterias, student vendors, and late-night food options, with delivery agents facilitating the delivery process. The system includes advanced features like real-time chat, wallet management with split payments, and a complete order tracking system.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Supabase account
- Paystack account (for payment processing)

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Configure Supabase database with provided migrations
5. Start the development server: `npm run dev`

### Default Accounts
The system comes with pre-configured accounts for testing:

**Cafeterias:**
- Cafeteria 1: cafeteria1@vartica.edu / Vartica2024!
- Cafeteria 2: cafeteria2@vartica.edu / Vartica2024!
- Med Cafeteria: medcafe@vartica.edu / Vartica2024!
- Seasons Deli: seasons@vartica.edu / Vartica2024!
- Smoothie Shack: smoothie@vartica.edu / Vartica2024!
- Staff Cafeteria: staff@vartica.edu / Vartica2024!
- Captain Cook: captain@vartica.edu / Vartica2024!

**Other Accounts:**
- Admin: admin@vartica.edu / Admin2024!
- Late-Night Vendor: latenight@vartica.edu / LateNight2024!
- Test Delivery Agent: delivery1@vartica.edu / Delivery2024!
- Test Vendor: vendor1@vartica.edu / Vendor2024!

## User Roles

### Customer
- Browses available food options
- Places orders
- Tracks deliveries
- Communicates with delivery agents
- Makes payments

### Cafeteria Staff
- Manages menu items
- Updates item availability
- Views and manages orders
- Sets delivery schedules

### Student Vendor
- Creates and manages their own store
- Adds menu items
- Sets prices and availability
- Manages business information

### Delivery Agent
- Accepts delivery orders
- Manages multiple orders simultaneously
- Updates delivery status
- Manages wallet and withdrawals
- Communicates with customers

### Admin
- Monitors the entire system
- Manages users and orders
- Views analytics
- Manages promotional codes

## Customer Features

### Browsing Food Options
1. Navigate to the landing page
2. Select your role as "Customer"
3. Browse cafeterias, student vendors, and late-night options
4. View menus and item details
5. Search for specific items or vendors

### Placing Orders
1. Select a vendor from the list
2. Browse their menu items
3. Add items to your cart
4. Proceed to checkout
5. Enter delivery address and contact information
6. Apply promo codes if available
7. Complete payment (supports online payment via Paystack)

### Order Tracking
1. Access the "My Orders" section
2. View real-time order status
3. See estimated delivery time
4. Communicate with delivery agent via integrated chat

### Payment Process
- Online payment through Paystack
- Cash on delivery option
- Split payment system (food cost + delivery fee)
- Promotional discounts applied automatically

## Cafeteria/Common Vendor Features

### Managing Your Dashboard
1. Sign in with your cafeteria credentials
2. Access the cafeteria dashboard
3. Manage menu items and categories
4. Update store information and images

### Adding Menu Items
1. Navigate to "Menu Management"
2. Click "Add New Item"
3. Enter item details:
   - Name and description
   - Price
   - Category
   - Availability status
   - Image (optional)
4. Save the item to make it available to customers

### Order Management
1. View incoming orders in real-time
2. Update order preparation status
3. Mark orders as ready for pickup
4. View order history and customer feedback

## Delivery Agent Features

### Dashboard Access
1. Sign up or sign in as a delivery agent
2. Access the delivery dashboard
3. View available orders
4. Monitor wallet balances

### Order Acceptance
1. Browse available orders
2. Accept orders (maximum 2 at a time)
3. Orders must be from the same vendor
4. Update order status as you progress

### Delivery Lifecycle
1. **Pending**: Order accepted, waiting for preparation
2. **Ready**: Vendor confirms order is ready
3. **Picked Up**: Agent collects the order
4. **In Transit**: On the way to customer
5. **Delivered**: Order successfully delivered

### Wallet System
1. **Food Wallet**: Funds for purchasing food on behalf of customers
2. **Earnings Wallet**: Delivery commission earnings
3. Request withdrawals from earnings wallet
4. View transaction history

### Bank Account Setup
1. Navigate to wallet section
2. Verify your bank account using Paystack
3. Enter account details securely
4. Ready for automatic withdrawals

## Admin Features

### System Monitoring
1. Access admin dashboard with admin credentials
2. View all users across all roles
3. Monitor active orders
4. Track system performance metrics

### User Management
1. View user registration trends
2. Monitor user activity
3. Manage account statuses
4. Handle support tickets

### Order Oversight
1. View all orders across the platform
2. Monitor order completion rates
3. Identify delivery bottlenecks
4. Handle order disputes

### Promotional Code Management
1. Create new promotional codes
2. Set discount types (percentage or fixed amount)
3. Configure validity periods
4. Monitor code usage analytics

## Wallet System

### Payment Splitting
When a customer pays, the amount is automatically split:
- **Food Amount**: Goes to the agent's food wallet (for purchasing food)
- **Delivery Fee**: Further split between agent earnings and platform revenue

### Wallet Types
1. **Food Wallet**: 
   - Used exclusively for food purchases
   - Non-withdrawable
   - Refills automatically with each order

2. **Earnings Wallet**:
   - Contains delivery commissions
   - Fully withdrawable to bank account
   - Tracks earning history

### Withdrawal Process
1. Ensure sufficient balance in earnings wallet
2. Initiate withdrawal request
3. Funds transferred to verified bank account via Paystack
4. Status updates reflected in real-time

## Chat System

### Real-time Communication
1. Available between customers and delivery agents
2. Accessible during active orders
3. Message history preserved
4. Read receipts for important communications

### Access Points
- **Customers**: Via order tracking screen
- **Delivery Agents**: Via active order details
- **Audit Trail**: Available to admins for dispute resolution

### Features
- Instant messaging
- Message persistence
- Timestamps on all messages
- Secure communication channel

## Troubleshooting

### Common Issues

#### Images Not Loading
- Check that the Content Security Policy allows image sources
- Verify that Supabase storage URLs are correctly configured
- Ensure fallback images are available

#### Payment Issues
- Verify Paystack configuration in environment variables
- Check webhook endpoints are properly configured
- Confirm SSL certificate for production environments

#### Login Problems
- Ensure accounts are properly created in Supabase Auth
- Check that profile records exist in the database
- Verify role assignments are correct

#### Mobile Responsiveness
- The app is PWA-ready and can be installed on mobile devices
- Works on all modern browsers
- Touch-friendly interface for mobile users

### Support
- Check the implementation documentation for detailed setup instructions
- Review the setup guide for database configuration
- Contact system administrators for account-related issues