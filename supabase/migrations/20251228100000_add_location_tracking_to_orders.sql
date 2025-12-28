-- Add location tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_location jsonb,
ADD COLUMN IF NOT EXISTS delivery_agent_location jsonb,
ADD COLUMN IF NOT EXISTS route_coordinates jsonb[];

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_location ON public.orders USING GIN (customer_location);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_agent_location ON public.orders USING GIN (delivery_agent_location);

-- Create RLS policies for location tracking using separate DO blocks to avoid conflicts
-- Policy for agents to update their location
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow agents to update their location') THEN
    CREATE POLICY "Allow agents to update their location" ON public.orders
    FOR UPDATE TO authenticated
    USING (
      auth.uid() = (
        SELECT da.user_id 
        FROM public.delivery_agents da 
        WHERE da.id = delivery_agent_id
      )
    )
    WITH CHECK (
      auth.uid() = (
        SELECT da.user_id 
        FROM public.delivery_agents da 
        WHERE da.id = delivery_agent_id
      )
    );
  END IF;
END $$;

-- Policy for customers to view their order location
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow customers to view their order location') THEN
    CREATE POLICY "Allow customers to view their order location" ON public.orders
    FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
    );
  END IF;
END $$;

-- Policy for delivery agents to view their orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow delivery agents to view their orders') THEN
    CREATE POLICY "Allow delivery agents to view their orders" ON public.orders
    FOR SELECT TO authenticated
    USING (
      auth.uid() = (
        SELECT da.user_id 
        FROM public.delivery_agents da 
        WHERE da.id = delivery_agent_id
      )
    );
  END IF;
END $$;

-- Policy for admins to view all order locations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow admins to view all order locations') THEN
    CREATE POLICY "Allow admins to view all order locations" ON public.orders
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );
  END IF;
END $$;