// options: {
//   key: 'session', // where to store session on ctx
//   namespace: 'scene', // optional namespace
//   exclude: ['temp'], // keys to exclude from persistence
//   ttl: 3600 // session expiry in seconds
// }
import fs from 'fs'

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

class FileSessionStore {
  constructor(filePath = 'sessions.json') {
    this.filePath = filePath
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, '{}')
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

export default function session(options = {}) {
  const { type = 'memory' } = options
  // Always use sessions.json in project root for file store
  const store =
    type === 'file'
      ? new FileSessionStore('sessions.json')
      : new MemorySessionStore()
  type === 'file' ? new FileSessionStore(filePath) : new MemorySessionStore()
  return async (ctx, next) => {
    const chatId = ctx.chat?.id || ctx.from?.id || 'default'
    ctx.session = await store.get(chatId)
    await next()
    await store.set(chatId, ctx.session)
  }
}
