import { getEnv } from '@/config'
import { Component } from '@/interfaces/Component'
import e from 'express'
import { Activity } from 'twict'

/**
 * Events class.
 */
class Events extends Activity implements Component {
  express!: e.Express

  constructor() {
    super(getEnv('ACTIVITY_ENV'), {
      consumerKey: getEnv('API_KEY'),
      consumerSecret: getEnv('API_SECRET'),
      token: getEnv('MAIN_TOKEN'),
      tokenSecret: getEnv('MAIN_SECRET'),
    })
  }

  async install(): Promise<void> {
    this.express = await this.listen(getEnv('PORT'))
    return
  }

  async start(): Promise<void> {
    // await this.registerWebhook(getEnv('WEBHOOK_URL'))
    // await this.subscribe()
    // await this.subscribe({
    //   token: getEnv('SUB_TOKEN'),
    //   secret: getEnv('SUB_SECRET'),
    // })
  }
}

export { Events }
