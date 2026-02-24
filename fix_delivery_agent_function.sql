-- Fix for delivery agent registration - Run this in your Supabase SQL Editor
-- This will create the missing add_delivery_agent_role function

-- First, check if the function exists
SELECT proname, proargtypes 
FROM pg_proc 
WHERE proname = 'add_delivery_agent_role';

-- If the function doesn't exist or needs to be updated, run this:

-- Drop the existing function if it exists (this is safe)
DROP FUNCTION IF EXISTS public.add_delivery_agent_role(UUID, TEXT);

-- Create the function that returns JSON for better error handling
CREATE OR REPLACE FUNCTION public.add_delivery_agent_role(
    user_id UUID,
    vehicle_type TEXT DEFAULT 'Foot'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN;
    delivery_agent_exists BOOLEAN;
    result JSON;
BEGIN
    -- Check if profile exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_id
    ) INTO profile_exists;

    IF NOT profile_exists THEN
        result := json_build_object(
            'success', false,
            'error', 'PROFILE_NOT_FOUND',
            'message', 'No profile found for user ' || user_id || '. Please complete your profile first.'
        );
        RETURN result;
    END IF;

    -- Check if already a delivery agent
    SELECT EXISTS (
        SELECT 1 FROM public.delivery_agents WHERE user_id = user_id
    ) INTO delivery_agent_exists;

    IF delivery_agent_exists THEN
        result := json_build_object(
            'success', false,
            'error', 'ALREADY_DELIVERY_AGENT',
            'message', 'User is already registered as a delivery agent.'
        );
        RETURN result;
    END IF;

    -- Update profile flags
    UPDATE public.profiles 
    SET 
        is_delivery_agent = TRUE,
        role = CASE 
            WHEN role = 'customer' THEN 'delivery_agent'
            ELSE role
        END,
        updated_at = NOW()
    WHERE id = user_id;

    -- Create delivery agent record
    INSERT INTO public.delivery_agents (
        user_id, 
        vehicle_type, 
        is_available, 
        active_orders_count, 
        total_deliveries, 
        rating,
        is_approved,
        is_foot_delivery
    )
    VALUES (
        user_id,
        vehicle_type,
        FALSE,
        0,
        0,
        5.00,
        FALSE,
        CASE WHEN vehicle_type ILIKE '%foot%' OR vehicle_type = 'Foot' THEN TRUE ELSE FALSE END
    );

    -- Create agent wallet
    INSERT INTO public.agent_wallets (
        agent_id,
        customer_funds,
        delivery_earnings,
        total_balance,
        updated_at
    )
    SELECT 
        id,
        0,
        0,
        0,
        NOW()
    FROM public.delivery_agents 
    WHERE user_id = add_delivery_agent_role.user_id
    ON CONFLICT (agent_id) DO NOTHING;

    result := json_build_object(
        'success', true,
        'message', 'Successfully registered as delivery agent',
        'vehicle_type', vehicle_type
    );

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    result := json_build_object(
        'success', false,
        'error', 'DATABASE_ERROR',
        'message', SQLERRM,
        'detail', SQLSTATE
    );
    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.add_delivery_agent_role(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.add_delivery_agent_role IS 'Adds delivery agent role to existing user. Returns JSON with success status and message.';

-- Test the function
SELECT public.add_delivery_agent_role('00000000-0000-0000-0000-000000000000', 'Foot') as test_result;