import { SessionStore } from './store.js';
export function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}
export class SessionManager {
    store;
    constructor(sessionDir) {
        this.store = new SessionStore(sessionDir);
    }
    async initialize() {
        await this.store.initialize();
    }
    async create() {
        const session = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
            metadata: {},
        };
        await this.store.save(session);
        return session;
    }
    async load(sessionId) {
        return this.store.load(sessionId);
    }
    async save(session) {
        session.updatedAt = new Date().toISOString();
        await this.store.save(session);
    }
    async addMessage(sessionId, message) {
        const session = await this.load(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.messages.push(message);
        session.updatedAt = new Date().toISOString();
        // Append to file instead of rewriting
        await this.store.appendMessage(sessionId, message);
        await this.store.updateMetadata(sessionId, { updatedAt: session.updatedAt });
    }
    async list() {
        return this.store.list();
    }
    async delete(sessionId) {
        return this.store.delete(sessionId);
    }
}
//# sourceMappingURL=manager.js.map