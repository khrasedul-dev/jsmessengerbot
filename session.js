// Session middleware for Messenger/Telegram-style bots

import fs from 'fs'

/**
 * In-memory session store.
 * Fast but volatile — resets on process restart.
 */
class MemorySessionStore {
  constructor() {
    this.sessions = {}
  }

  async get(id) {
    return this.sessions[id] || {}
  }

  async set(id, session) {
    this.sessions[id] = session
  }

  async clear(id) {
    delete this.sessions[id]
  }
}

/**
 * File-based session store.
 * Stores sessions as JSON in a file (default: sessions.json).
 * Persists across restarts but slower than memory.
 */
class FileSessionStore {
  constructor(filePath = 'sessions.json') {
    this.filePath = filePath
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '{}')
    }
  }

  _read() {
    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
  }

  _write(sessions) {
    fs.writeFileSync(this.filePath, JSON.stringify(sessions, null, 2))
  }

  async get(id) {
    const sessions = this._read()
    return sessions[id] || {}
  }

  async set(id, session) {
    const sessions = this._read()
    sessions[id] = session
    this._write(sessions)
  }

  async clear(id) {
    const sessions = this._read()
    delete sessions[id]
    this._write(sessions)
  }
}

/**
 * Session middleware factory.
 * Attaches ctx.session and persists it between requests.
 *
 * @param {object} options - Configuration options
 * @param {'memory'|'file'} [options.type='memory'] - Store type
 * @param {string} [options.key='session'] - Property name on ctx
 * @returns {function} Middleware function (ctx, next)
 *
 * @example
 * import session from './session.js'
 * bot.use(session({ type: 'file' }))
 */
export default function session(options = {}) {
  const { type = 'memory', key = 'session' } = options

  // Use memory or file session store
  const store =
    type === 'file' ? new FileSessionStore('sessions.json') : new MemorySessionStore()

  return async (ctx, next) => {
    const chatId = ctx.chat?.id || ctx.from?.id || 'default'

    // Attach session to ctx
    ctx[key] = await store.get(chatId)

    await next()

    // Save updated session
    await store.set(chatId, ctx[key])
  }
}
