-- Add favorites table for persistent user favorites
-- This table will store user's favorite menu items

CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure a user can only favorite an item once
    UNIQUE(user_id, menu_item_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_menu_item_id ON favorites(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorites" 
    ON favorites FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
    ON favorites FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
    ON favorites FOR DELETE 
    USING (auth.uid() = user_id);

-- Create function to get user's favorite menu items
CREATE OR REPLACE FUNCTION get_user_favorites()
RETURNS TABLE (
    menu_item_id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    image_url TEXT,
    category TEXT,
    seller_id UUID,
    seller_type TEXT,
    is_available BOOLEAN,
    favorited_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id as menu_item_id,
        mi.name,
        mi.description,
        mi.price,
        mi.image_url,
        mi.category,
        mi.seller_id,
        mi.seller_type::TEXT,
        mi.is_available,
        f.created_at as favorited_at
    FROM favorites f
    JOIN menu_items mi ON f.menu_item_id = mi.id
    WHERE f.user_id = auth.uid()
    ORDER BY f.created_at DESC;
END;
$$;

-- Create function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_favorite(p_menu_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if favorite already exists
    SELECT EXISTS(
        SELECT 1 FROM favorites 
        WHERE user_id = auth.uid() AND menu_item_id = p_menu_item_id
    ) INTO v_exists;
    
    IF v_exists THEN
        -- Remove favorite
        DELETE FROM favorites 
        WHERE user_id = auth.uid() AND menu_item_id = p_menu_item_id;
        RETURN FALSE;
    ELSE
        -- Add favorite
        INSERT INTO favorites (user_id, menu_item_id)
        VALUES (auth.uid(), p_menu_item_id);
        RETURN TRUE;
    END IF;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON favorites TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorites() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_favorite(UUID) TO authenticated;