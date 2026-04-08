// 错误类型定义
export class ClawError extends Error {
    code;
    retryable;
    constructor(message, code, retryable = false) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.name = 'ClawError';
    }
}
export class ConfigError extends ClawError {
    constructor(message) {
        super(message, 'CONFIG_ERROR', false);
        this.name = 'ConfigError';
    }
}
export class ProviderError extends ClawError {
    constructor(message, retryable = true) {
        super(message, 'PROVIDER_ERROR', retryable);
        this.name = 'ProviderError';
    }
}
export class ToolError extends ClawError {
    constructor(message) {
        super(message, 'TOOL_ERROR', false);
        this.name = 'ToolError';
    }
}
export class SessionError extends ClawError {
    constructor(message) {
        super(message, 'SESSION_ERROR', false);
        this.name = 'SessionError';
    }
}
export class PermissionError extends ClawError {
    constructor(message) {
        super(message, 'PERMISSION_ERROR', false);
        this.name = 'PermissionError';
    }
}
//# sourceMappingURL=errors.js.map