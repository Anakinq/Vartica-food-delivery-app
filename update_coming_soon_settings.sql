-- =====================================================
-- HOW TO UPDATE COMING SOON SETTINGS
-- =====================================================

-- Run these commands in Supabase SQL Editor to enable/disable Coming Soon

-- OPTION 1: Enable Coming Soon for all three features
UPDATE app_settings SET value = true WHERE id = 'vendors_coming_soon';
UPDATE app_settings SET value = true WHERE id = 'late_night_coming_soon';
UPDATE app_settings SET value = true WHERE id = 'toast_coming_soon';

-- OPTION 2: Enable Coming Soon for specific features only

-- Enable for Vendors only:
UPDATE app_settings SET value = true WHERE id = 'vendors_coming_soon';
UPDATE app_settings SET value = false WHERE id = 'late_night_coming_soon';
UPDATE app_settings SET value = false WHERE id = 'toast_coming_soon';

-- Enable for Late Night only:
UPDATE app_settings SET value = false WHERE id = 'vendors_coming_soon';
UPDATE app_settings SET value = true WHERE id = 'late_night_coming_soon';
UPDATE app_settings SET value = false WHERE id = 'toast_coming_soon';

-- Enable for Toast only:
UPDATE app_settings SET value = false WHERE id = 'vendors_coming_soon';
UPDATE app_settings SET value = false WHERE id = 'late_night_coming_soon';
UPDATE app_settings SET value = true WHERE id = 'toast_coming_soon';

-- OPTION 3: Disable all Coming Soon (show actual content)
UPDATE app_settings SET value = false WHERE id = 'vendors_coming_soon';
UPDATE app_settings SET value = false WHERE id = 'late_night_coming_soon';
UPDATE app_settings SET value = false WHERE id = 'toast_coming_soon';

-- Verify the current settings:
SELECT id, value, description, updated_at FROM app_settings WHERE id LIKE '%coming_soon%';
