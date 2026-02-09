-- Fix missing profiles and chat_messages RLS policies
-- Run in Supabase SQL Editor

-- === STEP 1: Create profiles for users who don't have them ===
INSERT INTO profiles (id, email, full_name, role)
SELECT 
  auth.users.id,
  auth.users.email,
  COALESCE(auth.users.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(auth.users.raw_user_meta_data->>'role', 'customer')::text
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.users.id
);

-- Verify profiles created
SELECT COUNT(*) as profile_count FROM profiles;

-- === STEP 2: Enable RLS on chat_messages table ===
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- === STEP 3: Create RLS policies for chat_messages ===
-- Users can view their own chat messages
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert their own chat messages
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their own chat messages
DROP POLICY IF EXISTS "Users can update own chat messages" ON chat_messages;
CREATE POLICY "Users can update own chat messages" ON chat_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- === STEP 4: Verify chat_messages policies ===
SELECT 'Chat messages RLS policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'chat_messages';
