-- Create two specific late night vendor accounts

-- Insert Med Side Late Night Vendor
INSERT INTO vendors (user_id, store_name, description, image_url, vendor_type, is_active, location)
VALUES (
  NULL, -- Will be assigned when a user registers as this vendor
  'Med Side Late Night Vendor',
  'Late night food vendor serving the medical side of campus',
  'https://res.cloudinary.com/dq037nxpn/image/upload/v1733414400/vendor_logos/med_side_late_night_vendor.jpg',
  'late_night',
  true,
  'med_side'
)
ON CONFLICT (store_name) DO NOTHING;

-- Insert Main School Late Night Vendor
INSERT INTO vendors (user_id, store_name, description, image_url, vendor_type, is_active, location)
VALUES (
  NULL, -- Will be assigned when a user registers as this vendor
  'Main School Late Night Vendor',
  'Late night food vendor serving the main school area of campus',
  'https://res.cloudinary.com/dq037nxpn/image/upload/v1733414400/vendor_logos/main_school_late_night_vendor.jpg',
  'late_night',
  true,
  'main_school'
)
ON CONFLICT (store_name) DO NOTHING;