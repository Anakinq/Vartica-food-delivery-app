/*
  # Vartica Food Delivery System - Complete Database Schema

  ## Overview
  Complete database schema for a university campus food delivery platform with multiple user roles,
  real-time order management, and in-app messaging.

  ## New Tables

  ### 1. `profiles`
  User profile extension for auth.users
  - `id` (uuid, FK to auth.users) - Primary key
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'customer', 'cafeteria', 'vendor', 'delivery_agent', 'admin'
  - `phone` (text) - Contact phone number
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. `cafeterias`
  Pre-registered campus cafeterias (7 fixed entities)
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK to profiles) - Associated user account
  - `name` (text) - Cafeteria name (Cafeteria 1, Cafeteria 2, Med Cafeteria, etc.)
  - `description` (text) - Brief description
  - `image_url` (text) - Cafeteria logo/image
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `vendors`
  Student vendors and late-night vendor account
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK to profiles) - Associated user account
  - `store_name` (text) - Vendor store name
  - `description` (text) - Store description
  - `image_url` (text) - Store logo/image
  - `vendor_type` (text) - 'student' or 'late_night'
  - `is_active` (boolean) - Active status
  - `available_from` (time) - Available start time (for late-night vendors)
  - `available_until` (time) - Available end time (for late-night vendors)
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. `menu_items`
  Food items offered by cafeterias and vendors
  - `id` (uuid) - Primary key
  - `seller_id` (uuid) - References cafeteria or vendor ID
  - `seller_type` (text) - 'cafeteria' or 'vendor'
  - `name` (text) - Item name
  - `description` (text) - Item description
  - `price` (decimal) - Item price
  - `image_url` (text) - Item image
  - `category` (text) - Food category (e.g., 'Main Course', 'Beverage', 'Snack')
  - `is_available` (boolean) - Stock availability
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. `delivery_agents`
  Delivery agent profiles with status tracking
  - `id` (uuid) - Primary key
  - `user_id` (uuid, FK to profiles) - Associated user account
  - `vehicle_type` (text) - Type of vehicle (bike, scooter, etc.)
  - `is_available` (boolean) - Current availability status
  - `active_orders_count` (integer) - Number of currently active orders
  - `total_deliveries` (integer) - Total completed deliveries
  - `rating` (decimal) - Average rating
  - `created_at` (timestamptz) - Registration timestamp

  ### 6. `orders`
  Customer orders with status tracking
  - `id` (uuid) - Primary key
  - `order_number` (text) - Human-readable order number
  - `customer_id` (uuid, FK to profiles) - Customer who placed order
  - `seller_id` (uuid) - Cafeteria or vendor ID
  - `seller_type` (text) - 'cafeteria' or 'vendor'
  - `delivery_agent_id` (uuid, FK to delivery_agents) - Assigned delivery agent
  - `status` (text) - Order status: 'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'
  - `subtotal` (decimal) - Items subtotal
  - `delivery_fee` (decimal) - Delivery charge
  - `discount` (decimal) - Discount amount from promo code
  - `total` (decimal) - Final total
  - `payment_method` (text) - 'cash' or 'online'
  - `payment_status` (text) - 'pending', 'paid', 'failed'
  - `promo_code` (text) - Applied promo code
  - `delivery_address` (text) - Delivery location
  - `delivery_notes` (text) - Special instructions
  - `scheduled_for` (timestamptz) - Scheduled delivery time (for pre-orders)
  - `created_at` (timestamptz) - Order creation time
  - `updated_at` (timestamptz) - Last update time

  ### 7. `order_items`
  Individual items within an order
  - `id` (uuid) - Primary key
  - `order_id` (uuid, FK to orders) - Associated order
  - `menu_item_id` (uuid, FK to menu_items) - Menu item
  - `quantity` (integer) - Item quantity
  - `price` (decimal) - Price at time of order
  - `special_instructions` (text) - Item-specific notes

  ### 8. `promo_codes`
  Promotional discount codes
  - `id` (uuid) - Primary key
  - `code` (text) - Promo code (unique)
  - `discount_type` (text) - 'percentage' or 'fixed'
  - `discount_value` (decimal) - Discount amount or percentage
  - `min_order_value` (decimal) - Minimum order requirement
  - `max_discount` (decimal) - Maximum discount cap
  - `valid_from` (timestamptz) - Start date
  - `valid_until` (timestamptz) - End date
  - `is_active` (boolean) - Active status
  - `usage_limit` (integer) - Max total uses
  - `used_count` (integer) - Current usage count
  - `created_at` (timestamptz) - Creation timestamp

  ### 9. `chat_messages`
  In-app messaging between customers and delivery agents
  - `id` (uuid) - Primary key
  - `order_id` (uuid, FK to orders) - Associated order
  - `sender_id` (uuid, FK to profiles) - Message sender
  - `message` (text) - Message content
  - `is_read` (boolean) - Read status
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  - RLS enabled on all tables
  - Policies enforce role-based access control
  - Users can only access data relevant to their role
  - Admin has full access for oversight
  - Chat messages auditable by admin

  ## Indexes
  - Optimized queries for order lookup, menu browsing, and chat retrieval
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'cafeteria', 'vendor', 'delivery_agent', 'admin')),
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create cafeterias table
CREATE TABLE IF NOT EXISTS cafeterias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cafeterias ENABLE ROW LEVEL SECURITY;

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

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  description text,
  image_url text,
  vendor_type text NOT NULL CHECK (vendor_type IN ('student', 'late_night')),
  is_active boolean DEFAULT true,
  available_from time,
  available_until time,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

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

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  seller_type text NOT NULL CHECK (seller_type IN ('cafeteria', 'vendor')),
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL CHECK (price >= 0),
  image_url text,
  category text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Anyone can view available menu items') THEN
    CREATE POLICY "Anyone can view available menu items"
      ON menu_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Cafeterias can manage own menu items') THEN
    CREATE POLICY "Cafeterias can manage own menu items"
      ON menu_items FOR ALL
      TO authenticated
      USING (
        seller_type = 'cafeteria' AND
        EXISTS (
          SELECT 1 FROM cafeterias
          WHERE cafeterias.id = seller_id
          AND cafeterias.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Vendors can manage own menu items') THEN
    CREATE POLICY "Vendors can manage own menu items"
      ON menu_items FOR ALL
      TO authenticated
      USING (
        seller_type = 'vendor' AND
        EXISTS (
          SELECT 1 FROM vendors
          WHERE vendors.id = seller_id
          AND vendors.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Admin can manage all menu items') THEN
    CREATE POLICY "Admin can manage all menu items"
      ON menu_items FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Create delivery_agents table
CREATE TABLE IF NOT EXISTS delivery_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text,
  is_available boolean DEFAULT true,
  active_orders_count integer DEFAULT 0 CHECK (active_orders_count >= 0 AND active_orders_count <= 2),
  total_deliveries integer DEFAULT 0,
  rating decimal(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_agents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_agents' AND policyname = 'Delivery agents can read own profile') THEN
    CREATE POLICY "Delivery agents can read own profile"
      ON delivery_agents FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_agents' AND policyname = 'Delivery agents can update own profile') THEN
    CREATE POLICY "Delivery agents can update own profile"
      ON delivery_agents FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_agents' AND policyname = 'Delivery agents can insert own profile') THEN
    CREATE POLICY "Delivery agents can insert own profile"
      ON delivery_agents FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_agents' AND policyname = 'Admin can manage all delivery agents') THEN
    CREATE POLICY "Admin can manage all delivery agents"
      ON delivery_agents FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES profiles(id),
  seller_id uuid NOT NULL,
  seller_type text NOT NULL CHECK (seller_type IN ('cafeteria', 'vendor')),
  delivery_agent_id uuid REFERENCES delivery_agents(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
  subtotal decimal(10, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee decimal(10, 2) DEFAULT 0 CHECK (delivery_fee >= 0),
  discount decimal(10, 2) DEFAULT 0 CHECK (discount >= 0),
  total decimal(10, 2) NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'online')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  promo_code text,
  delivery_address text NOT NULL,
  delivery_notes text,
  scheduled_for timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customers can view own orders') THEN
    CREATE POLICY "Customers can view own orders"
      ON orders FOR SELECT
      TO authenticated
      USING (customer_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Customers can create orders') THEN
    CREATE POLICY "Customers can create orders"
      ON orders FOR INSERT
      TO authenticated
      WITH CHECK (customer_id = auth.uid());
  END IF;
END $$;

CREATE POLICY "Delivery agents can view assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_agents
      WHERE delivery_agents.user_id = auth.uid()
      AND orders.delivery_agent_id = delivery_agents.id
    )
  );

CREATE POLICY "Delivery agents can view available orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'delivery_agent'
    )
  );

CREATE POLICY "Delivery agents can update assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_agents
      WHERE delivery_agents.user_id = auth.uid()
      AND orders.delivery_agent_id = delivery_agents.id
    )
  );

CREATE POLICY "Cafeterias can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    seller_type = 'cafeteria' AND
    EXISTS (
      SELECT 1 FROM cafeterias
      WHERE cafeterias.id = orders.seller_id
      AND cafeterias.user_id = auth.uid()
    )
  );

CREATE POLICY "Cafeterias can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    seller_type = 'cafeteria' AND
    EXISTS (
      SELECT 1 FROM cafeterias
      WHERE cafeterias.id = orders.seller_id
      AND cafeterias.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    seller_type = 'vendor' AND
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = orders.seller_id
      AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Vendors can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    seller_type = 'vendor' AND
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = orders.seller_id
      AND vendors.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all orders"
  ON orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10, 2) NOT NULL CHECK (price >= 0),
  special_instructions text
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view order items for their orders"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM delivery_agents
          WHERE delivery_agents.user_id = auth.uid()
          AND orders.delivery_agent_id = delivery_agents.id
        )
        OR EXISTS (
          SELECT 1 FROM cafeterias
          WHERE cafeterias.user_id = auth.uid()
          AND orders.seller_id = cafeterias.id
          AND orders.seller_type = 'cafeteria'
        )
        OR EXISTS (
          SELECT 1 FROM vendors
          WHERE vendors.user_id = auth.uid()
          AND orders.seller_id = vendors.id
          AND orders.seller_type = 'vendor'
        )
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Customers can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10, 2) NOT NULL CHECK (discount_value > 0),
  min_order_value decimal(10, 2) DEFAULT 0,
  max_discount decimal(10, 2),
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  usage_limit integer,
  used_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true AND now() BETWEEN valid_from AND valid_until);

CREATE POLICY "Admin can manage promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = chat_messages.order_id
      AND (
        orders.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM delivery_agents
          WHERE delivery_agents.user_id = auth.uid()
          AND orders.delivery_agent_id = delivery_agents.id
        )
      )
    )
  );

CREATE POLICY "Order participants can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = chat_messages.order_id
      AND (
        orders.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM delivery_agents
          WHERE delivery_agents.user_id = auth.uid()
          AND orders.delivery_agent_id = delivery_agents.id
        )
      )
    )
  );

CREATE POLICY "Admin can view all chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_menu_items_seller ON menu_items(seller_id, seller_type);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id, seller_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_agent ON orders(delivery_agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();