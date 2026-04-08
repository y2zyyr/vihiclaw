import fs from 'fs/promises';
import path from 'path';
import { SessionError } from '../utils/errors.js';
/**
 * JSONL-based session store
 * Each session is a separate JSONL file
 * Each line in the file is a message
 */
export class SessionStore {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    getSessionPath(sessionId) {
        return path.join(this.baseDir, `${sessionId}.jsonl`);
    }
    async initialize() {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
        }
        catch (error) {
            throw new SessionError(`Failed to create session directory: ${error}`);
        }
    }
    async save(session) {
        const filePath = this.getSessionPath(session.id);
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            // Write metadata as first line, then messages
            const lines = [
                JSON.stringify({
                    type: 'metadata',
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                    ...session.metadata,
                }),
                ...session.messages.map((m) => JSON.stringify({ type: 'message', ...m })),
            ];
            await fs.writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
        }
        catch (error) {
            throw new SessionError(`Failed to save session: ${error}`);
        }
    }
    async load(sessionId) {
        const filePath = this.getSessionPath(sessionId);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.trim().split('\n');
            let metadata = null;
            const messages = [];
            for (const line of lines) {
                try {
                    const obj = JSON.parse(line);
                    if (obj.type === 'metadata') {
                        metadata = obj;
                    }
                    else if (obj.type === 'message') {
                        const { type: _type, ...message } = obj;
                        messages.push(message);
                    }
                }
                catch {
                    // Skip invalid lines
                    continue;
                }
            }
            if (!metadata) {
                return null;
            }
            return {
                id: sessionId,
                createdAt: metadata.createdAt || new Date().toISOString(),
                updatedAt: metadata.updatedAt || new Date().toISOString(),
                messages,
                metadata: Object.fromEntries(Object.entries(metadata).filter(([key]) => !['type', 'createdAt', 'updatedAt'].includes(key))),
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw new SessionError(`Failed to load session: ${error}`);
        }
    }
    async appendMessage(sessionId, message) {
        const filePath = this.getSessionPath(sessionId);
        try {
            const line = JSON.stringify({ type: 'message', ...message });
            await fs.appendFile(filePath, line + '\n', 'utf-8');
        }
        catch (error) {
            throw new SessionError(`Failed to append message: ${error}`);
        }
    }
    async updateMetadata(sessionId, metadata) {
        // For simplicity, reload, update, and save
        const session = await this.load(sessionId);
        if (!session) {
            throw new SessionError(`Session not found: ${sessionId}`);
        }
        session.metadata = { ...session.metadata, ...metadata };
        session.updatedAt = new Date().toISOString();
        await this.save(session);
    }
    async list() {
        try {
            const entries = await fs.readdir(this.baseDir);
            return entries
                .filter((f) => f.endsWith('.jsonl'))
                .map((f) => f.replace('.jsonl', ''));
        }
        catch {
            return [];
        }
    }
    async delete(sessionId) {
        const filePath = this.getSessionPath(sessionId);
        try {
            await fs.unlink(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=store.js.map