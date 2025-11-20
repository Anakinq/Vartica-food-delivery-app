-- Clear all existing cafeteria menu items
DELETE FROM menu_items WHERE seller_type = 'cafeteria';

-- Get all cafeteria IDs to insert menu items for each
DO $$
DECLARE
  cafeteria RECORD;
BEGIN
  -- Loop through all active cafeterias
  FOR cafeteria IN SELECT id FROM cafeterias WHERE is_active = true
  LOOP
    -- RICE & PASTA
    INSERT INTO menu_items (seller_id, seller_type, name, description, price, category, image_url, is_available) VALUES
    (cafeteria.id, 'cafeteria', 'Jollof Rice', 'Nigerian jollof rice cooked to perfection', 500, 'Rice & Pasta', 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400', true),
    (cafeteria.id, 'cafeteria', 'White Rice', 'Steamed white rice', 500, 'Rice & Pasta', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400', true),
    (cafeteria.id, 'cafeteria', 'Fried Rice', 'Colorful fried rice with vegetables', 500, 'Rice & Pasta', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', true),
    (cafeteria.id, 'cafeteria', 'Ofada Rice', 'Local unpolished rice', 500, 'Rice & Pasta', 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400', true),
    (cafeteria.id, 'cafeteria', 'Village Rice', 'Traditional village-style rice', 500, 'Rice & Pasta', 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400', true),
    (cafeteria.id, 'cafeteria', 'Basmati Rice', 'Premium long-grain basmati rice', 700, 'Rice & Pasta', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400', true),
    (cafeteria.id, 'cafeteria', 'Jollof Spaghetti', 'Jollof-style spaghetti', 400, 'Rice & Pasta', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400', true),
    (cafeteria.id, 'cafeteria', 'White Spaghetti', 'Plain spaghetti', 400, 'Rice & Pasta', 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400', true),
    (cafeteria.id, 'cafeteria', 'Stir Fried Spaghetti', 'Stir-fried spaghetti with vegetables', 500, 'Rice & Pasta', 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?w=400', true),
    (cafeteria.id, 'cafeteria', 'Beans', 'Cooked beans', 500, 'Rice & Pasta', 'https://images.unsplash.com/photo-1596458723740-366843a1a8f6?w=400', true);

    -- PROTEINS & SIDES
    INSERT INTO menu_items (seller_id, seller_type, name, description, price, category, image_url, is_available) VALUES
    (cafeteria.id, 'cafeteria', 'Chicken & Chips', 'Fried chicken with chips', 4500, 'Proteins & Sides', 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400', true),
    (cafeteria.id, 'cafeteria', 'Chips', 'Crispy french fries', 2000, 'Proteins & Sides', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400', true),
    (cafeteria.id, 'cafeteria', 'Indomie', 'Instant noodles', 2000, 'Proteins & Sides', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400', true),
    (cafeteria.id, 'cafeteria', 'Moimoi', 'Steamed bean pudding', 600, 'Proteins & Sides', 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400', true),
    (cafeteria.id, 'cafeteria', 'Boiled Yam', 'Plain boiled yam', 250, 'Proteins & Sides', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', true),
    (cafeteria.id, 'cafeteria', 'Plantain', 'Fried plantain', 400, 'Proteins & Sides', 'https://images.unsplash.com/photo-1587334206323-7072a37f2d6c?w=400', true),
    (cafeteria.id, 'cafeteria', 'Chicken Sauce', 'Rich chicken sauce', 1200, 'Proteins & Sides', 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400', true),
    (cafeteria.id, 'cafeteria', 'Chicken', 'Fried or grilled chicken', 2500, 'Proteins & Sides', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400', true),
    (cafeteria.id, 'cafeteria', 'Fish', 'Fried fish', 800, 'Proteins & Sides', 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=400', true),
    (cafeteria.id, 'cafeteria', 'Beef', 'Cooked beef', 500, 'Proteins & Sides', 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400', true),
    (cafeteria.id, 'cafeteria', 'Boiled Egg', 'Hard boiled egg', 300, 'Proteins & Sides', 'https://images.unsplash.com/photo-1587486937669-e26a7105fbe5?w=400', true),
    (cafeteria.id, 'cafeteria', 'Sausage', 'Fried sausage', 400, 'Proteins & Sides', 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400', true),
    (cafeteria.id, 'cafeteria', 'Egg Sauce', 'Scrambled egg sauce', 500, 'Proteins & Sides', 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400', true),
    (cafeteria.id, 'cafeteria', 'Ofada Sauce', 'Spicy traditional ofada sauce', 300, 'Proteins & Sides', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', true),
    (cafeteria.id, 'cafeteria', 'Salad', 'Fresh vegetable salad', 500, 'Proteins & Sides', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', true);

    -- DRINKS
    INSERT INTO menu_items (seller_id, seller_type, name, description, price, category, image_url, is_available) VALUES
    (cafeteria.id, 'cafeteria', 'Chapman', 'Mixed fruit cocktail drink', 1000, 'Drinks', 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=400', true),
    (cafeteria.id, 'cafeteria', 'Coke', 'Coca-Cola soft drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', true),
    (cafeteria.id, 'cafeteria', 'Fanta', 'Orange-flavored soft drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400', true),
    (cafeteria.id, 'cafeteria', 'Sprite', 'Lemon-lime soft drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400', true),
    (cafeteria.id, 'cafeteria', 'Krest Bitter Lemon', 'Krest bitter lemon', 500, 'Drinks', 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400', true),
    (cafeteria.id, 'cafeteria', 'Krest Soda Water', 'Krest soda water', 500, 'Drinks', 'https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=400', true),
    (cafeteria.id, 'cafeteria', 'Krest Tonic Water', 'Krest tonic water', 500, 'Drinks', 'https://images.unsplash.com/photo-1582205630767-f96de8dd5c81?w=400', true),
    (cafeteria.id, 'cafeteria', 'Schweppes Ginger Ale', 'Schweppes ginger ale', 500, 'Drinks', 'https://images.unsplash.com/photo-1581006652669-0fa97d90d942?w=400', true),
    (cafeteria.id, 'cafeteria', 'Schweppes Soda Water', 'Schweppes soda water', 500, 'Drinks', 'https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=400', true),
    (cafeteria.id, 'cafeteria', 'Pepsi', 'Pepsi soft drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400', true),
    (cafeteria.id, 'cafeteria', '7UP', '7UP lemon-lime drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400', true),
    (cafeteria.id, 'cafeteria', 'Mirinda Orange', 'Mirinda orange flavored drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400', true),
    (cafeteria.id, 'cafeteria', 'Mirinda Pineapple', 'Mirinda pineapple flavored drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1589991944035-7740a1f5e4ed?w=400', true),
    (cafeteria.id, 'cafeteria', 'Mirinda Chapman', 'Mirinda chapman flavor', 500, 'Drinks', 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=400', true),
    (cafeteria.id, 'cafeteria', 'Mountain Dew', 'Mountain Dew energy drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Cola', 'Bigi cola drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Apple', 'Bigi apple flavored drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Orange', 'Bigi orange flavored drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Chapman', 'Bigi chapman flavor', 500, 'Drinks', 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Ginger Ale', 'Bigi ginger ale', 500, 'Drinks', 'https://images.unsplash.com/photo-1581006652669-0fa97d90d942?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Bitter Lemon', 'Bigi bitter lemon', 500, 'Drinks', 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Soda Water', 'Bigi soda water', 500, 'Drinks', 'https://images.unsplash.com/photo-1520342868574-5fa3804e551c?w=400', true),
    (cafeteria.id, 'cafeteria', 'Bigi Lemon-Lime', 'Bigi lemon-lime drink', 500, 'Drinks', 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400', true);

  END LOOP;
END $$;
