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
  followInterval?: number
  lastFetchedTweetId?: string
  searchWord?: string
  enableAutoFollow?: boolean
}

/**
 * AppStorage class.
 */
export class AppStorage extends Storage<AppStorageData> {
  constructor() {
    super(getEnv('DB'))
  }
}
