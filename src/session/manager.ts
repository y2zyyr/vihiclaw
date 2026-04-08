import { Session, Message } from '../types/index.js';
import { SessionStore } from './store.js';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

export class SessionManager {
  private store: SessionStore;

  constructor(sessionDir: string) {
    this.store = new SessionStore(sessionDir);
  }

  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  async create(): Promise<Session> {
    const session: Session = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      metadata: {},
    };

    await this.store.save(session);
    return session;
  }

  async load(sessionId: string): Promise<Session | null> {
    return this.store.load(sessionId);
  }

  async save(session: Session): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await this.store.save(session);
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
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

  async list(): Promise<string[]> {
    return this.store.list();
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.store.delete(sessionId);
  }
}
