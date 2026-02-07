-- Campus Delivery System Fixes
-- This script addresses all the issues with delivery agent signup and campus delivery requirements

-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_agents ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to view their own records
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own vendor data" ON vendors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own vendor data" ON vendors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own delivery agent data" ON delivery_agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery agent data" ON delivery_agents
  FOR UPDATE USING (auth.uid() = user_id);

-- Add campus-specific fields to delivery_agents table
ALTER TABLE delivery_agents 
ADD COLUMN IF NOT EXISTS campus_area TEXT,
ADD COLUMN IF NOT EXISTS delivery_radius INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS is_foot_delivery BOOLEAN DEFAULT TRUE;

-- Ensure the handle_new_user function exists with proper OAuth role handling for campus delivery
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  full_name TEXT;
  phone TEXT;
  store_name TEXT;
  vendor_type TEXT;
  vehicle_type TEXT := 'Foot'; -- Default to Foot for campus delivery
BEGIN
  -- Determine the user's role with better priority handling
  -- Priority: 1. raw_user_meta_data role, 2. app_metadata role, 3. default to 'customer'
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.app_metadata->>'role',
    'customer'
  );
  
  -- Get user details with better fallbacks
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  
  phone := NEW.raw_user_meta_data->>'phone';
  store_name := NEW.raw_user_meta_data->>'store_name';
  vendor_type := COALESCE(NEW.raw_user_meta_data->>'vendor_type', 'student');
  
  -- Create or update base profile with role flags
  INSERT INTO public.profiles (id, email, full_name, role, phone, is_vendor, is_delivery_agent)
  VALUES (
    NEW.id,
    NEW.email,
    full_name,
    user_role,
    phone,
    CASE WHEN user_role IN ('vendor', 'late_night_vendor') THEN TRUE ELSE FALSE END,
    CASE WHEN user_role = 'delivery_agent' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_vendor = CASE 
      WHEN EXCLUDED.role IN ('vendor', 'late_night_vendor') THEN TRUE 
      ELSE profiles.is_vendor 
    END,
    is_delivery_agent = CASE 
      WHEN EXCLUDED.role = 'delivery_agent' THEN TRUE 
      ELSE profiles.is_delivery_agent 
    END;

  -- Create or update vendor record if role is 'vendor'
  IF user_role = 'vendor' THEN
    INSERT INTO public.vendors (user_id, store_name, vendor_type, is_active)
    VALUES (
      NEW.id,
      COALESCE(store_name, full_name || '''s Store'),
      vendor_type,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      vendor_type = EXCLUDED.vendor_type;
  END IF;

  -- Create or update delivery agent record for campus delivery
  IF user_role = 'delivery_agent' THEN
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, is_foot_delivery)
    VALUES (
      NEW.id,
      vehicle_type,  -- Default to 'Foot' for campus delivery
      false,
      0,
      0,
      0.0,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_type = EXCLUDED.vehicle_type,
      is_foot_delivery = true;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update the add_delivery_agent_role function to use 'Foot' as default
CREATE OR REPLACE FUNCTION public.add_delivery_agent_role(user_id UUID, vehicle_type TEXT DEFAULT 'Foot')
RETURNS VOID AS $$
BEGIN
  -- Update profile to set delivery agent flag
  UPDATE profiles 
  SET is_delivery_agent = TRUE,
      role = 'delivery_agent'
  WHERE id = user_id;

  -- Create or update delivery agent record
  INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, is_foot_delivery)
  VALUES (user_id, vehicle_type, false, 0, 0, 0.0, true)
  ON CONFLICT (user_id) DO UPDATE SET
    vehicle_type = EXCLUDED.vehicle_type,
    is_foot_delivery = true;

  -- Create agent wallet if it doesn't exist
  INSERT INTO agent_wallets (agent_id, food_wallet_balance, earnings_wallet_balance)
  SELECT da.id, 0.00, 0.00
  FROM delivery_agents da
  WHERE da.user_id = user_id
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Update the auth schema to allow user metadata updates
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT ALL PRIVILEGES ON TABLE auth.users TO authenticated, anon;