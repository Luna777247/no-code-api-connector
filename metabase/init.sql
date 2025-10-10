-- Initialize PostgreSQL for Metabase metadata and analytics views
-- This script sets up the necessary schemas and views for better analytics

-- Create schemas for organizing analytics data
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS etl_metrics;

-- Grant permissions
GRANT USAGE ON SCHEMA analytics TO metabase;
GRANT USAGE ON SCHEMA etl_metrics TO metabase;
GRANT CREATE ON SCHEMA analytics TO metabase;
GRANT CREATE ON SCHEMA etl_metrics TO metabase;

-- Create extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analytics tables for ETL data (synced from MongoDB)
CREATE TABLE IF NOT EXISTS analytics.api_connections_summary (
    id SERIAL PRIMARY KEY,
    connection_id VARCHAR(255) UNIQUE NOT NULL,
    connection_name VARCHAR(255) NOT NULL,
    base_url TEXT NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    auth_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_run_at TIMESTAMP,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    avg_response_time_ms NUMERIC(10,2),
    total_records_extracted INTEGER DEFAULT 0,
    total_records_loaded INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS analytics.api_runs_fact (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) UNIQUE NOT NULL,
    connection_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    status VARCHAR(50) NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    records_extracted INTEGER DEFAULT 0,
    records_loaded INTEGER DEFAULT 0,
    error_message TEXT,
    airflow_dag_id VARCHAR(255),
    airflow_run_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics.api_data_quality (
    id SERIAL PRIMARY KEY,
    connection_id VARCHAR(255) NOT NULL,
    run_id VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    null_count INTEGER DEFAULT 0,
    unique_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    null_percentage NUMERIC(5,2) DEFAULT 0,
    sample_values JSONB,
    validation_errors JSONB,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics.schedule_performance (
    id SERIAL PRIMARY KEY,
    connection_id VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL,
    cron_expression VARCHAR(255) NOT NULL,
    expected_run_time TIMESTAMP NOT NULL,
    actual_run_time TIMESTAMP,
    delay_minutes INTEGER,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_runs_connection_id ON analytics.api_runs_fact(connection_id);
CREATE INDEX IF NOT EXISTS idx_api_runs_started_at ON analytics.api_runs_fact(started_at);
CREATE INDEX IF NOT EXISTS idx_api_runs_status ON analytics.api_runs_fact(status);
CREATE INDEX IF NOT EXISTS idx_data_quality_connection_run ON analytics.api_data_quality(connection_id, run_id);
CREATE INDEX IF NOT EXISTS idx_schedule_performance_connection ON analytics.schedule_performance(connection_id);

-- Create views for common analytics queries
CREATE OR replace VIEW analytics.connection_health AS
SELECT 
    c.connection_id,
    c.connection_name,
    c.base_url,
    c.is_active,
    c.total_runs,
    c.successful_runs,
    c.failed_runs,
    CASE 
        WHEN c.total_runs > 0 THEN ROUND((c.successful_runs::NUMERIC / c.total_runs) * 100, 2)
        ELSE 0
    END as success_rate_percentage,
    c.avg_response_time_ms,
    c.last_run_at,
    DATE_PART('day', NOW() - c.last_run_at) as days_since_last_run
FROM analytics.api_connections_summary c
ORDER BY c.total_runs DESC;

CREATE OR replace VIEW analytics.daily_etl_summary AS
SELECT 
    DATE(r.started_at) as run_date,
    COUNT(*) as total_runs,
    COUNT(CASE WHEN r.status = 'success' THEN 1 END) as successful_runs,
    COUNT(CASE WHEN r.status = 'failed' THEN 1 END) as failed_runs,
    COUNT(CASE WHEN r.status = 'partial' THEN 1 END) as partial_runs,
    SUM(r.records_extracted) as total_records_extracted,
    SUM(r.records_loaded) as total_records_loaded,
    AVG(r.duration_ms) as avg_duration_ms,
    COUNT(DISTINCT r.connection_id) as active_connections
FROM analytics.api_runs_fact r
WHERE r.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(r.started_at)
ORDER BY run_date DESC;

CREATE OR replace VIEW analytics.error_analysis AS
SELECT 
    r.connection_id,
    c.connection_name,
    COUNT(*) as error_count,
    r.error_message,
    MAX(r.started_at) as last_error_at,
    COUNT(DISTINCT DATE(r.started_at)) as error_days
FROM analytics.api_runs_fact r
JOIN analytics.api_connections_summary c ON r.connection_id = c.connection_id
WHERE r.status = 'failed' 
    AND r.started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY r.connection_id, c.connection_name, r.error_message
ORDER BY error_count DESC, last_error_at DESC;

CREATE OR replace VIEW analytics.performance_trends AS
SELECT 
    r.connection_id,
    c.connection_name,
    DATE_TRUNC('hour', r.started_at) as hour_bucket,
    COUNT(*) as runs_count,
    AVG(r.duration_ms) as avg_duration_ms,
    AVG(r.records_extracted) as avg_records_extracted,
    AVG(r.records_loaded) as avg_records_loaded,
    STDDEV(r.duration_ms) as duration_stddev
FROM analytics.api_runs_fact r
JOIN analytics.api_connections_summary c ON r.connection_id = c.connection_id
WHERE r.started_at >= CURRENT_DATE - INTERVAL '24 hours'
    AND r.status IN ('success', 'partial')
GROUP BY r.connection_id, c.connection_name, DATE_TRUNC('hour', r.started_at)
ORDER BY hour_bucket DESC;

-- Grant SELECT permissions on views
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO metabase;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA analytics TO metabase;

-- Create function to refresh materialized views (if needed later)
CREATE OR replace FUNCTION analytics.refresh_analytics_views()
RETURNS void AS $$
BEGIN
    -- This function can be called to refresh any materialized views
    -- Currently we use regular views for real-time data
    RAISE NOTICE 'Analytics views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;