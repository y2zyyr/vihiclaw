import { type Logger } from '../types/index.js';
export declare class FileLogger implements Logger {
    private logFile?;
    private consoleLevel;
    constructor(level?: 'debug' | 'info' | 'warn' | 'error', logDir?: string);
    private levelToNumber;
    private ensureLogDir;
    private writeToFile;
    private log;
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}
export declare function createLogger(level: 'debug' | 'info' | 'warn' | 'error', logDir?: string): Logger;
//# sourceMappingURL=logger.d.ts.map