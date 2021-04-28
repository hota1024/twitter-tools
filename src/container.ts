import { container } from 'tsyringe'
import { ActionNotifier } from './ActionNotifier/ActionNotifier'
import { AutoFollow } from './AutoFollow/AutoFollow'
import { Bot } from './Bot/Bot'
import { Events } from './Events/Events'
import {
  ACTION_NOTIFIER,
  BOT,
  STORAGE,
  EVENTS,
  AUTO_FOLLOW,
  TWEET_WATCHER,
} from './keys'
import { AppStorage } from './Storage/AppStorage'
import { TweetWatcher } from './TweetWatcher/TweetWatcher'

container.register(STORAGE, {
  useClass: AppStorage,
})

container.registerSingleton(BOT, Bot)
container.register(EVENTS, { useValue: new Events() })
container.register(ACTION_NOTIFIER, { useClass: ActionNotifier })
container.register(AUTO_FOLLOW, { useClass: AutoFollow })
container.register(TWEET_WATCHER, { useClass: TweetWatcher })

export { container }
