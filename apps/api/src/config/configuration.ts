export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  cors: {
    origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: process.env.JWT_ISSUER || 'bookflow-api',
    audience: process.env.JWT_AUDIENCE || 'bookflow-client',
  },
  cookie: {
    refreshCookieName:
      process.env.REFRESH_COOKIE_NAME ||
      (process.env.NODE_ENV === 'production' ? '__Host-bookflow_refresh' : 'bookflow_refresh'),
    refreshExpirationDays: parseInt(process.env.REFRESH_EXPIRATION_DAYS || '7', 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'BookFlow <noreply@bookflow.local>',
  },
  throttler: {
    loginPerMin: parseInt(process.env.RATE_LIMIT_LOGIN_PER_MIN || '10', 10),
    registerPerMin: parseInt(process.env.RATE_LIMIT_REGISTER_PER_MIN || '5', 10),
    forgotPwPerMin: parseInt(process.env.RATE_LIMIT_FORGOT_PW_PER_MIN || '5', 10),
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localPath: process.env.LOCAL_STORAGE_PATH || './storage',
    maxFileSizeMb: parseInt(process.env.MAX_BOOK_FILE_SIZE_MB || '100', 10),
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  },
});
