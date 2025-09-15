import axios from 'axios'
import express from 'express'
import Context from './context.js'
import Markup from './markup.js'
import { Scene, SceneManager } from './scenes.js'
import session from './session.js'
import { sessionStore as defaultSessionStore } from './sessionStore.js'

/**
 * MessengerBot - A framework for building Facebook Messenger bots.
 * Provides routing, middleware, session, and scene support.
 */
class MessengerBot {
  /**
   * Set a global error handler for the bot.
   * @param {(error: Error, ctx: Context) => void|Promise<void>} fn - Error handler function
   */
  catch(fn) {
    this.errorHandler = fn
  }

  /**
   * Register a handler that triggers when a message text matches a pattern.
   * @param {string|RegExp|string[]|RegExp[]} patterns - String or RegExp pattern(s) to match
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback function
   */
  hears(patterns, fn) {
    const arr = Array.isArray(patterns) ? patterns : [patterns]
    this.on('message', async (ctx) => {
      if (ctx.text) {
        for (const pattern of arr) {
          if (typeof pattern === 'string' && ctx.text.includes(pattern)) {
            await fn(ctx)
            return true
          } else if (pattern instanceof RegExp && pattern.test(ctx.text)) {
            await fn(ctx)
            return true
          }
        }
      }
      return false
    })
  }

  /**
   * Listen for photo messages.
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback when a photo is received
   */
  onPhoto(fn) {
    this.on('message', (ctx) => {
      if (ctx.images && ctx.images.length > 0) fn(ctx)
    })
  }

  /**
   * Listen for document/file messages.
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback when a document is received
   */
  onDocument(fn) {
    this.on('message', (ctx) => {
      if (ctx.files && ctx.files.length > 0) fn(ctx)
    })
  }

  /**
   * Listen for location messages.
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback when a location is received
   */
  onLocation(fn) {
    this.on('message', (ctx) => {
      if (ctx.attachments.some((a) => a.type === 'location')) fn(ctx)
    })
  }

  /**
   * Listen for contact messages.
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback when a contact is received
   */
  onContact(fn) {
    this.on('message', (ctx) => {
      if (ctx.attachments.some((a) => a.type === 'contact')) fn(ctx)
    })
  }

  /**
   * Extend the context dynamically.
   * @param {(ctx: Context) => void} fn - Function to extend context
   */
  extendContext(fn) {
    this.on('message', (ctx) => fn(ctx))
  }

  /**
   * Handle all update events (messages + postbacks).
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback for any update
   */
  onUpdate(fn) {
    this.on('message', fn)
    this.on('postback', fn)
  }

  /**
   * Create a MessengerBot instance.
   * @param {object} options
   * @param {string} options.accessToken - Facebook Page Access Token
   * @param {string} options.verifyToken - Webhook Verify Token
   * @param {string} options.appSecret - Facebook App Secret
   * @param {string} [options.apiVersion='v18.0'] - Graph API version
   * @param {object} [options.sessionStore] - Custom session store (defaults to in-memory)
   * @param {(error: Error, ctx: Context) => void|Promise<void>} [options.errorHandler] - Global error handler
   */
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
    this.sessionStore = sessionStore || defaultSessionStore
    this.errorHandler = errorHandler
  }

  /**
   * Register a middleware function.
   * @param {(ctx: Context, next: Function) => void|Promise<void>} fn - Middleware function
   */
  use(fn) {
    this.middlewares.push(fn)
  }

  /**
   * Register a global error handler.
   * @param {(error: Error, ctx: Context) => void|Promise<void>} fn - Error handler
   */
  useErrorHandler(fn) {
    this.errorHandler = fn
  }

  /**
   * Register an event handler.
   * @param {'message'|'postback'} event - Event type
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback function
   */
  on(event, fn) {
    if (this.handlers[event]) {
      this.handlers[event].push(fn)
    }
  }

  /**
   * Register a command handler (exact text or regex).
   * @param {string|RegExp|string[]|RegExp[]} cmds - Commands or regex patterns
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback when matched
   */
  command(cmds, fn) {
    const arr = Array.isArray(cmds) ? cmds : [cmds]
    this.on('message', async (ctx) => {
      if (ctx.text) {
        for (const cmd of arr) {
          if (typeof cmd === 'string' && ctx.text === cmd) {
            await fn(ctx)
            return true
          } else if (cmd instanceof RegExp && cmd.test(ctx.text)) {
            await fn(ctx)
            return true
          }
        }
      }
      return false
    })
  }

  /**
   * Register a postback action handler.
   * @param {string|string[]} payloads - Postback payload(s)
   * @param {(ctx: Context) => void|Promise<void>} fn - Callback when triggered
   */
  action(payloads, fn) {
    const arr = Array.isArray(payloads) ? payloads : [payloads]
    for (const payload of arr) {
      this.actions[payload] = fn
    }
  }

  /**
   * Run all registered middlewares for a context.
   * @param {Context} ctx - Context object
   */
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

  /**
   * Send a message to a user.
   * @param {string} recipientId - Messenger PSID
   * @param {string|object} message - Text string or Messenger payload
   * @returns {Promise<object>} - API response
   */
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

  /**
   * Start the Messenger webhook server.
   * @param {number} [port=3000] - Port to listen on
   */
  start(port = 3000) {
    // Webhook verification endpoint
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

    // Webhook event handler
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

          // Load session
          if (this.sessionStore) {
            ctx.session = (await this.sessionStore.get(senderId)) || {}
          }

          await this.runMiddlewares(ctx)
          let handled = false

          // Handle messages
          if (event.message && event.message.text) {
            for (const fn of this.handlers.message) {
              if (!handled) {
                const result = await fn(ctx)
                if (result === true) handled = true
              }
            }
          }

          // Handle postbacks
          if (event.postback) {
            const payload = event.postback.payload
            if (this.actions[payload]) {
              const result = await this.actions[payload](ctx)
              if (result === true) handled = true
            }
            for (const fn of this.handlers.postback) {
              if (!handled) {
                const result = await fn(ctx)
                if (result === true) handled = true
              }
            }
          }

          // Save session
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
export { Markup, Scene, SceneManager, session }
