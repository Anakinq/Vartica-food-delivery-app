-- Add file attachment support to chat messages

-- Add columns to chat_messages table for file attachments
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create a storage bucket for chat file attachments
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('chat-attachments', 'chat-attachments', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the chat-attachments bucket
CREATE POLICY "Allow authenticated users to upload chat attachments" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Allow authenticated users to read chat attachments" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Allow authenticated users to update their own chat attachments" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Allow authenticated users to delete their own chat attachments" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments');