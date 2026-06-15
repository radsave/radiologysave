-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Optional: create a read-only reporting user
-- CREATE USER clearscan_readonly WITH PASSWORD 'readonly_pass';
-- GRANT CONNECT ON DATABASE clearscan_db TO clearscan_readonly;
-- GRANT USAGE ON SCHEMA public TO clearscan_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO clearscan_readonly;
