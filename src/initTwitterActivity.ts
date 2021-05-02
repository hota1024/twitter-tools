import { getEnv, loadEnv } from './config'
loadEnv()
import { Activity } from 'twict'

async function main() {
  const activity = new Activity(getEnv('ACTIVITY_ENV'), {
    consumerKey: getEnv('API_KEY'),
    consumerSecret: getEnv('API_SECRET'),
    token: getEnv('MAIN_TOKEN'),
    tokenSecret: getEnv('MAIN_SECRET'),
  })

  await activity.deleteAllWebhooks()
}

main()
