class Markup {
  static urlButton(text, url) {
    return { type: 'web_url', title: text, url }
  }
  // Telegraf-style keyboard: array of rows, each row is array of button objects
  static keyboard(buttonRows, text) {
    // Flatten rows for Messenger quick replies
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

  static inlineKeyboard(buttons, text) {
    // Messenger uses button templates for inline keyboards
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
            // Default to postback
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

  static button(text, payload) {
    return { text, payload }
  }

  // Reply helpers for all types
  static replyWithPhoto(url) {
    return {
      attachment: {
        type: 'image',
        payload: { url },
      },
    }
  }

  static replyWithDocument(url) {
    return {
      attachment: {
        type: 'file',
        payload: { url },
      },
    }
  }

  static replyWithAudio(url) {
    return {
      attachment: {
        type: 'audio',
        payload: { url },
      },
    }
  }

  static replyWithVideo(url) {
    return {
      attachment: {
        type: 'video',
        payload: { url },
      },
    }
  }

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
