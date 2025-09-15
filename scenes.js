import fs from 'fs'

/**
 * In-memory session store for fast, temporary storage.
 * Ideal for development or short-lived apps.
 */
class MemorySessionStore {
  constructor() {
    this.sessions = {}
  }

  /** Retrieve a session by ID */
  async get(id) {
    return this.sessions[id] || {}
  }

  /** Save a session by ID */
  async set(id, session) {
    this.sessions[id] = session
  }

  /** Clear a session by ID */
  async clear(id) {
    delete this.sessions[id]
  }
}

/**
 * File-based session store for persistence across restarts.
 * Sessions are stored as JSON in the given file.
 */
class FileSessionStore {
  constructor(filePath = 'sessions.json') {
    this.filePath = filePath
    // Ensure the file exists
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, '{}')
  }

  /** Internal: read sessions JSON file */
  _read() {
    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'))
  }

  /** Internal: write sessions JSON file */
  _write(sessions) {
    fs.writeFileSync(this.filePath, JSON.stringify(sessions, null, 2))
  }

  /** Retrieve a session by ID */
  async get(id) {
    const sessions = this._read()
    return sessions[id] || {}
  }

  /** Save a session by ID */
  async set(id, session) {
    const sessions = this._read()
    sessions[id] = session
    this._write(sessions)
  }

  /** Clear a session by ID */
  async clear(id) {
    const sessions = this._read()
    delete sessions[id]
    this._write(sessions)
  }
}

/**
 * A Scene is a multi-step conversation flow.
 * Each scene has a name and an ordered list of step handlers.
 */
class Scene {
  constructor(name, steps) {
    this.name = name
    this.steps = steps
  }

  /** Enter a scene, reset step index, and start handling */
  async enter(ctx) {
    ctx.session.__scene = this.name
    ctx.session.step = 0
    ctx.scene = this
    await this.handle(ctx)
  }

  /** Leave a scene and clear session state */
  async leave(ctx) {
    Object.keys(ctx.session).forEach((k) => {
      delete ctx.session[k]
    })
    ctx.scene = null
    ctx._sceneStopped = true
  }

  /** Run the current step handler and advance if not blocked */
  async handle(ctx) {
    let step = typeof ctx.session.step === 'number' ? ctx.session.step : 0
    if (step < this.steps.length) {
      const prevStep = step
      const result = await this.steps[step](ctx)
      // Auto-increment if user sent text and step didn’t manually change
      if (ctx.session.step === prevStep && ctx.text && result !== false) {
        ctx.session.step++
      }
    } else {
      // Scene completed
      await this.leave(ctx)
    }
  }
}

/**
 * Manages multiple scenes and sessions.
 * Provides middleware for attaching session/scene handling to a bot.
 */
class SceneManager {
  constructor({ sessionStoreType = 'memory', sessionFilePath } = {}) {
    this.scenes = {}
    // Choose session store type
    if (sessionStoreType === 'file') {
      this.sessionStore = new FileSessionStore(sessionFilePath)
    } else {
      this.sessionStore = new MemorySessionStore()
    }
  }

  /** Register a scene with the manager */
  register(scene) {
    this.scenes[scene.name] = scene
  }

  /**
   * Middleware for session + scene handling.
   * Should be added to the bot’s middleware chain.
   */
  middleware() {
    return async (ctx, next) => {
      // Load session from store
      const id = ctx.chat?.id || ctx.from?.id || 'default'
      ctx.session = await this.sessionStore.get(id)

      const sceneName = ctx.session.__scene
      let handled = false

      // Continue current scene if active
      if (sceneName && this.scenes[sceneName] && !ctx._sceneStopped) {
        ctx.scene = this.scenes[sceneName]
        await this.scenes[sceneName].handle(ctx)
        handled = true
      }

      // Pass to next middleware if no scene handled it
      if (!handled) {
        await next()
      }

      // Save updated session
      await this.sessionStore.set(id, ctx.session)
    }
  }

  /** Helper to enter a specific scene by name */
  enter(name) {
    return async (ctx) => {
      const scene = this.scenes[name]
      if (scene) await scene.enter(ctx)
    }
  }
}

export { Scene, SceneManager }
