# Vartica Pre-Registered Cafeteria Credentials

Below are the login credentials for all 7 pre-registered cafeteria accounts in the system.

**IMPORTANT**: Change these passwords after first login in a production environment.

## Cafeteria Accounts

### 1. Cafeteria 1
- **Email**: `cafeteria1@vartica.edu`
- **Password**: `Vartica2024!`
- **Description**: Main campus dining hall

### 2. Cafeteria 2
- **Email**: `cafeteria2@vartica.edu`
- **Password**: `Vartica2024!`
- **Description**: Student center cafeteria

### 3. Med Cafeteria
- **Email**: `medcafe@vartica.edu`
- **Password**: `Vartica2024!`
- **Description**: Medical school dining

### 4. Seasons Deli
- **Email**: `seasons@vartica.edu`
- **Password**: `Vartica2024!`
- **Description**: Fresh sandwiches and salads

### 5. Smoothie Shack
- **Email**: `smoothie@vartica.edu`
- **Password**: `Vartica2024!`
- **Description**: Healthy smoothies and juices

### 6. Staff Cafeteria
- **Email**: `staff@vartica.edu`
- **Password**: `Vartica2024!`
- **Description**: Faculty and staff dining

### 7. Captain Cook
- **Email**: `captain@vartica.edu`
- **Password**: `Vartica2024!`
- **Description**: International cuisine

---

## Test Accounts (Additional)

### Admin Account
- **Email**: `admin@vartica.edu`
- **Password**: `Admin2024!`
- **Role**: Admin

### Late-Night Vendor
- **Email**: `latenight@vartica.edu`
- **Password**: `LateNight2024!`
- **Role**: Vendor (Late Night)
- **Hours**: 9:00 PM - 3:00 AM

### Test Delivery Agent
- **Email**: `delivery1@vartica.edu`
- **Password**: `Delivery2024!`
- **Role**: Delivery Agent

### Test Student Vendor
- **Email**: `vendor1@vartica.edu`
- **Password**: `Vendor2024!`
- **Role**: Student Vendor
- **Store**: Test Food Store

---

## Setup Instructions

1. Run the database migration to create all necessary tables
2. Execute the seed script (see below) to create all accounts
3. Cafeteria staff can sign in immediately using the credentials above
4. Students can browse as customers without authentication
5. Student vendors and delivery agents can sign up through the app

---

## Security Notes

- All passwords follow a secure pattern: `[Role]2024!`
- These are TEST credentials only
- In production:
  - Use unique, strong passwords for each account
  - Enable 2FA for admin accounts
  - Rotate passwords regularly
  - Use a proper secrets management system
