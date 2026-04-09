/**
 * Multi-Session Manager / 多會話管理器
 * Phase 2 Round 14 - Manage multiple concurrent sessions / 管理多個並發會話
 */

import { SessionManager } from './manager.js';
import { Session } from '../types/index.js';

export interface SessionGroup {
  id: string;
  name: string;
  sessionIds: string[];
  createdAt: string;
}

export class MultiSessionManager {
  private sessionManager: SessionManager;
  private activeSessions: Map<string, Session> = new Map();
  private groups: Map<string, SessionGroup> = new Map();

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  async createSession(): Promise<Session> {
    const session = await this.sessionManager.create();
    this.activeSessions.set(session.id, session);
    return session;
  }

  async loadSession(sessionId: string): Promise<Session | null> {
    const session = await this.sessionManager.load(sessionId);
    if (session) {
      this.activeSessions.set(sessionId, session);
    }
    return session;
  }

  getActiveSession(sessionId: string): Session | undefined {
    return this.activeSessions.get(sessionId);
  }

  listActiveSessions(): Session[] {
    return Array.from(this.activeSessions.values());
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      await this.sessionManager.save(session);
      this.activeSessions.delete(sessionId);
    }
  }

  createGroup(name: string): SessionGroup {
    const group: SessionGroup = {
      id: `group-${Date.now()}`,
      name,
      sessionIds: [],
      createdAt: new Date().toISOString(),
    };
    this.groups.set(group.id, group);
    return group;
  }

  addToGroup(groupId: string, sessionId: string): void {
    const group = this.groups.get(groupId);
    if (group && !group.sessionIds.includes(sessionId)) {
      group.sessionIds.push(sessionId);
    }
  }

  getGroup(groupId: string): SessionGroup | undefined {
    return this.groups.get(groupId);
  }

  listGroups(): SessionGroup[] {
    return Array.from(this.groups.values());
  }
}
