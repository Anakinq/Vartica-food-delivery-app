-- Migration: Extend profile creation trigger to handle vendor and delivery agent records
-- This trigger creates vendor and delivery agent records when users sign up with those roles

-- Drop existing trigger and function to recreate with extended functionality
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create enhanced function to handle new user profile creation with role-specific records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL THEN
    -- Insert into profiles table
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

    -- Create role-specific records based on the user's role
    IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'vendor' THEN
      -- Create vendor record
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
      -- Create delivery agent record
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

-- Create trigger that fires after user insert or update
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a profile entry and role-specific records when a user email is confirmed';