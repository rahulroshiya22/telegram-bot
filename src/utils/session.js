/**
 * Simple in-memory session storage
 * Note: Data is lost on bot restart. For production, use a database.
 */
class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    /**
     * Get user session
     * @param {number} userId 
     * @returns {object}
     */
    getSession(userId) {
        if (!this.sessions.has(userId)) {
            this.sessions.set(userId, {
                model: 'google/gemini-2.5-flash-lite-preview-09-2025', // Default text model
                mode: 'chat', // 'chat', 'logo_gen'
                logoModel: 'flux' // 'flux', 'turbo', 'pixart'
            });
        }
        return this.sessions.get(userId);
    }

    /**
     * Update user model preference
     * @param {number} userId 
     * @param {string} modelId 
     */
    setModel(userId, modelId) {
        const session = this.getSession(userId);
        session.model = modelId;
        this.sessions.set(userId, session);
    }

    setMode(userId, mode) {
        const session = this.getSession(userId);
        session.mode = mode;
        this.sessions.set(userId, session);
    }
}

module.exports = new SessionManager();
