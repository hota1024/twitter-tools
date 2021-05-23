import { Bot } from '@/Bot/Bot'
import { getEnv } from '@/config'
import { Events } from '@/Events/Events'
import { Component } from '@/interfaces/Component'
import { EVENTS, STORAGE, BOT } from '@/keys'
import { AppStorage } from '@/Storage/AppStorage'
import { CronJob } from 'cron'
import { inject, injectable } from 'tsyringe'
import Twitter from 'twitter'
import { FullUser } from 'twitter-d'

/**
 * AutoFollow class.
 */
@injectable()
export class AutoFollow implements Component {
  private readonly twitter = new Twitter({
    consumer_key: getEnv('API_KEY'),
    consumer_secret: getEnv('API_SECRET'),
    access_token_key: getEnv('SUB_TOKEN'),
    access_token_secret: getEnv('SUB_SECRET'),
  })

  constructor(
    @inject(EVENTS) private events: Events,
    @inject(STORAGE) private storage: AppStorage,
    @inject(BOT) private bot: Bot
  ) {}

  async install(): Promise<void> {
    await this.storage.set(
      'followQueue',
      (await this.storage.get('followQueue')) ?? []
    )
    await this.storage.set(
      'enableAutoFollow',
      (await this.storage.get('enableAutoFollow')) ?? false
    )
  }

  start(): void {
    this.events.onFavorite(async (e) => {
      if (await this.isAutoFollowDisabled()) {
        return
      }

      if (!this.isMe(e.for_user_id)) {
        return
      }

      for (const event of e.favorite_events) {
        this.addQueueIfCanFollow(event.user.id_str)
      }
    })

    this.events.onTweetCreate(async (e) => {
      if (await this.isAutoFollowDisabled()) {
        return
      }

      if (!this.isMe(e.for_user_id)) {
        return
      }

      for (const event of e.tweet_create_events) {
        const isTargetMain = this.isMe(
          ((event.user as unknown) as FullUser).id_str
        )
        const isRetweet = !!((event as unknown) as {
          retweeted_status: unknown
        })['retweeted_status']

        if (isTargetMain && isRetweet) {
          this.addQueueIfCanFollow(((event.user as unknown) as FullUser).id_str)
        }
      }
    })

    const job = new CronJob('*/4 * * * *', () => {
      this.processQueue(1)

      this.storage.set('nextFollowAt', job.nextDate().toDate().getTime())
    })

    this.storage.set('nextFollowAt', job.nextDate().toDate().getTime())
    job.start()
  }

  /**
   * process follow queue.
   *
   * @param count max following count.
   */
  public async processQueue(count: number): Promise<void> {
    for (
      let i = 0;
      i <
      Math.min(
        count,
        (await this.storage.get('followQueue'))?.length ?? Infinity
      );
      ++i
    ) {
      if (!(await this.storage.get('enableAutoFollow'))) {
        break
      }

      const queue = await this.storage.get('followQueue')
      if (!queue) {
        console.error('[AUTO_FOLLOW] followQueue is not defined')
        break
      }

      if (!queue[i]) {
        console.error(`[AUTO_FOLLOW] queue[${i}] is not defined`)
        break
      }

      const id = queue.shift()
      const account = await this.twitter
        .get('/users/show.json', {
          user_id: id,
        })
        .then((v) => v as FullUser)
        .catch((e) => {
          console.error('[BOT]', e)

          return {
            screen_name: void 0,
          }
        })

      const accountName = account.screen_name || '`unknown`'

      try {
        await this.twitter.post('/friendships/create.json', {
          user_id: id,
        })
        this.bot.notify(
          `サブアカウントで ${accountName} さんをフォローしました。\nhttps://twitter.com/${accountName}`
        )
        await this.storage.set('followQueue', queue)
      } catch {
        this.bot.notify(
          `${accountName} さんのフォローに失敗しました。\nhttps://twitter.com/${accountName}`
        )
      }
    }
  }

  private async isMe(id: string) {
    const isForUser = id === getEnv('MAIN_ID', true)

    return isForUser
  }

  private async isAutoFollowDisabled() {
    const enableAutoFollow = await this.storage.get('enableAutoFollow')

    return !enableAutoFollow
  }

  private async addQueueIfCanFollow(id: string) {
    if (id === getEnv('SUB_ID', true)) {
      return
    }

    try {
      const res = await this.twitter.get('/friendships/show.json', {
        source_id: getEnv('SUB_ID', true),
        target_id: id,
      })

      if (!res.relationship.source.following) {
        try {
          this.addQueue(id)
        } catch (e) {
          console.error('[BOT]', e)
        }
      }
    } catch {
      try {
        this.addQueue(id)
      } catch (e) {
        console.error('[BOT]', e)
      }
    }
  }

  /**
   * add follow queue with user id.
   *
   * @param id user id.
   */
  async addQueue(id: string): Promise<void> {
    const queue = await this.storage.get('followQueue')

    if (typeof queue === 'undefined') {
      throw this.createFollowQueueUndefinedError()
    }

    if (queue.includes(id)) {
      return
    }

    queue.push(id)

    await this.storage.set('followQueue', queue)
  }

  private createFollowQueueUndefinedError(): Error {
    return new Error(`[AUTO_FOLLOW] followQueue is undefined.`)
  }
}
