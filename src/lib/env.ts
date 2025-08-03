import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  
  // Password Hashing
  HASH_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  
  // OTP Configuration
  OTP_ENABLED: z.string().transform(val => val === 'true').default('false'),
  OTP_EXPIRY_MINUTES: z.string().transform(Number).pipe(z.number().min(1).max(60)).default('10'),
  
  // SMS Configuration
  SMS_PROVIDER: z.enum(['twilio', 'aws-sns']).optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Email Configuration
  EMAIL_PROVIDER: z.enum(['smtp', 'aws-ses']).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number()).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // AWS Configuration
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_CLOUDFRONT_DOMAIN: z.string().optional(),
  
  // Redis Configuration
  REDIS_URL: z.string().url().optional(),
  
  // Application Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Security
  RATE_LIMIT_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default('900000'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().min(1024)).default('10485760'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif'),
  
  // Backup Configuration
  BACKUP_ENABLED: z.string().transform(val => val === 'true').default('true'),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().min(1)).default('30'),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  
  // Feature Flags
  FEATURE_PAYROLL_ENABLED: z.string().transform(val => val === 'true').default('true'),
  FEATURE_INVENTORY_ENABLED: z.string().transform(val => val === 'true').default('true'),
  FEATURE_PROCUREMENT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  FEATURE_ACCOUNTING_ENABLED: z.string().transform(val => val === 'true').default('true'),
  FEATURE_WORKFLOWS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  FEATURE_NOTIFICATIONS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  FEATURE_REPORTING_ENABLED: z.string().transform(val => val === 'true').default('true'),
})

export type Env = z.infer<typeof envSchema>

let env: Env

try {
  env = envSchema.parse(process.env)
} catch (error) {
  console.error('❌ Invalid environment variables:', error)
  process.exit(1)
}

export { env }