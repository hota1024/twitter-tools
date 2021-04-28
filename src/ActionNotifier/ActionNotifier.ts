import { Bot } from '@/Bot/Bot'
import { getEnv } from '@/config'
import { Events } from '@/Events/Events'
import { Component } from '@/interfaces/Component'
import { BOT, EVENTS, STORAGE } from '@/keys'
import { AppStorage } from '@/Storage/AppStorage'
import { inject, injectable } from 'tsyringe'

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
    this.events.onFollow(async (e) => {
      const actionFolowers = (await this.storage.get(
        'actionFolowers'
      )) as number
      const isForUser = e.for_user_id === getEnv('MAIN_ID', true)

      if (!isForUser) {
        return
      }

      for (const event of e.follow_events) {
        const isFollow = event.type === 'follow'
        const isTargetMain = event.target.id === getEnv('MAIN_ID', true)
        const hasActionFolowers = event.source.followers_count >= actionFolowers

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
    return
  }
}
