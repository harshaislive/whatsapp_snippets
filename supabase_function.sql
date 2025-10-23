-- Create a PostgreSQL function to efficiently get unique group names
-- This should be run in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_unique_group_names()
RETURNS TABLE (group_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ws.group_name::TEXT
  FROM whatsapp_snippets ws
  WHERE ws.group_name IS NOT NULL
  ORDER BY ws.group_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unique_group_names() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unique_group_names() TO anon;
