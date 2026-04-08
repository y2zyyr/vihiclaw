import { Session, Message } from '../types/index.js';
export declare function generateId(): string;
export declare class SessionManager {
    private store;
    constructor(sessionDir: string);
    initialize(): Promise<void>;
    create(): Promise<Session>;
    load(sessionId: string): Promise<Session | null>;
    save(session: Session): Promise<void>;
    addMessage(sessionId: string, message: Message): Promise<void>;
    list(): Promise<string[]>;
    delete(sessionId: string): Promise<boolean>;
}
//# sourceMappingURL=manager.d.ts.map