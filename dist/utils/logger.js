import fs from 'fs/promises';
import path from 'path';
export class FileLogger {
    logFile;
    consoleLevel;
    constructor(level = 'info', logDir) {
        this.consoleLevel = this.levelToNumber(level);
        if (logDir) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.logFile = path.join(logDir, `claw-${timestamp}.log`);
            this.ensureLogDir(logDir);
        }
    }
    levelToNumber(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] ?? 1;
    }
    async ensureLogDir(logDir) {
        try {
            await fs.mkdir(logDir, { recursive: true });
        }
        catch {
            // ignore
        }
    }
    async writeToFile(level, message, meta) {
        if (!this.logFile)
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta
        };
        try {
            await fs.appendFile(this.logFile, JSON.stringify(entry) + '\n');
        }
        catch {
            // ignore file write errors
        }
    }
    log(level, message, meta) {
        const levelNum = this.levelToNumber(level);
        if (levelNum >= this.consoleLevel) {
            const colors = {
                debug: '\x1b[90m',
                info: '\x1b[36m',
                warn: '\x1b[33m',
                error: '\x1b[31m'
            };
            const reset = '\x1b[0m';
            console.error(`${colors[level]}[${level.toUpperCase()}]${reset} ${message}`);
        }
        this.writeToFile(level, message, meta);
    }
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    error(message, meta) {
        this.log('error', message, meta);
    }
}
export function createLogger(level, logDir) {
    return new FileLogger(level, logDir);
}
//# sourceMappingURL=logger.js.map