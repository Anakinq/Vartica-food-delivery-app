-- Create delivery ratings table
CREATE TABLE IF NOT EXISTS delivery_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE delivery_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Customers can rate delivery agents" ON delivery_ratings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own ratings" ON delivery_ratings
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Delivery agents can view ratings for their deliveries" ON delivery_ratings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = delivery_agent_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_customer_id ON delivery_ratings(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_delivery_agent_id ON delivery_ratings(delivery_agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_order_id ON delivery_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_created_at ON delivery_ratings(created_at);

-- Create a function to update the average rating for delivery agents
CREATE OR REPLACE FUNCTION update_delivery_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the average rating in the delivery_agents table
  UPDATE delivery_agents
  SET rating = (
    SELECT AVG(rating)::NUMERIC
    FROM delivery_ratings
    WHERE delivery_agent_id = NEW.delivery_agent_id
  )
  WHERE id = NEW.delivery_agent_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update agent rating after inserting/updating ratings
CREATE TRIGGER update_agent_rating_trigger
  AFTER INSERT OR UPDATE ON delivery_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_agent_rating();

-- Add a constraint to prevent duplicate ratings for the same order
ALTER TABLE delivery_ratings
ADD CONSTRAINT unique_customer_order_rating UNIQUE (customer_id, order_id);