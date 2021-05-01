import { getEnv } from '@/config'
import { Component } from '@/interfaces/Component'
import { STORAGE } from '@/keys'
import { AppStorage } from '@/Storage/AppStorage'
import { App, Intents, Message, MessageEmbed, TextChannel } from 'dxn'
import { inject, injectable, singleton } from 'tsyringe'

/**
 * Bot class.
 */
@injectable()
@singleton()
export class Bot extends App implements Component {
  notifyChannel!: TextChannel

  constructor(@inject(STORAGE) private storage: AppStorage) {
    super({
      clientOptions: {
        ws: {
          intents: new Intents([Intents.NON_PRIVILEGED, 'GUILD_MEMBERS']),
        },
      },
    })
  }

  async install(): Promise<void> {
    this.updatePrefix()
    this.setupCommands()
  }

  private setupCommands() {
    this.command(
      'help',
      async (message) => {
        const embed = new MessageEmbed()
          .setTitle('Twitter Tools ヘルプ')
          .setColor('2b00ff')
          .setThumbnail(
            this.client.user?.avatarURL() ??
              'https://cdn.discordapp.com/app-icons/838068782164738058/bd76c69a8da2d5f24ee019b4d0258e9f.png?size=256'
          )
        const prefix = (await this.storage.get('prefix')) ?? '$'

        for (const command of this.commands) {
          embed.addField(
            this.inlineCode(`${prefix}${command.schema}`),
            command.description || '<説明がありません>'
          )
        }

        message.reply(embed)
      },
      'ヘルプを表示します。'
    )

    this.command(
      'main',
      async (message) => {
        const { guild } = message

        if (!guild) {
          message.reply('サーバーで実行してください。')
          return
        }

        await this.storage.set('guildId', guild.id)
        message.reply('このサーバーをメインとして設定しました。')
      },
      'メインで使用するサーバーを設定します。'
    )

    this.command(
      'prefix {prefix: string}',
      async (message, { args }) => {
        await this.storage.set('prefix', args.prefix)
        this.updatePrefix()

        message.reply(
          `プリフィックスを ${this.inlineCode(args.prefix)} に設定しました。`
        )
      },
      'ボットのプリフィックスを設定します。'
    )

    this.command(
      'notify',
      async (message) => {
        this.notifyChannel = message.channel as TextChannel
        this.storage.set('notifyChannelId', message.channel.id)

        message.reply(`このチャンネルを通知用チャンネルに設定しました。`)
      },
      'このコマンドを使用したチャンネルを通知用チャンネルに設定します。'
    )

    this.command(
      'action followers {followers: number}',
      (message, { args }) => {
        if (args.followers < 0) {
          message.reply(
            `フォロワー数は ${this.inlineCode('0')} 以上にしてください。`
          )
          return
        }

        this.storage.set('actionFolowers', args.followers)

        message.reply(
          `メインアカウントにフォローしたユーザーのフォロワー数が ${this.inlineCode(
            args.followers.toString()
          )} 以上なら通知するように設定しました。`
        )
      },
      'メインアカウントがフォローされた時に通知する基準のフォロワー数を設定します。'
    )

    this.command(
      'mention',
      (message) => {
        this.storage.set('mentionId', message.author.id)

        message.reply(
          `通知する際にメンションするユーザーを <@${message.author.id}> に設定しました。`
        )
      },
      '通知する際にメンションするユーザーをこのコマンドを使用したユーザーに設定します。'
    )

    this.command(
      'word {word: string}',
      (message, { args }) => {
        this.storage.set('searchWord', args.word)

        message.reply(
          `ツイートを検索する際に使用するワードを ${this.inlineCode(
            args.word
          )} に指定しました。`
        )
      },
      'ツイートを検索する際に指定するワードを設定します。'
    )

    this.command(
      'status',
      async (message) => {
        const embed = new MessageEmbed()

        const guildId = await this.storage.get('guildId')
        const guild = guildId && (await this.getGuild())
        const prefix = (await this.storage.get('prefix')) ?? '$'
        const mentionId = await this.storage.get('mentionId')
        const notifyChannelId = await this.storage.get('notifyChannelId')
        const actionFolowers = await this.storage.get('actionFolowers')
        const queue = await this.storage.get('followQueue')
        const nextFollowAt = await this.storage.get('nextFollowAt')
        const word = await this.storage.get('searchWord')

        embed.setTitle('状態')
        embed.setColor('#2b00ff')
        embed.setDescription(
          `${this.inlineCode(
            '<自動>'
          )} が設定されている項目は、項目が使用された際にプログラムが自動的に設定します。`
        )

        embed.addField(
          'メインサーバー',
          guild
            ? `**${guild.name}(${this.inlineCode(guild.id)})**`
            : `サーバーが初期化されていません。${this.inlineCode(
                `${prefix}main`
              )} を実行してください。`
        )

        embed.addField(
          'プリフィックス',
          this.inlineCode(prefix ?? '<無し>'),
          true
        )
        embed.addField(
          '通知先メンション',
          mentionId ? `<@${mentionId}>` : this.inlineCode('<自動>'),
          true
        )
        embed.addField(
          '通知先チャンネル',
          notifyChannelId ? `<#${notifyChannelId}>` : this.inlineCode('<自動>'),
          true
        )
        embed.addField(
          'フォローされた時に通知する基準のフォロワー数',
          this.inlineCode(actionFolowers?.toString() ?? '1000')
        )
        embed.addField(
          'フォローキューの長さ',
          this.inlineCode(queue?.length.toString() ?? '<無し>'),
          true
        )
        embed.addField(
          '次のフォローキュー処理',
          this.inlineCode(
            nextFollowAt ? new Date(nextFollowAt).toString() : '<無し>'
          ),
          true
        )
        embed.addField(
          '検索に使用するワード',
          this.inlineCode(word ?? '<無し>')
        )

        message.reply(embed)
      },
      'ボットの状態を表示します。'
    )
  }

  start(): void {
    this.client.on('ready', async () => {
      console.log(`[BOT] ready`)
      this.setupNotifyChannel()

      const prefix = (await this.storage.get('prefix')) ?? '$'
      this.client.user?.setActivity(`${prefix}help`, { type: 'WATCHING' })
    })
    this.login(getEnv('BOT_TOKEN'))
  }

  private async getGuild() {
    return await this.client.guilds.fetch(
      (await this.storage.get('guildId')) || getEnv('GUILD_ID', true)
    )
  }

  private async setupNotifyChannel() {
    let notifyChannelId = await this.storage.get('notifyChannelId')
    const guild = await this.getGuild()

    if (notifyChannelId) {
      const notifyChannel = await this.client.channels.cache.find(
        (c) => c.id === notifyChannelId
      )
      if (!notifyChannel) {
        this.storage.set('notifyChannelId', undefined)
        this.setupNotifyChannel()
        return
      }

      this.notifyChannel = notifyChannel as TextChannel
    } else {
      const firstChannel = await guild.channels.cache.first()

      if (!firstChannel) {
        throw new Error(`[BOT] this guild has not channel.`)
      }

      this.notifyChannel = firstChannel as TextChannel
      notifyChannelId = firstChannel.id
      await this.storage.set('notifyChannelId', notifyChannelId)
    }
  }

  private async updatePrefix() {
    const prefix = (await this.storage.get('prefix')) ?? '$'

    this.removeAllPrefixes()
    this.addPrefix(prefix)
    this.client.user?.setActivity(`${prefix}help`, { type: 'WATCHING' })
  }

  inlineCode(string: string): string {
    return `\`${string}\``
  }

  async notify(content: string): Promise<Message | Message[] | undefined> {
    let mentionId = await this.storage.get('mentionId')

    if (mentionId) {
      return this.notifyChannel.send(`<@${mentionId}>\n${content}`)
    }

    const guild = await this.getGuild()
    const users = await guild.members.fetch()
    const firstUser = await users.filter((u) => !u.user.bot).first()

    await guild.members.fetch()

    if (!firstUser) {
      throw new Error(`[BOT] there is no member in this guild.`)
    }

    mentionId = firstUser.id

    return this.notifyChannel.send(`<@${mentionId}>\n${content}`)
  }
}
