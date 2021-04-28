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

  async start(): Promise<void> {
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

      const timeline = (await this.twitter.get('/statuses/home_timeline.json', {
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
        searched[searched.length - 1].id_str
      )
    }, 60000)
  }

  private async onTweet(tweet: Tweet & { user: { id_str: string } }) {
    try {
      const main = await this.twitter.get('/friendships/show.json', {
        source_id: getEnv('MAIN_ID', true),
        target_id: tweet.user.id_str,
      })

      if (main.relationship.source.following) {
        this.bot.notify(
          `新しいツイートがあります。\nhttps://twitter.com/${tweet.user.id_str}/status/${tweet.id_str}`
        )
        return
      }

      const sub = await this.twitter.get('/friendships/show.json', {
        source_id: getEnv('SUB_ID', true),
        target_id: tweet.user.id_str,
      })

      if (sub.relationship.source.following) {
        this.bot.notify(
          `新しいツイートがあります。\nhttps://twitter.com/${tweet.user.id_str}/status/${tweet.id_str}`
        )
        return
      }
    } catch (e) {
      console.error('[TWEET_WATCHER]', e)
    }
  }
}
