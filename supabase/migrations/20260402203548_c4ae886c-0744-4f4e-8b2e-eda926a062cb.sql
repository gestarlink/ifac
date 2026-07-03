
-- Remove profiles and roles for old duplicate accounts
DELETE FROM user_roles WHERE user_id IN ('e06c4c16-8d23-4865-90c8-e095eeb31b27', '4eb6bf87-f97a-453a-90ed-9054be67bb21', 'a6b55003-154c-49b3-a55a-9f0116994be1');
DELETE FROM profiles WHERE user_id IN ('e06c4c16-8d23-4865-90c8-e095eeb31b27', '4eb6bf87-f97a-453a-90ed-9054be67bb21', 'a6b55003-154c-49b3-a55a-9f0116994be1');

-- Ensure monitor account has proper role
INSERT INTO user_roles (user_id, role) VALUES ('3b4b615f-5b2b-4974-9541-2562a219a27b', 'monitor') ON CONFLICT (user_id, role) DO NOTHING;
