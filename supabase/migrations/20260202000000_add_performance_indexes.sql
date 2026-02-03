-- Add missing indexes for performance optimization

-- Index for orders status and customer lookup
CREATE INDEX IF NOT EXISTS idx_orders_status_customer ON orders(status, customer_id);

-- Index for menu items seller and availability
CREATE INDEX IF NOT EXISTS idx_menu_items_seller_available ON menu_items(seller_id, is_available);

-- Index for profiles creation date
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Index for vendors by type and active status
CREATE INDEX IF NOT EXISTS idx_vendors_type_active ON vendors(vendor_type, is_active);

-- Index for delivery agents availability
CREATE INDEX IF NOT EXISTS idx_delivery_agents_available ON delivery_agents(is_available, active_orders_count);

-- Index for chat messages by order
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_created ON chat_messages(order_id, created_at);

-- Index for wallet transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_agent_created ON wallet_transactions(agent_id, created_at);

-- Index for withdrawals by status
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at);

-- Composite index for better order lookup performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON orders(seller_id, seller_type, status);

-- Index for order items lookup
CREATE INDEX IF NOT EXISTS idx_order_items_order_menu ON order_items(order_id, menu_item_id);