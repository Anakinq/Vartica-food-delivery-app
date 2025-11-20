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
    (cafeteria.id, 'cafeteria', 'Jollof Rice', 'Nigerian jollof rice cooked to perfection', 500, 'Rice & Pasta', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/nigerian-jollof-rice-1.jpg', true),
    (cafeteria.id, 'cafeteria', 'White Rice', 'Steamed white rice', 500, 'Rice & Pasta', 'https://www.simplyrecipes.com/thmb/IoNcO7I3JN9g7oHx2dDMz5cH4J0=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-How-to-Make-White-Rice-Lead-2-55da8000f1ee45d9a1013b08fdb72615.jpg', true),
    (cafeteria.id, 'cafeteria', 'Fried Rice', 'Colorful fried rice with vegetables', 500, 'Rice & Pasta', 'https://www.foodandwine.com/thmb/8YcJwNuvLSv1D3lXfzFc2yLB3LI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/chinese-fried-rice-FT-RECIPE0921-2921321321d541f88ac05b7302415301.jpg', true),
    (cafeteria.id, 'cafeteria', 'Ofada Rice', 'Local unpolished rice', 500, 'Rice & Pasta', 'https://i0.wp.com/www.9jafoodie.com/wp-content/uploads/2021/06/ofada-rice-and-stew.jpg', true),
    (cafeteria.id, 'cafeteria', 'Village Rice', 'Traditional village-style rice', 500, 'Rice & Pasta', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/nigerian-coconut-rice.jpg', true),
    (cafeteria.id, 'cafeteria', 'Basmati Rice', 'Premium long-grain basmati rice', 700, 'Rice & Pasta', 'https://www.indianhealthyrecipes.com/wp-content/uploads/2021/08/basmati-rice-recipe.jpg', true),
    (cafeteria.id, 'cafeteria', 'Jollof Spaghetti', 'Jollof-style spaghetti', 400, 'Rice & Pasta', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/jollof-spaghetti.jpg', true),
    (cafeteria.id, 'cafeteria', 'White Spaghetti', 'Plain spaghetti', 400, 'Rice & Pasta', 'https://www.simplyrecipes.com/thmb/1qiRVs4f9LEfZjB5xuI3x932oZ0=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Spaghetti-Bolognese-LEAD-10-03d77d1a1ec74bdfa61cb23252b5e9ce.jpg', true),
    (cafeteria.id, 'cafeteria', 'Stir Fried Spaghetti', 'Stir-fried spaghetti with vegetables', 500, 'Rice & Pasta', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/stir-fried-spaghetti.jpg', true),
    (cafeteria.id, 'cafeteria', 'Beans', 'Cooked beans', 500, 'Rice & Pasta', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/nigerian-beans.jpg', true);

    -- PROTEINS & SIDES
    INSERT INTO menu_items (seller_id, seller_type, name, description, price, category, image_url, is_available) VALUES
    (cafeteria.id, 'cafeteria', 'Chicken & Chips', 'Fried chicken with chips', 4500, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/fried-chicken-and-chips.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chips', 'Crispy french fries', 2000, 'Proteins & Sides', 'https://www.simplyrecipes.com/thmb/HDQxS7cvPuOuRkuxmJ0wQD2d0RU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Homemade-French-Fries-LEAD-3-de9392dc8f0740218813b579b6536cf9.jpg', true),
    (cafeteria.id, 'cafeteria', 'Indomie', 'Instant noodles', 2000, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/indomie-noodles.jpg', true),
    (cafeteria.id, 'cafeteria', 'Moimoi', 'Steamed bean pudding', 600, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/moimoi.jpg', true),
    (cafeteria.id, 'cafeteria', 'Boiled Yam', 'Plain boiled yam', 250, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/boiled-yam.jpg', true),
    (cafeteria.id, 'cafeteria', 'Plantain', 'Fried plantain', 400, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/fried-plantain.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chicken Sauce', 'Rich chicken sauce', 1200, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chicken-sauce.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chicken', 'Fried or grilled chicken', 2500, 'Proteins & Sides', 'https://www.simplyrecipes.com/thmb/8YcJwNuvLSv1D3lXfzFc2yLB3LI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Fried-Chicken-LEAD-4-55da8000f1ee45d9a1013b08fdb72615.jpg', true),
    (cafeteria.id, 'cafeteria', 'Fish', 'Fried fish', 800, 'Proteins & Sides', 'https://www.simplyrecipes.com/thmb/HDQxS7cvPuOuRkuxmJ0wQD2d0RU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Fried-Fish-LEAD-2-55da8000f1ee45d9a1013b08fdb72615.jpg', true),
    (cafeteria.id, 'cafeteria', 'Beef', 'Cooked beef', 500, 'Proteins & Sides', 'https://www.simplyrecipes.com/thmb/HDQxS7cvPuOuRkuxmJ0wQD2d0RU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Beef-Stew-LEAD-2-55da8000f1ee45d9a1013b08fdb72615.jpg', true),
    (cafeteria.id, 'cafeteria', 'Boiled Egg', 'Hard boiled egg', 300, 'Proteins & Sides', 'https://www.simplyrecipes.com/thmb/HDQxS7cvPuOuRkuxmJ0wQD2d0RU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Boiled-Eggs-LEAD-2-55da8000f1ee45d9a1013b08fdb72615.jpg', true),
    (cafeteria.id, 'cafeteria', 'Sausage', 'Fried sausage', 400, 'Proteins & Sides', 'https://www.simplyrecipes.com/thmb/HDQxS7cvPuOuRkuxmJ0wQD2d0RU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Sausage-LEAD-2-55da8000f1ee45d9a1013b08fdb72615.jpg', true),
    (cafeteria.id, 'cafeteria', 'Egg Sauce', 'Scrambled egg sauce', 500, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/egg-sauce.jpg', true),
    (cafeteria.id, 'cafeteria', 'Ofada Sauce', 'Spicy traditional ofada sauce', 300, 'Proteins & Sides', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/ofada-sauce.jpg', true),
    (cafeteria.id, 'cafeteria', 'Salad', 'Fresh vegetable salad', 500, 'Proteins & Sides', 'https://www.simplyrecipes.com/thmb/HDQxS7cvPuOuRkuxmJ0wQD2d0RU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Garden-Salad-LEAD-2-55da8000f1ee45d9a1013b08fdb72615.jpg', true);

    -- DRINKS
    INSERT INTO menu_items (seller_id, seller_type, name, description, price, category, image_url, is_available) VALUES
    (cafeteria.id, 'cafeteria', 'Chapman', 'Mixed fruit cocktail drink', 1000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chapman-drink.jpg', true),
    (cafeteria.id, 'cafeteria', 'Coke', 'Coca-Cola soft drink', 500, 'Drinks', 'https://www.coca-cola.com/content/dam/one/us/en/brands/coca-cola/products/coca-cola-original-20oz-bottle.png', true),
    (cafeteria.id, 'cafeteria', 'Fanta', 'Orange-flavored soft drink', 500, 'Drinks', 'https://www.coca-cola.com/content/dam/one/us/en/brands/fanta/products/fanta-orange-20oz-bottle.png', true),
    (cafeteria.id, 'cafeteria', 'Sprite', 'Lemon-lime soft drink', 500, 'Drinks', 'https://www.coca-cola.com/content/dam/one/us/en/brands/sprite/products/sprite-original-20oz-bottle.png', true),
    (cafeteria.id, 'cafeteria', 'Pepsi', 'Pepsi soft drink', 500, 'Drinks', 'https://www.pepsico.com/images/default-source/products/pepsi/pepsi-bottle-20oz.png', true),
    (cafeteria.id, 'cafeteria', '7UP', '7UP lemon-lime drink', 500, 'Drinks', 'https://www.pepsico.com/images/default-source/products/7up/7up-bottle-20oz.png', true),
    (cafeteria.id, 'cafeteria', 'Mirinda Orange', 'Mirinda orange flavored drink', 500, 'Drinks', 'https://www.pepsico.com/images/default-source/products/mirinda/mirinda-orange-20oz.png', true),
    (cafeteria.id, 'cafeteria', 'Mountain Dew', 'Mountain Dew energy drink', 500, 'Drinks', 'https://www.pepsico.com/images/default-source/products/mountain-dew/mountain-dew-bottle-20oz.png', true),
    (cafeteria.id, 'cafeteria', 'Bigi Cola', 'Bigi cola drink', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/bigi-cola.jpg', true),
    (cafeteria.id, 'cafeteria', 'Hollandia Yoghurt', 'Plain yoghurt', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/hollandia-yoghurt.jpg', true),
    (cafeteria.id, 'cafeteria', 'Hollandia Yoghurt Strawberry', 'Strawberry flavored yoghurt', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/hollandia-yoghurt-strawberry.jpg', true),
    (cafeteria.id, 'cafeteria', 'Hollandia Yoghurt Pineapple/Coconut', 'Pineapple/Coconut flavored yoghurt', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/hollandia-yoghurt-pineapple.jpg', true),
    (cafeteria.id, 'cafeteria', 'Fearless (energy drink)', 'Energy drink', 700, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/fearless-energy-drink.jpg', true),
    (cafeteria.id, 'cafeteria', 'Monster (energy drink)', 'Energy drink', 700, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/monster-energy-drink.jpg', true),
    (cafeteria.id, 'cafeteria', 'Supa Ice Tea', 'Ice tea', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/supa-ice-tea.jpg', true),
    (cafeteria.id, 'cafeteria', 'Fanta Apple', 'Apple-flavored soft drink', 500, 'Drinks', 'https://www.coca-cola.com/content/dam/one/us/en/brands/fanta/products/fanta-apple-20oz-bottle.png', true),
    (cafeteria.id, 'cafeteria', 'Fanta Pineapple', 'Pineapple-flavored soft drink', 500, 'Drinks', 'https://www.coca-cola.com/content/dam/one/us/en/brands/fanta/products/fanta-pineapple-20oz-bottle.png', true),
    (cafeteria.id, 'cafeteria', 'Fanta Blackcurrant', 'Blackcurrant-flavored soft drink', 500, 'Drinks', 'https://www.coca-cola.com/content/dam/one/us/en/brands/fanta/products/fanta-blackcurrant-20oz-bottle.png', true),
    (cafeteria.id, 'cafeteria', 'Mirinda Apple', 'Mirinda apple flavored drink', 500, 'Drinks', 'https://www.pepsico.com/images/default-source/products/mirinda/mirinda-apple-20oz.png', true),
    (cafeteria.id, 'cafeteria', 'Mirinda Pineapple', 'Mirinda pineapple flavored drink', 500, 'Drinks', 'https://www.pepsico.com/images/default-source/products/mirinda/mirinda-pineapple-20oz.png', true),
    (cafeteria.id, 'cafeteria', 'Mirinda Fruity', 'Mirinda fruity flavor', 500, 'Drinks', 'https://www.pepsico.com/images/default-source/products/mirinda/mirinda-fruity-20oz.png', true),
    (cafeteria.id, 'cafeteria', 'Bigi Apple', 'Bigi apple flavored drink', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/bigi-apple.jpg', true),
    (cafeteria.id, 'cafeteria', 'Bigi Tropical', 'Bigi tropical flavored drink', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/bigi-tropical.jpg', true),
    (cafeteria.id, 'cafeteria', 'Bigi Orange', 'Bigi orange flavored drink', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/bigi-orange.jpg', true),
    (cafeteria.id, 'cafeteria', 'Bigi Lemon & Lime', 'Bigi lemon and lime drink', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/bigi-lemon-lime.jpg', true),
    (cafeteria.id, 'cafeteria', 'Bigi Chapman', 'Bigi chapman flavor', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/bigi-chapman.jpg', true),
    (cafeteria.id, 'cafeteria', 'Teem Soda', 'Teem soda drink', 500, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/teem-soda.jpg', true),
    (cafeteria.id, 'cafeteria', 'Malta Guinness (non-alcoholic malt)', 'Non-alcoholic malt drink', 1000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/malta-guinness.jpg', true),
    (cafeteria.id, 'cafeteria', 'Amstel Malta', 'Malt drink', 1000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/amstel-malta.jpg', true),
    (cafeteria.id, 'cafeteria', 'Beta Malt', 'Malt drink', 1000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/beta-malt.jpg', true),
    (cafeteria.id, 'cafeteria', 'Grand Malt', 'Malt drink', 1000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/grand-malt.jpg', true),
    (cafeteria.id, 'cafeteria', 'Maltina (Classic)', 'Classic malt drink', 1000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/maltina-classic.jpg', true),
    (cafeteria.id, 'cafeteria', 'Maltina Pineapple', 'Pineapple flavored malt drink', 1000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/maltina-pineapple.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chivita (Civita)', 'Fruit juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chivita-civita.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chivita Active', 'Active fruit juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chivita-active.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chivita 100%', '100% fruit juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chivita-100.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chivita Ice Tea', 'Ice tea', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chivita-ice-tea.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chivita Exotic', 'Exotic fruit juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chivita-exotic.jpg', true),
    (cafeteria.id, 'cafeteria', 'Five Alive (Pulpy Orange)', 'Pulpy orange juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/five-alive-pulpy-orange.jpg', true),
    (cafeteria.id, 'cafeteria', 'Five Alive (Apple)', 'Apple juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/five-alive-apple.jpg', true),
    (cafeteria.id, 'cafeteria', 'Five Alive (Tropical)', 'Tropical fruit juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/five-alive-tropical.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chi Exotic (Coconut & Pineapple)', 'Coconut and pineapple juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chi-exotic-coconut-pineapple.jpg', true),
    (cafeteria.id, 'cafeteria', 'Chi Exotic (Multifruit)', 'Multifruit juice', 2000, 'Drinks', 'https://www.9jafoodie.com/wp-content/uploads/2021/06/chi-exotic-multifruit.jpg', true);

  END LOOP;
END $$;
