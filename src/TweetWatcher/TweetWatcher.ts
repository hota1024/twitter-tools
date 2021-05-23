import { Bot } from '@/Bot/Bot'
import { getEnv } from '@/config'
import { Events } from '@/Events/Events'
import { Component } from '@/interfaces/Component'
import { BOT, EVENTS, STORAGE } from '@/keys'
import { AppStorage } from '@/Storage/AppStorage'
import { inject, injectable } from 'tsyringe'
import { Tweet } from 'twict'
import Twitter from 'twitter'

/**
 * TweetWatcher class.
 */
@injectable()
export class TweetWatcher implements Component {
  private twitter!: Twitter

  constructor(
    @inject(EVENTS) private events: Events,
    @inject(STORAGE) private storage: AppStorage,
    @inject(BOT) private bot: Bot
  ) {}

  async install(): Promise<void> {
    this.twitter = new Twitter({
      consumer_key: getEnv('API_KEY'),
      consumer_secret: getEnv('API_SECRET'),
      access_token_key: getEnv('MAIN_TOKEN'),
      access_token_secret: getEnv('MAIN_SECRET'),
    })
  }

  start(): void {
    const main = new Twitter({
      consumer_key: getEnv('API_KEY'),
      consumer_secret: getEnv('API_SECRET'),
      access_token_key: getEnv('MAIN_TOKEN'),
      access_token_secret: getEnv('MAIN_SECRET'),
    })
    const sub = new Twitter({
      consumer_key: getEnv('API_KEY'),
      consumer_secret: getEnv('API_SECRET'),
      access_token_key: getEnv('SUB_TOKEN'),
      access_token_secret: getEnv('SUB_SECRET'),
    })

    this.watch(main)
    this.watch(sub)
  }

  watch(twitter: Twitter): void {
    setInterval(async () => {
      const word = await this.storage.get('searchWord')

      if (!word || word === '') {
        return
      }

      const additionalParamas: { since_id?: string } = {}
      const lastFetchedTweetId = await this.storage.get('lastFetchedTweetId')

      if (lastFetchedTweetId) {
        additionalParamas.since_id = lastFetchedTweetId
      }

      const timeline = (await twitter.get('/statuses/home_timeline.json', {
        count: 200,
        ...additionalParamas,
      })) as Tweet[]
      const searched = timeline.filter((t) => t.text.includes(word))

      for (const tweet of searched) {
        this.bot.notify(
          `新しい ${this.bot.inlineCode(
            word
          )} を含むツイートがあります。\nhttps://twitter.com/${
            tweet.user.screen_name
          }/status/${tweet.id_str}`
        )
      }

      if (searched.length === 0) {
        return
      }

      await this.storage.set(
        'lastFetchedTweetId',
        timeline.map((t) => t.id_str).sort()[timeline.length - 1]
      )
    }, 60000)
  }
}
