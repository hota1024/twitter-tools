import dotenv from 'dotenv'

/**
 * Env type.
 */
export type Env = {
  HOST: string
  PORT: number
  ACTIVITY_ENV: string
  WEBHOOK_URL: string

  GUILD_ID: string
  BOT_TOKEN: string

  API_KEY: string
  API_SECRET: string

  MAIN_ID: string
  MAIN_TOKEN: string
  MAIN_SECRET: string

  SUB_ID: string
  SUB_TOKEN: string
  SUB_SECRET: string

  SESSION_SECRET: string
  DB: string

  REGISTER_ACTIVITY: 0 | 1
}

/**
 * load .env file.
 */
export const loadEnv = (): void => {
  dotenv.config()
}

/**
 * returns env value.
 */
export const getEnv = <K extends keyof Env>(
  key: K,
  asString = false
): Env[K] => {
  const value = process.env[key]

  if (typeof value === 'undefined') {
    throw new TypeError(`getEnv: can not get env item '${key}'.`)
  }

  if (asString) {
    return value as Env[K]
  }

  if (value.match(/^\d+$/)) {
    return parseInt(value) as Env[K]
  }

  return value as Env[K]
}
