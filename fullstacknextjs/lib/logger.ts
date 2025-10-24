import winston from 'winston'
import path from 'path'

// Polyfill setImmediate for Jest environment
if (typeof global.setImmediate === 'undefined') {
  (global as any).setImmediate = (callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(() => callback(...args), 0)
  }
}

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs')

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

// Define colors for each level
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
})

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-connector' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
  ],
})

// If we're not in production then log to the console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        return `${timestamp} [${level}]: ${message} ${metaStr}`
      })
    )
  }))
}

// Helper functions for structured logging
export const logWorkflowStart = (runId: string, connectionId: string, config: any) => {
  logger.info('Workflow execution started', {
    runId,
    connectionId,
    apiUrl: config.apiConfig?.baseUrl,
    method: config.apiConfig?.method,
    parameterCount: config.parameters?.length || 0,
    fieldMappingCount: config.fieldMappings?.length || 0,
    timestamp: new Date().toISOString()
  })
}

export const logWorkflowEnd = (runId: string, status: string, duration: number, stats: any) => {
  logger.info('Workflow execution completed', {
    runId,
    status,
    duration,
    recordsProcessed: stats.recordsProcessed || 0,
    totalRequests: stats.totalRequests || 0,
    successfulRequests: stats.successfulRequests || 0,
    failedRequests: stats.failedRequests || 0,
    timestamp: new Date().toISOString()
  })
}

export const logApiRequest = (runId: string, url: string, method: string, responseTime?: number) => {
  logger.debug('API request executed', {
    runId,
    url,
    method,
    responseTime,
    timestamp: new Date().toISOString()
  })
}

export const logDataProcessing = (runId: string, stage: string, recordCount: number, details?: any) => {
  logger.info('Data processing stage completed', {
    runId,
    stage,
    recordCount,
    details,
    timestamp: new Date().toISOString()
  })
}

export const logError = (runId: string, operation: string, error: Error, context?: any) => {
  logger.error('Operation failed', {
    runId,
    operation,
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })
}

export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString()
  })
}

export const logCircuitBreakerExecution = (breakerName: string, action: string, state: string) => {
  logger.info('Circuit breaker execution', {
    breakerName,
    action,
    state,
    timestamp: new Date().toISOString()
  })
}

export const logCircuitBreakerStateChange = (breakerName: string, fromState: string, toState: string, reason: string) => {
  logger.info('Circuit breaker state changed', {
    breakerName,
    fromState,
    toState,
    reason,
    timestamp: new Date().toISOString()
  })
}
