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

  async reply(textOrPayload, markup) {
    if (markup && typeof markup === 'object') {
      // Messenger quick replies
      if (markup.quick_replies) {
        return this.bot.sendMessage(this.chat.id, {
          text: textOrPayload,
          quick_replies: markup.quick_replies,
        })
      }
      // Messenger inline keyboard (button template)
      if (
        markup.attachment &&
        markup.attachment.payload?.template_type === 'button'
      ) {
        // Ensure text is set in the button template
        markup.attachment.payload.text = textOrPayload
        return this.bot.sendMessage(this.chat.id, markup)
      }
      // Other Messenger templates
      if (markup.attachment) {
        return this.bot.sendMessage(this.chat.id, markup)
      }
    }
    // Fallback: send as before
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
