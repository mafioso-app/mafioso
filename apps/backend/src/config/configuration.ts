export interface AppConfig {
  port: number
  nodeEnv: string
  webUrl: string
  mobileUrl: string
}

export interface DatabaseConfig {
  url: string
}

export interface RedisConfig {
  url: string
}

export interface JwtConfig {
  accessSecret: string
  refreshSecret: string
  inviteSecret: string
}

export interface Config {
  app: AppConfig
  database: DatabaseConfig
  redis: RedisConfig
  jwt: JwtConfig
}

export default (): Config => ({
  app: {
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    webUrl: process.env['WEB_URL'] ?? 'http://localhost:3000',
    mobileUrl: process.env['MOBILE_URL'] ?? 'http://localhost:8081',
  },
  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  redis: {
    url: process.env['REDIS_URL'] ?? '',
  },
  jwt: {
    accessSecret: process.env['JWT_ACCESS_SECRET'] ?? '',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? '',
    inviteSecret: process.env['INVITE_SECRET'] ?? '',
  },
})

export function validate(config: Record<string, unknown>): Record<string, unknown> {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'INVITE_SECRET',
  ]
  const missing = required.filter((key) => !config[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  return config
}
