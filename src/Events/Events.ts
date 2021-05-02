import { getEnv } from '@/config'
import { Component } from '@/interfaces/Component'
import { Activity } from 'twict'

/**
 * Events class.
 */
class Events extends Activity implements Component {
  constructor() {
    super(getEnv('ACTIVITY_ENV'), {
      consumerKey: getEnv('API_KEY'),
      consumerSecret: getEnv('API_SECRET'),
      token: getEnv('MAIN_TOKEN'),
      tokenSecret: getEnv('MAIN_SECRET'),
    })
  }

  install(): void {
    return
  }

  async start(): Promise<void> {
    this.listen(getEnv('PORT'))

    // await this.registerWebhook(getEnv('WEBHOOK_URL'))
    // await this.subscribe()
    // await this.subscribe({
    //   token: getEnv('SUB_TOKEN'),
    //   secret: getEnv('SUB_SECRET'),
    // })
  }
}

export { Events }
