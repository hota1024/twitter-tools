import { Bot } from '@/Bot/Bot'
import { getEnv } from '@/config'
import { Events } from '@/Events/Events'
import { Component } from '@/interfaces/Component'
import { BOT, EVENTS, STORAGE } from '@/keys'
import { AppStorage } from '@/Storage/AppStorage'
import { inject, injectable } from 'tsyringe'
import { FullUser } from 'twitter-d'

/**
 * ActionNotifier class.
 */
@injectable()
export class ActionNotifier implements Component {
  constructor(
    @inject(EVENTS) private events: Events,
    @inject(STORAGE) private storage: AppStorage,
    @inject(BOT) private bot: Bot
  ) {}

  async install(): Promise<void> {
    await this.storage.set(
      'actionFolowers',
      (await this.storage.get('actionFolowers')) ?? 1000
    )
  }

  start(): void {
    this.events.onTweetCreate(async (e) => {
      if (!this.isMe(e.for_user_id)) {
        return
      }

      const actionFollowers = await this.getActionFollowers()

      for (const event of e.tweet_create_events) {
        const isTargetMain = ((event.user as unknown) as FullUser).id_str
        const hasActionFollowers = event.user.followers_count >= actionFollowers
        const isRetweet = !!((event as unknown) as {
          retweeted_status: unknown
        })['retweeted_status']

        if (isTargetMain && hasActionFollowers && isRetweet) {
          this.bot.notify(
            `${
              event.user.screen_name
            } さんにリツイートされました(フォロワー数: ${this.bot.inlineCode(
              event.user.followers_count.toString()
            )})\nユーザー: https://twitter.com/${
              event.user.screen_name
            }\nツイート: https://twitter.com/${event.user.screen_name}/status/${
              event.id_str
            }`
          )
        }
      }
    })

    this.events.onFavorite(async (e) => {
      if (!this.isMe(e.for_user_id)) {
        return
      }

      const actionFollowers = await this.getActionFollowers()

      for (const event of e.favorite_events) {
        const isTargetMain = this.isMe(
          ((event.favorited_status.user as unknown) as FullUser).id_str
        )
        const hasActionFollowers = event.user.followers_count >= actionFollowers

        if (isTargetMain && hasActionFollowers) {
          this.bot.notify(
            `${
              event.user.screen_name
            } さんにいいねされました(フォロワー数: ${this.bot.inlineCode(
              event.user.followers_count.toString()
            )})\nユーザー: https://twitter.com/${
              event.user.screen_name
            }\nツイート: https://twitter.com/${event.user.screen_name}/status/${
              event.favorited_status.id_str
            }`
          )
        }
      }
    })

    this.events.onFollow(async (e) => {
      if (!this.isMe(e.for_user_id)) {
        return
      }

      const actionFollowers = await this.getActionFollowers()

      for (const event of e.follow_events) {
        const isFollow = event.type === 'follow'
        const isTargetMain = event.target.id === getEnv('MAIN_ID', true)
        const hasActionFolowers =
          event.source.followers_count >= actionFollowers

        if (isFollow && isTargetMain && hasActionFolowers) {
          const user = event.source

          this.bot.notify(
            `${
              user.screen_name
            } さんにフォローされました(フォロワー数: ${this.bot.inlineCode(
              user.followers_count.toString()
            )})\nhttps://twitter.com/${user.screen_name}`
          )
        }
      }
    })
  }

  private async getActionFollowers() {
    const actionFolowers = await this.storage.get('actionFolowers')

    if (!actionFolowers) {
      throw new Error('[ActionNotifier] actionFollowers is not defined')
    }

    return actionFolowers
  }

  private isMe(id: string) {
    const isForUser = id === getEnv('MAIN_ID', true)

    return isForUser
  }
}
