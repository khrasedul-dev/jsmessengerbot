class Context {
  constructor(bot, event, senderId) {
    this.bot = bot
    this.chat = { id: senderId }
    this.text = event.message?.text
    this.event = event
    this.session = {} // filled by session middleware
    this.scene = null // filled by stage middleware
    // Support for attachments (images, files, etc.)
    this.attachments = event.message?.attachments || []
    this.images = this.attachments.filter((a) => a.type === 'image')
    this.files = this.attachments.filter(
      (a) => a.type === 'file' || a.type === 'audio' || a.type === 'video'
    )
    this.pdfs = this.attachments.filter(
      (a) => a.type === 'file' && a.payload?.url?.endsWith('.pdf')
    )
  }

  async reply(textOrPayload) {
    return this.bot.sendMessage(this.chat.id, textOrPayload)
  }

  async replyWithPhoto(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'image',
        payload: { url },
      },
    })
  }

  async replyWithDocument(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'file',
        payload: { url },
      },
    })
  }

  async replyWithAudio(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'audio',
        payload: { url },
      },
    })
  }

  async replyWithVideo(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'video',
        payload: { url },
      },
    })
  }

  extend(key, value) {
    this[key] = value
  }
}

export default Context
