-- Seed script for users table with 100,000+ records
-- This script generates realistic data spread over 7+ days

INSERT INTO users (name, email, created_at, updated_at, is_deleted) 
SELECT 
  'User ' || seq AS name,
  'user' || seq || '@example.com' AS email,
  NOW() - INTERVAL '7 days' + (seq::int % (7 * 24 * 3600))::int * INTERVAL '1 second' AS created_at,
  NOW() - INTERVAL '7 days' + (seq::int % (7 * 24 * 3600))::int * INTERVAL '1 second' + (RANDOM() * 1000)::int * INTERVAL '1 second' AS updated_at,
  CASE WHEN seq::int % 100 = 0 THEN true ELSE false END AS is_deleted
FROM generate_series(1, 100000) AS seq
ON CONFLICT DO NOTHING;

-- Verify the data
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as deleted_users FROM users WHERE is_deleted = TRUE;
SELECT MIN(created_at), MAX(created_at) FROM users;
