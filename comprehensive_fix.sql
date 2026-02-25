-- COMPREHENSIVE FIX FOR ALL ISSUES: CAFETERIA LOGIN, VENDOR VISIBILITY, PROFILE SAVING

-- 1. First, let's fix the profiles table to ensure it has all required columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hostel_location TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Update RLS policies for profiles to allow updates to new columns
-- Drop existing policy to recreate it properly
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also ensure SELECT policy exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile') THEN
    CREATE POLICY "Users can read own profile"
      ON profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- 3. Fix auth trigger function to properly handle all roles including cafeterias
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  store_name text;
  description text;
  vendor_type text;
  matric_number text;
  department text;
  available_from text;
  available_until text;
  location text;
  delivery_option text;
  cafeteria_name text;
  cafeteria_description text;
BEGIN
  -- Extract user role, default to 'customer' if not specified
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  
  -- Create or update base profile with all fields
  INSERT INTO public.profiles (id, email, full_name, role, phone, hostel_location, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'hostel_location',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    hostel_location = EXCLUDED.hostel_location,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

  -- Handle vendor creation with comprehensive field handling
  IF user_role = 'vendor' OR user_role = 'late_night_vendor' THEN
    -- Extract all vendor-specific fields
    store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', 
                          COALESCE(NEW.raw_user_meta_data->>'full_name', 'User') || '''s Store',
                          'New Vendor');
    description := NEW.raw_user_meta_data->>'description';
    vendor_type := COALESCE(NEW.raw_user_meta_data->>'vendor_type', 
                           CASE WHEN user_role = 'late_night_vendor' THEN 'late_night' ELSE 'student' END);
    matric_number := NEW.raw_user_meta_data->>'matric_number';
    department := NEW.raw_user_meta_data->>'department';
    available_from := NEW.raw_user_meta_data->>'available_from';
    available_until := NEW.raw_user_meta_data->>'available_until';
    location := NEW.raw_user_meta_data->>'location';
    delivery_option := NEW.raw_user_meta_data->>'delivery_option';
    
    -- Insert vendor record with all available fields
    INSERT INTO public.vendors (
      user_id, 
      store_name, 
      description, 
      image_url,
      vendor_type, 
      is_active,
      matric_number,
      department,
      available_from,
      available_until,
      location,
      delivery_option
    )
    VALUES (
      NEW.id,
      store_name,
      description,
      CASE 
        WHEN user_role = 'late_night_vendor' THEN 'https://placehold.co/400x400/4f46e5/white?text=Late+Night'
        ELSE 'https://placehold.co/400x400/e2e8f0/64748b?text=Vendor+Logo'
      END,
      vendor_type,
      true,
      matric_number,
      department,
      CASE WHEN available_from IS NOT NULL THEN available_from::time ELSE NULL END,
      CASE WHEN available_until IS NOT NULL THEN available_until::time ELSE NULL END,
      location,
      delivery_option
    )
    ON CONFLICT (user_id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      description = EXCLUDED.description,
      vendor_type = EXCLUDED.vendor_type,
      matric_number = EXCLUDED.matric_number,
      department = EXCLUDED.department,
      available_from = EXCLUDED.available_from,
      available_until = EXCLUDED.available_until,
      location = EXCLUDED.location,
      delivery_option = EXCLUDED.delivery_option,
      updated_at = NOW();
  END IF;

  -- Handle delivery agent creation
  IF user_role = 'delivery_agent' THEN
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike'),
      false
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_type = EXCLUDED.vehicle_type,
      updated_at = NOW();
  END IF;

  -- Handle cafeteria creation (if needed) - FIXED to include description
  IF user_role = 'cafeteria' THEN
    cafeteria_name := COALESCE(NEW.raw_user_meta_data->>'cafeteria_name', 
                               COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Cafeteria'));
    cafeteria_description := COALESCE(NEW.raw_user_meta_data->>'cafeteria_description', 'Campus Cafeteria');
    
    INSERT INTO public.cafeterias (user_id, name, description, is_active, created_at)
    VALUES (
      NEW.id,
      cafeteria_name,
      cafeteria_description,
      true,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = NOW();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the entire transaction
    RAISE WARNING 'Error in handle_new_user function: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix RLS policies for cafeterias table to ensure proper access
DO $$
BEGIN
  -- Drop existing policies to recreate them properly
  DROP POLICY IF EXISTS "Anyone can view active cafeterias" ON cafeterias;
  DROP POLICY IF EXISTS "Cafeteria staff can update own cafeteria" ON cafeterias;
  DROP POLICY IF EXISTS "Admin can manage all cafeterias" ON cafeterias;
  
  -- Create policies for cafeterias
  CREATE POLICY "Anyone can view active cafeterias"
    ON cafeterias FOR SELECT
    TO authenticated
    USING (is_active = true);

  CREATE POLICY "Cafeteria staff can update own cafeteria"
    ON cafeterias FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Admin can manage all cafeterias"
    ON cafeterias FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
END $$;

-- 5. Fix RLS policies for vendors table to ensure proper access
DO $$
BEGIN
  -- Drop existing policies to recreate them properly
  DROP POLICY IF EXISTS "Anyone can view active vendors" ON vendors;
  DROP POLICY IF EXISTS "Vendors can update own store" ON vendors;
  DROP POLICY IF EXISTS "Vendors can insert own store" ON vendors;
  DROP POLICY IF EXISTS "Admin can manage all vendors" ON vendors;
  
  -- Create policies for vendors
  CREATE POLICY "Anyone can view active vendors"
    ON vendors FOR SELECT
    TO authenticated
    USING (is_active = true);

  CREATE POLICY "Vendors can update own store"
    ON vendors FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Vendors can insert own store"
    ON vendors FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

  CREATE POLICY "Admin can manage all vendors"
    ON vendors FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
END $$;

-- 6. Ensure proper permissions are granted
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON cafeterias TO postgres, anon, authenticated, service_role;
GRANT ALL ON vendors TO postgres, anon, authenticated, service_role;
GRANT ALL ON profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON delivery_agents TO postgres, anon, authenticated, service_role;

-- 7. Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
  DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
  CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
  DROP TRIGGER IF EXISTS update_cafeterias_updated_at ON cafeterias;
  CREATE TRIGGER update_cafeterias_updated_at
    BEFORE UPDATE ON cafeterias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 8. Verify the setup is working
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('hostel_location', 'avatar_url', 'updated_at')
ORDER BY ordinal_position;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'cafeterias' AND column_name IN ('description', 'updated_at')
ORDER BY ordinal_position;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'vendors' AND column_name IN ('updated_at', 'application_status', 'application_submitted_at')
ORDER BY ordinal_position;

-- Check if the function exists
SELECT proname, probin, proconfig 
FROM pg_proc 
WHERE proname = 'handle_new_user';