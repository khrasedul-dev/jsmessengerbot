import axios from 'axios'
import express from 'express'
import Context from './context.js'
import Markup from './markup.js'
import { sessionStore as defaultSessionStore } from './sessionStore.js'
import session from './session.js'
import { Scene, SceneManager } from './scenes.js'

class MessengerBot {
  catch(fn) {
    this.errorHandler = fn
  }
  hears(patterns, fn) {
    const arr = Array.isArray(patterns) ? patterns : [patterns]
    this.on('message', (ctx) => {
      if (ctx.text) {
        for (const pattern of arr) {
          if (typeof pattern === 'string' && ctx.text.includes(pattern)) {
            fn(ctx)
            return
          } else if (pattern instanceof RegExp && pattern.test(ctx.text)) {
            fn(ctx)
            return
          }
        }
      }
    })
  }

  onPhoto(fn) {
    this.on('message', (ctx) => {
      if (ctx.images && ctx.images.length > 0) fn(ctx)
    })
  }

  onDocument(fn) {
    this.on('message', (ctx) => {
      if (ctx.files && ctx.files.length > 0) fn(ctx)
    })
  }

  onLocation(fn) {
    this.on('message', (ctx) => {
      if (ctx.attachments.some((a) => a.type === 'location')) fn(ctx)
    })
  }

  onContact(fn) {
    this.on('message', (ctx) => {
      if (ctx.attachments.some((a) => a.type === 'contact')) fn(ctx)
    })
  }

  extendContext(fn) {
    this.on('message', (ctx) => fn(ctx))
  }

  onUpdate(fn) {
    // Messenger only supports message and postback events
    this.on('message', fn)
    this.on('postback', fn)
  }
  constructor({
    accessToken,
    verifyToken,
    appSecret,
    apiVersion = 'v18.0',
    sessionStore,
    errorHandler = null,
  }) {
    if (!accessToken || !verifyToken || !appSecret) {
      throw new Error(
        'MessengerBot requires accessToken, verifyToken, and appSecret'
      )
    }
    this.accessToken = accessToken
    this.verifyToken = verifyToken
    this.appSecret = appSecret
    this.apiVersion = apiVersion
    this.app = express()
    this.app.use(express.json())
    this.handlers = { message: [], postback: [] }
    this.middlewares = []
    this.actions = {}
    this.sessionStore = sessionStore || defaultSessionStore // For persistent sessions
    this.errorHandler = errorHandler // For global error handling
  }

  use(fn) {
    this.middlewares.push(fn)
  }

  useErrorHandler(fn) {
    this.errorHandler = fn
  }

  on(event, fn) {
    if (this.handlers[event]) {
      this.handlers[event].push(fn)
    }
  }

  command(cmds, fn) {
    const arr = Array.isArray(cmds) ? cmds : [cmds]
    this.on('message', (ctx) => {
      if (ctx.text) {
        for (const cmd of arr) {
          if (typeof cmd === 'string' && ctx.text === cmd) {
            fn(ctx)
            return
          } else if (cmd instanceof RegExp && cmd.test(ctx.text)) {
            fn(ctx)
            return
          }
        }
      }
    })
  }

  action(payloads, fn) {
    const arr = Array.isArray(payloads) ? payloads : [payloads]
    for (const payload of arr) {
      this.actions[payload] = fn
    }
  }

  async runMiddlewares(ctx) {
    let index = -1
    const runner = async (i) => {
      if (i <= index) return
      index = i
      const fn = this.middlewares[i]
      if (fn) {
        try {
          await fn(ctx, () => runner(i + 1))
        } catch (err) {
          if (this.errorHandler) await this.errorHandler(err, ctx)
          else throw err
        }
      }
    }
    await runner(0)
  }

  async sendMessage(recipientId, message) {
    const payload = typeof message === 'string' ? { text: message } : message
    try {
      return await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/me/messages?access_token=${this.accessToken}`,
        {
          recipient: { id: recipientId },
          message: payload,
        }
      )
    } catch (err) {
      console.error('Error sending message:', err.response?.data || err.message)
    }
  }

  start(port = 3000) {
    this.app.get('/webhook', (req, res) => {
      if (
        req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === this.verifyToken
      ) {
        res.send(req.query['hub.challenge'])
      } else {
        res.sendStatus(403)
      }
    })

    this.app.post('/webhook', async (req, res) => {
      const body = req.body
      if (body.object === 'page') {
        for (const entry of body.entry) {
          const event = entry.messaging[0]
          if (!event || !event.sender || !event.sender.id) {
            continue
          }
          const senderId = event.sender.id
          const ctx = new Context(this, event, senderId)
          // Persistent session support
          if (this.sessionStore) {
            ctx.session = (await this.sessionStore.get(senderId)) || {}
          }
          await this.runMiddlewares(ctx)
          if (event.message && event.message.text) {
            for (const fn of this.handlers.message) await fn(ctx)
          }
          if (event.postback) {
            const payload = event.postback.payload
            if (this.actions[payload]) {
              await this.actions[payload](ctx)
            }
            for (const fn of this.handlers.postback) await fn(ctx)
          }
          // Save session after handling
          if (this.sessionStore) {
            await this.sessionStore.set(senderId, ctx.session)
          }
        }
        res.sendStatus(200)
      } else {
        res.sendStatus(404)
      }
    })

    this.app.listen(port, () => {
      console.log(`🚀 MessengerJS running on port ${port}`)
    })
  }
}

export default MessengerBot
export { Markup, session, Scene, SceneManager }
