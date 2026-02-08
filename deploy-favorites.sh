#!/bin/bash
# Deploy favorites functionality to Supabase

echo "Deploying favorites functionality to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Link to your Supabase project (if not already linked)
echo "Linking to Supabase project..."
supabase link

# Deploy the migration
echo "Deploying migration..."
supabase db push

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the favorites functionality in your app"
echo "2. Verify the new tables and functions exist in your Supabase dashboard"
echo "3. Make sure RLS policies are working correctly"