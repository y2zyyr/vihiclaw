import { Session, Message } from '../types/index.js';
/**
 * JSONL-based session store
 * Each session is a separate JSONL file
 * Each line in the file is a message
 */
export declare class SessionStore {
    private baseDir;
    constructor(baseDir: string);
    private getSessionPath;
    initialize(): Promise<void>;
    save(session: Session): Promise<void>;
    load(sessionId: string): Promise<Session | null>;
    appendMessage(sessionId: string, message: Message): Promise<void>;
    updateMetadata(sessionId: string, metadata: Record<string, unknown>): Promise<void>;
    list(): Promise<string[]>;
    delete(sessionId: string): Promise<boolean>;
}
//# sourceMappingURL=store.d.ts.map