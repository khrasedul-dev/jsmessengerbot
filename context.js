/**
 * Context class for handling Messenger events.
 * Provides convenient helpers for replying and accessing event/session data.
 * Used internally by the bot framework to wrap Messenger webhook events.
 */
class Context {
  /**
   * Create a new Context instance.
   * @param {object} bot - Bot instance used for sending messages.
   * @param {object} event - Messenger webhook event object.
   * @param {string} senderId - Sender's Messenger PSID (chat ID).
   */
  constructor(bot, event, senderId) {
    /**
     * Reference to the bot instance.
     * @type {object}
     */
    this.bot = bot

    /**
     * Chat object containing the Messenger PSID.
     * @type {{id: string}}
     */
    this.chat = { id: senderId }

    /**
     * Message text from the user (if available).
     * @type {string|undefined}
     */
    this.text = event.message?.text

    /**
     * Raw Messenger webhook event.
     * @type {object}
     */
    this.event = event

    /**
     * Session data (populated by session middleware).
     * @type {object}
     */
    this.session = {}

    /**
     * Scene state (populated by stage middleware).
     * @type {object|null}
     */
    this.scene = null

    /**
     * All message attachments (images, files, etc).
     * @type {Array<object>}
     */
    this.attachments = event.message?.attachments || []

    /**
     * Filtered image attachments.
     * @type {Array<object>}
     */
    this.images = this.attachments.filter((a) => a.type === 'image')

    /**
     * Filtered file/audio/video attachments.
     * @type {Array<object>}
     */
    this.files = this.attachments.filter(
      (a) => a.type === 'file' || a.type === 'audio' || a.type === 'video'
    )

    /**
     * Filtered PDF attachments.
     * @type {Array<object>}
     */
    this.pdfs = this.attachments.filter(
      (a) => a.type === 'file' && a.payload?.url?.endsWith('.pdf')
    )
  }

  /**
   * Reply to the user with text, quick replies, or Messenger templates.
   * @param {string|object} textOrPayload - Text message or Messenger payload object.
   * @param {object} [markup] - Optional markup object (quick replies or templates).
   * @returns {Promise<void>}
   */
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

    // Fallback: send plain text
    return this.bot.sendMessage(this.chat.id, textOrPayload)
  }

  /**
   * Reply with a photo attachment.
   * @param {string} url - Image URL.
   * @returns {Promise<void>}
   */
  async replyWithPhoto(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'image',
        payload: { url },
      },
    })
  }

  /**
   * Reply with a document/file attachment.
   * @param {string} url - File URL.
   * @returns {Promise<void>}
   */
  async replyWithDocument(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'file',
        payload: { url },
      },
    })
  }

  /**
   * Reply with an audio attachment.
   * @param {string} url - Audio file URL.
   * @returns {Promise<void>}
   */
  async replyWithAudio(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'audio',
        payload: { url },
      },
    })
  }

  /**
   * Reply with a video attachment.
   * @param {string} url - Video file URL.
   * @returns {Promise<void>}
   */
  async replyWithVideo(url) {
    return this.bot.sendMessage(this.chat.id, {
      attachment: {
        type: 'video',
        payload: { url },
      },
    })
  }

  /**
   * Extend the context with a custom property.
   * @param {string} key - Property name.
   * @param {*} value - Property value.
   */
  extend(key, value) {
    this[key] = value
  }
}

export default Context
