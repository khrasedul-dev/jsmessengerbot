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
class Scene {
  constructor(name, steps) {
    this.name = name
    this.steps = steps
  }

  async enter(ctx) {
    ctx.session.__scene = this.name
    ctx.session.step = 0
    ctx.scene = this
    await this.handle(ctx)
  }

  async leave(ctx) {
    Object.keys(ctx.session).forEach((k) => {
      delete ctx.session[k]
    })
    ctx.scene = null
    ctx._sceneStopped = true
  }

  async handle(ctx) {
    let step = typeof ctx.session.step === 'number' ? ctx.session.step : 0
    if (step < this.steps.length) {
      const prevStep = step
      const result = await this.steps[step](ctx)
      if (ctx.session.step === prevStep && ctx.text && result !== false) {
        ctx.session.step++
      }
    } else {
      await this.leave(ctx)
    }
  }
}

class SceneManager {
  constructor({ sessionStoreType = 'memory', sessionFilePath } = {}) {
    this.scenes = {}
    if (sessionStoreType === 'file') {
      this.sessionStore = new FileSessionStore(sessionFilePath)
    } else {
      this.sessionStore = new MemorySessionStore()
    }
  }

  register(scene) {
    this.scenes[scene.name] = scene
  }

  middleware() {
    return async (ctx, next) => {
      // Attach session from store
      const id = ctx.chat?.id || ctx.from?.id || 'default'
      ctx.session = await this.sessionStore.get(id)
      const sceneName = ctx.session.__scene
      let handled = false
      if (sceneName && this.scenes[sceneName] && !ctx._sceneStopped) {
        ctx.scene = this.scenes[sceneName]
        await this.scenes[sceneName].handle(ctx)
        handled = true
      }
      if (!handled) {
        await next()
      }
      // Save session after handling
      await this.sessionStore.set(id, ctx.session)
    }
  }

  enter(name) {
    return async (ctx) => {
      const scene = this.scenes[name]
      if (scene) await scene.enter(ctx)
    }
  }
}

export { Scene, SceneManager }
