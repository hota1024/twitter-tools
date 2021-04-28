import Keyv from 'keyv'

/**
 * Storage class.
 */
export class Storage<T extends Record<string, unknown>> {
  private db: Keyv

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(uri: string) {
    this.db = new Keyv(uri)
  }

  set<K extends keyof T>(key: K, value: T[K], ttl?: number): Promise<true> {
    return this.db.set(key as string, value, ttl)
  }

  get<K extends keyof T>(key: K): Promise<T[K]> {
    return this.db.get(key as string)
  }
}
