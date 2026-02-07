# Test Delivery Agent Creation Guide

This guide provides multiple methods to create test delivery agent accounts for the Vartica food delivery app.

## Available Methods

### 1. SQL Script Method (Recommended for Supabase Dashboard)
**File:** `create_test_delivery_agent.sql`

**Steps:**
1. Go to Supabase Dashboard → Authentication → Users → New User
2. Create user with:
   - Email: `test.delivery.agent@vartica.edu`
   - Password: `TestPassword123!`
   - User Metadata:
     ```json
     {
       "full_name": "Test Delivery Agent",
       "role": "delivery_agent",
       "phone": "+2348012345678",
       "vehicle_type": "bike"
     }
     ```
3. Copy the generated User ID from the dashboard
4. Open `create_test_delivery_agent.sql` and replace `USER_ID_PLACEHOLDER` with the actual User ID
5. Run the script in Supabase SQL Editor

### 2. Simple SQL Method (Auto-trigger approach)
**File:** `create_test_delivery_agent_simple.sql`

**Steps:**
1. Create the user via Supabase Auth API or Dashboard with the same details as above
2. The auth trigger should automatically create both profile and delivery agent records
3. Run the verification query to confirm creation

### 3. Node.js Script Method (Programmatic)
**File:** `create_test_delivery_agent.js`

**Prerequisites:**
```bash
npm install @supabase/supabase-js dotenv
```

**Steps:**
1. Update your `.env` file with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
2. Run the script:
   ```bash
   node create_test_delivery_agent.js
   ```

## Test Account Details

**Default Test Account:**
- Email: `test.delivery.agent@vartica.edu`
- Password: `TestPassword123!`
- Name: `Test Delivery Agent`
- Phone: `+2348012345678`
- Vehicle: `bike`
- Role: `delivery_agent`

## Multiple Test Agents

The Node.js script also includes a function to create multiple test agents with different vehicle types:
- Delivery Agent One: bike
- Delivery Agent Two: motorcycle  
- Delivery Agent Three: car

To use this feature, uncomment the last line in the script:
```javascript
// createMultipleTestAgents();
```

## Verification Queries

After creation, you can verify the accounts with:

```sql
-- Check all delivery agents
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.phone,
    da.vehicle_type,
    da.is_available,
    da.rating
FROM profiles p
JOIN delivery_agents da ON da.user_id = p.id
WHERE p.role = 'delivery_agent';

-- Check specific test agent
SELECT 
    p.email,
    p.full_name,
    p.role,
    p.phone,
    da.vehicle_type,
    da.is_available,
    da.active_orders_count,
    da.total_deliveries,
    da.rating
FROM profiles p
JOIN delivery_agents da ON da.user_id = p.id
WHERE p.email = 'test.delivery.agent@vartica.edu';
```

## Troubleshooting

**If the delivery agent record isn't created automatically:**
1. Check that the auth trigger is working properly
2. Run the manual insertion query from the simple SQL script
3. Verify the user metadata includes `role: "delivery_agent"`

**If you get permission errors:**
1. Ensure you're using the service role key for the Node.js script
2. For SQL scripts, run them in the Supabase SQL Editor with admin privileges

## Testing the Accounts

Once created, you can test the delivery agent accounts by:
1. Logging into the app with the test credentials
2. The delivery agent should be directed to the delivery dashboard
3. Test order assignment and delivery workflows