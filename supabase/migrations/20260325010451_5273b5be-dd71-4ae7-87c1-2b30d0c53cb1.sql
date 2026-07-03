
-- Create logos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to logos
CREATE POLICY "Public read logos" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Auth upload logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos');
