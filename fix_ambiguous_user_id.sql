-- Fix for ambiguous user_id column reference
-- Run this in your Supabase SQL Editor

-- ============================================
-- Fix add_delivery_agent_role function
-- ============================================
DROP FUNCTION IF EXISTS public.add_delivery_agent_role;

CREATE OR REPLACE FUNCTION public.add_delivery_agent_role(
    p_user_id UUID,
    p_vehicle_type TEXT DEFAULT 'Foot'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if already a delivery agent
    IF EXISTS (
        SELECT 1 
        FROM public.delivery_agents da 
        WHERE da.user_id = p_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ALREADY_DELIVERY_AGENT',
            'message', 'User is already registered as delivery agent.'
        );
    END IF;

    -- Update profile
    UPDATE public.profiles 
    SET is_delivery_agent = TRUE,
        role = COALESCE(NULLIF(role, 'customer'), role),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Insert delivery agent record
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available, is_approved)
    VALUES (p_user_id, p_vehicle_type, TRUE, FALSE)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully registered as delivery agent'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_delivery_agent_role TO authenticated;

-- ============================================
-- Fix add_vendor_role function
-- ============================================
DROP FUNCTION IF EXISTS public.add_vendor_role;

CREATE OR REPLACE FUNCTION public.add_vendor_role(
    p_user_id UUID,
    p_store_name TEXT,
    p_vendor_type TEXT DEFAULT 'student'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if already a vendor
    IF EXISTS (
        SELECT 1 
        FROM public.profiles p 
        WHERE p.id = p_user_id AND p.role IN ('vendor', 'late_night_vendor')
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ALREADY_VENDOR',
            'message', 'User is already registered as vendor.'
        );
    END IF;

    -- Update profile
    UPDATE public.profiles 
    SET is_vendor = TRUE,
        role = p_vendor_type,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully registered as vendor'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_vendor_role TO authenticated;
