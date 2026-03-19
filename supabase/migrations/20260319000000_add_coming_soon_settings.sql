-- Migration: Add Coming Soon settings for Vendors, Late Night, and Toast features
-- This allows showing "Coming Soon" for entire sections instead of hiding them

-- Create app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    value BOOLEAN DEFAULT false,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Anyone can read app settings"
    ON app_settings FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to update settings
CREATE POLICY "Service role can manage app settings"
    ON app_settings FOR ALL
    TO service_role
    USING (true);

-- Insert or update Coming Soon settings
-- Set to true to show "Coming Soon" for that section
-- Set to false to show the actual content

INSERT INTO app_settings (id, value, description) VALUES
    ('vendors_coming_soon', false, 'Show Coming Soon for Vendors tab instead of actual vendors')
ON CONFLICT (id) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO app_settings (id, value, description) VALUES
    ('late_night_coming_soon', false, 'Show Coming Soon for Late Night Vendors tab instead of actual vendors')
ON CONFLICT (id) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO app_settings (id, value, description) VALUES
    ('toast_coming_soon', false, 'Show Coming Soon for Toast tab instead of actual toast vendors')
ON CONFLICT (id) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Grant permissions
GRANT SELECT ON app_settings TO authenticated, anon;
GRANT ALL ON app_settings TO service_role;

-- Verify settings
SELECT id, value, description FROM app_settings WHERE id LIKE '%coming_soon%';
