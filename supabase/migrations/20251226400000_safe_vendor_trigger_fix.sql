-- Migration: Safe fix for vendor and delivery agent creation
-- This extends the existing profile creation to also create vendor/delivery agent records
-- Uses the same pattern as the original trigger but adds role-specific record creation

-- First, let's check if the existing trigger needs to be updated or if we need a separate one
-- We'll create a new function that handles both profile creation and role-specific records

-- Create or replace the function to handle new user profile creation with role-specific records
CREATE OR REPLACE FUNCTION public.handle_new_user_with_role_support()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile when email is confirmed (same logic as original trigger)
  IF NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, phone, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
      NEW.raw_user_meta_data->>'phone',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate profile creation

    -- Now create role-specific records if needed
    -- Only proceed if the profile was actually inserted (not updated) or if the profile exists
    -- and we need to create vendor/delivery agent records based on the stored role
    
    -- Create vendor record if role is 'vendor'
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'vendor' THEN
      INSERT INTO public.vendors (user_id, store_name, description, vendor_type, is_active)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        'New vendor account',
        COALESCE(NEW.raw_user_meta_data->>'vendor_type', 'student'),
        true
      )
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'delivery_agent' THEN
      -- Create delivery agent record if role is 'delivery_agent'
      INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike'),
        false, -- Default to not available initially
        0,     -- No active orders initially
        0,     -- No completed deliveries initially
        0.0    -- No rating initially
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new trigger that works alongside the existing one or replaces it
-- First drop the new trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_extended ON auth.users;

-- Create trigger that fires after user insert or update when email is confirmed
CREATE TRIGGER on_auth_user_created_extended
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user_with_role_support();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMENT ON FUNCTION public.handle_new_user_with_role_support IS 'Creates profile and role-specific records when user email is confirmed';