/**
 * Markup - Utility class for building Messenger keyboards, buttons, and reply attachments.
 * Inspired by Telegraf-style Markup but adapted for Messenger Platform.
 */
class Markup {
  /**
   * Create a web URL button.
   * @param {string} text - Button title
   * @param {string} url - Target URL
   * @returns {object} Messenger web_url button object
   */
  static urlButton(text, url) {
    return { type: 'web_url', title: text, url }
  }

  /**
   * Create a Messenger quick reply keyboard.
   * Telegraf-style: array of rows → flattened into quick_replies.
   * @param {Array<Array<object|string>>} buttonRows - Rows of buttons (text or { text, payload })
   * @param {string} text - Message text
   * @returns {object} Messenger quick_replies object
   */
  static keyboard(buttonRows, text) {
    const flatButtons = buttonRows.flat().map((btn) => ({
      content_type: 'text',
      title: btn.text || btn,
      payload: btn.payload || btn.text || btn,
    }))
    return {
      text,
      quick_replies: flatButtons,
    }
  }

  /**
   * Create an inline keyboard (Messenger button template).
   * @param {Array<object>} buttons - Array of button objects ({ type, title/text, url, payload })
   * @param {string} text - Message text
   * @returns {object} Messenger button template payload
   */
  static inlineKeyboard(buttons, text) {
    return {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text,
          buttons: buttons.map((btn) => {
            if (btn.type === 'web_url') {
              return {
                type: 'web_url',
                title: btn.title,
                url: btn.url,
              }
            }
            return {
              type: 'postback',
              title: btn.text || btn.title,
              payload: btn.payload || btn.text || btn.title,
            }
          }),
        },
      },
    }
  }

  /**
   * Create a simple postback button.
   * @param {string} text - Button label
   * @param {string} payload - Postback payload
   * @returns {object} Messenger postback button
   */
  static button(text, payload) {
    return { text, payload }
  }

  /**
   * Build a photo reply payload.
   * @param {string} url - Image URL
   * @returns {object} Messenger image attachment
   */
  static replyWithPhoto(url) {
    return {
      attachment: {
        type: 'image',
        payload: { url },
      },
    }
  }

  /**
   * Build a document reply payload.
   * @param {string} url - File URL
   * @returns {object} Messenger file attachment
   */
  static replyWithDocument(url) {
    return {
      attachment: {
        type: 'file',
        payload: { url },
      },
    }
  }

  /**
   * Build an audio reply payload.
   * @param {string} url - Audio file URL
   * @returns {object} Messenger audio attachment
   */
  static replyWithAudio(url) {
    return {
      attachment: {
        type: 'audio',
        payload: { url },
      },
    }
  }

  /**
   * Build a video reply payload.
   * @param {string} url - Video URL
   * @returns {object} Messenger video attachment
   */
  static replyWithVideo(url) {
    return {
      attachment: {
        type: 'video',
        payload: { url },
      },
    }
  }

  /**
   * Create a quick reply menu from simple text options.
   * @param {string[]} options - Array of quick reply labels
   * @param {string} text - Message text
   * @returns {object} Messenger quick_replies object
   */
  static keyboardReply(options, text) {
    return {
      text,
      quick_replies: options.map((opt) => ({
        content_type: 'text',
        title: opt,
        payload: opt,
      })),
    }
  }
}

export default Markup
