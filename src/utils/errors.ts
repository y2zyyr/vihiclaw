// 错误类型定义

export class ClawError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ClawError';
  }
}

export class ConfigError extends ClawError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', false);
    this.name = 'ConfigError';
  }
}

export class ProviderError extends ClawError {
  constructor(message: string, retryable: boolean = true) {
    super(message, 'PROVIDER_ERROR', retryable);
    this.name = 'ProviderError';
  }
}

export class ToolError extends ClawError {
  constructor(message: string) {
    super(message, 'TOOL_ERROR', false);
    this.name = 'ToolError';
  }
}

export class SessionError extends ClawError {
  constructor(message: string) {
    super(message, 'SESSION_ERROR', false);
    this.name = 'SessionError';
  }
}

export class PermissionError extends ClawError {
  constructor(message: string) {
    super(message, 'PERMISSION_ERROR', false);
    this.name = 'PermissionError';
  }
}
