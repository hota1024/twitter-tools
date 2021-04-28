import 'reflect-metadata'
import { loadEnv } from './config'
loadEnv()

import { container } from './container'
import { Events } from './Events/Events'
import {
  ACTION_NOTIFIER,
  AUTO_FOLLOW,
  BOT,
  EVENTS,
  TWEET_WATCHER,
} from './keys'
import { Component } from './interfaces/Component'

async function main() {
  const components = [
    container.resolve<Component>(EVENTS),
    container.resolve<Component>(BOT),
    container.resolve<Component>(ACTION_NOTIFIER),
    container.resolve<Component>(AUTO_FOLLOW),
    container.resolve<Component>(TWEET_WATCHER),
  ]

  await Promise.all(components.map((c) => c.install()))

  container.resolve<Events>(EVENTS)

  components.forEach((c) => c.start())
}

main()
