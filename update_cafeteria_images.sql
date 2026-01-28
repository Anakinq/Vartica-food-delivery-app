-- Update cafeteria records with Supabase storage URLs

UPDATE cafeterias 
SET image_url = 'https://jbqhbuogmxqzotlorahn.supabase.co/storage/v1/object/public/vendor-logos/caf%201p.png'
WHERE name = 'Cafeteria 1';

UPDATE cafeterias 
SET image_url = 'https://jbqhbuogmxqzotlorahn.supabase.co/storage/v1/object/public/vendor-logos/caf%202.png'
WHERE name = 'Cafeteria 2';

UPDATE cafeterias 
SET image_url = 'https://jbqhbuogmxqzotlorahn.supabase.co/storage/v1/object/public/vendor-logos/staff%20caf.png'
WHERE name = 'Staff Cafeteria';

UPDATE cafeterias 
SET image_url = 'https://jbqhbuogmxqzotlorahn.supabase.co/storage/v1/object/public/vendor-logos/captain%20cook.png'
WHERE name = 'Captain Cook';

UPDATE cafeterias 
SET image_url = 'https://jbqhbuogmxqzotlorahn.supabase.co/storage/v1/object/public/vendor-logos/med%20caf.jpeg'
WHERE name = 'Med Cafeteria';

UPDATE cafeterias 
SET image_url = 'https://jbqhbuogmxqzotlorahn.supabase.co/storage/v1/object/public/vendor-logos/smoothie%20shack.png'
WHERE name = 'Smoothie Shack';

-- Note: If "Seasons Deli" is also part of your cafeteria list, you can add it too:
-- UPDATE cafeterias 
-- SET image_url = 'YOUR_SEASONS_DELI_IMAGE_URL'
-- WHERE name = 'Seasons Deli';