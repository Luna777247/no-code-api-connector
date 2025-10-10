-- API Connections Table
CREATE TABLE IF NOT EXISTS api_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_url TEXT NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  headers JSONB DEFAULT '{}',
  auth_type VARCHAR(50), -- none, bearer, basic, api_key
  auth_config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  is_active BOOLEAN DEFAULT true
);

-- API Parameters Table
CREATE TABLE IF NOT EXISTS api_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES api_connections(id) ON DELETE CASCADE,
  param_name VARCHAR(255) NOT NULL,
  param_type VARCHAR(50) NOT NULL, -- query, path, body, header
  mode VARCHAR(50) NOT NULL, -- list, cartesian, template, dynamic
  values JSONB, -- Array of values for list/cartesian mode
  template TEXT, -- Template string for template mode
  dynamic_config JSONB, -- Configuration for dynamic parameters
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Schedules Table
CREATE TABLE IF NOT EXISTS api_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES api_connections(id) ON DELETE CASCADE,
  schedule_type VARCHAR(50) NOT NULL, -- once, daily, weekly, monthly, cron
  cron_expression VARCHAR(255),
  schedule_config JSONB, -- Additional schedule configuration
  is_active BOOLEAN DEFAULT true,
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Field Mappings Table
CREATE TABLE IF NOT EXISTS api_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES api_connections(id) ON DELETE CASCADE,
  source_path VARCHAR(500) NOT NULL, -- JSONPath to field in API response
  target_field VARCHAR(255) NOT NULL, -- Target column name
  data_type VARCHAR(50), -- string, number, boolean, date, json
  transform_rule TEXT, -- Transformation logic
  is_selected BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Runs Table
CREATE TABLE IF NOT EXISTS api_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES api_connections(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES api_schedules(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL, -- pending, running, success, failed, partial
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  records_extracted INTEGER DEFAULT 0,
  records_loaded INTEGER DEFAULT 0,
  error_message TEXT,
  run_metadata JSONB DEFAULT '{}'
);

-- API Run Logs Table
CREATE TABLE IF NOT EXISTS api_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES api_runs(id) ON DELETE CASCADE,
  log_level VARCHAR(50) NOT NULL, -- info, warning, error, debug
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Request Details Table (for tracking individual requests in a run)
CREATE TABLE IF NOT EXISTS api_request_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES api_runs(id) ON DELETE CASCADE,
  request_url TEXT NOT NULL,
  request_params JSONB,
  request_headers JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  response_size_bytes INTEGER,
  is_successful BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API Data Raw Table (stores raw API responses)
CREATE TABLE IF NOT EXISTS api_data_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES api_runs(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES api_connections(id) ON DELETE CASCADE,
  request_params JSONB,
  response_data JSONB NOT NULL,
  extracted_at TIMESTAMP DEFAULT NOW()
);

-- API Data Transformed Table (stores transformed data ready for analytics)
CREATE TABLE IF NOT EXISTS api_data_transformed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data_id UUID REFERENCES api_data_raw(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES api_connections(id) ON DELETE CASCADE,
  transformed_data JSONB NOT NULL,
  transformed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_connections_active ON api_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_api_parameters_connection ON api_parameters(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_schedules_connection ON api_schedules(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_schedules_next_run ON api_schedules(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_runs_connection ON api_runs(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_runs_status ON api_runs(status);
CREATE INDEX IF NOT EXISTS idx_api_runs_started ON api_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_run_logs_run ON api_run_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_api_request_details_run ON api_request_details(run_id);
CREATE INDEX IF NOT EXISTS idx_api_data_raw_run ON api_data_raw(run_id);
CREATE INDEX IF NOT EXISTS idx_api_data_raw_connection ON api_data_raw(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_data_transformed_connection ON api_data_transformed(connection_id);
