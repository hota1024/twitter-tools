import { Bot } from '@/Bot/Bot'
import { getEnv } from '@/config'
import { Events } from '@/Events/Events'
import { waitFor } from '@/helpers/waitFor'
import { Component } from '@/interfaces/Component'
import { EVENTS, STORAGE, BOT } from '@/keys'
import { AppStorage } from '@/Storage/AppStorage'
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

    this.updateQueue()
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

  private async updateQueue() {
    if (!this.bot.notifyChannel) {
      this.requestUpdateQueue(1000)
      return
    }

    const queue = await this.storage.get('followQueue')

    if (typeof queue === 'undefined') {
      throw this.createFollowQueueUndefinedError()
    }

    if (queue.length === 0) {
      this.requestUpdateQueue(1000)
      return
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
      await waitFor(216000000)
      await this.twitter.post('/friendships/create.json', {
        user_id: id,
      })
      this.bot.notify(
        `サブアカウントで ${accountName} さんをフォローしました。\nhttps://twitter.com/${accountName}`
      )
      await this.storage.set('followQueue', queue)
      this.requestUpdateQueue(216000)
    } catch {
      this.bot.notify(
        `${accountName} さんのフォローに失敗しました。\nhttps://twitter.com/${accountName}`
      )
      this.requestUpdateQueue(60000)
    }
  }

  private requestUpdateQueue(timeout: number) {
    this.storage.set('nextFollowAt', Date.now() + timeout)
    setTimeout(() => this.updateQueue(), timeout)
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
