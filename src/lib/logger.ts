import winston from 'winston'
import { env } from './env'

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaStr}`
  })
)

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'development' ? devFormat : logFormat,
  defaultMeta: { service: 'enterprise-admin' },
  transports: [
    new winston.transports.Console(),
    // Add file transports for production
    ...(env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ] : [])
  ],
})

// Create audit logger for security events
export const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'enterprise-admin-audit' },
  transports: [
    new winston.transports.File({ filename: 'logs/audit.log' }),
    ...(env.NODE_ENV === 'development' ? [new winston.transports.Console()] : [])
  ],
})

export default logger