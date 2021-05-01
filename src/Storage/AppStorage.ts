import { getEnv } from '@/config'
import { Storage } from './Storage'

/**
 * AppStorageData type.
 */
export type AppStorageData = {
  guildId?: string
  mentionId?: string
  prefix?: string
  notifyChannelId?: string
  actionFolowers?: number
  followQueue?: string[]
  nextFollowAt?: number
  lastFetchedTweetId?: string
  searchWord?: string
}

/**
 * AppStorage class.
 */
export class AppStorage extends Storage<AppStorageData> {
  constructor() {
    super(getEnv('DB'))
  }
}
