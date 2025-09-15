// Simple file-based session store
import fs from 'fs'

const SESSION_FILE = 'sessions.json'

/**
 * Safely read sessions from file.
 * @returns {Object<string, any>} - All stored sessions keyed by chat/user ID.
 */
function readSessions() {
  if (!fs.existsSync(SESSION_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
  } catch {
    return {}
  }
}

/**
 * Write sessions to file.
 * @param {Object<string, any>} sessions - All sessions to persist.
 */
function writeSessions(sessions) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2))
}

/**
 * File-based session store implementation.
 * Provides basic get/set/clear for chat/user sessions.
 */
export const sessionStore = {
  /**
   * Get session for a specific user/chat ID.
   * @param {string} id - Unique identifier (chat.id or user.id).
   * @returns {Promise<Object<string, any>>} - The stored session object, or {} if none exists.
   */
  async get(id) {
    const sessions = readSessions()
    return sessions[id] || {}
  },

  /**
   * Save/update session for a specific user/chat ID.
   * @param {string} id - Unique identifier (chat.id or user.id).
   * @param {Object<string, any>} session - Session data to persist.
   * @returns {Promise<void>}
   */
  async set(id, session) {
    const sessions = readSessions()
    sessions[id] = session
    writeSessions(sessions)
  },

  /**
   * Delete session for a specific user/chat ID.
   * @param {string} id - Unique identifier (chat.id or user.id).
   * @returns {Promise<void>}
   */
  async clear(id) {
    const sessions = readSessions()
    delete sessions[id]
    writeSessions(sessions)
  },
}
