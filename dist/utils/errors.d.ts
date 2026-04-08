export declare class ClawError extends Error {
    code: string;
    retryable: boolean;
    constructor(message: string, code: string, retryable?: boolean);
}
export declare class ConfigError extends ClawError {
    constructor(message: string);
}
export declare class ProviderError extends ClawError {
    constructor(message: string, retryable?: boolean);
}
export declare class ToolError extends ClawError {
    constructor(message: string);
}
export declare class SessionError extends ClawError {
    constructor(message: string);
}
export declare class PermissionError extends ClawError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map