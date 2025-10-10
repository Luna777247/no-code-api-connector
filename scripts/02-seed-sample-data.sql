-- Insert sample API connection
INSERT INTO api_connections (id, name, description, base_url, method, headers, auth_type, is_active)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'JSONPlaceholder Users API',
    'Sample API for testing - fetches user data',
    'https://jsonplaceholder.typicode.com/users',
    'GET',
    '{"Content-Type": "application/json"}',
    'none',
    true
  );

-- Insert sample parameters
INSERT INTO api_parameters (connection_id, param_name, param_type, mode, values, is_required)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'id',
    'query',
    'list',
    '["1", "2", "3"]',
    false
  );

-- Insert sample field mappings
INSERT INTO api_field_mappings (connection_id, source_path, target_field, data_type, is_selected)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '$.id', 'user_id', 'number', true),
  ('550e8400-e29b-41d4-a716-446655440000', '$.name', 'user_name', 'string', true),
  ('550e8400-e29b-41d4-a716-446655440000', '$.email', 'user_email', 'string', true),
  ('550e8400-e29b-41d4-a716-446655440000', '$.phone', 'user_phone', 'string', true),
  ('550e8400-e29b-41d4-a716-446655440000', '$.company.name', 'company_name', 'string', true);

-- Insert sample schedule
INSERT INTO api_schedules (connection_id, schedule_type, cron_expression, is_active, next_run_at)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440000',
    'daily',
    '0 0 * * *',
    true,
    NOW() + INTERVAL '1 day'
  );
