// 核心类型定义

export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  content: string;
  error?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CompletionParams {
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface CompletionResult {
  content: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
}

export interface StreamChunk {
  content?: string;
  toolCall?: Partial<ToolCall>;
  usage?: TokenUsage;
  done?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  metadata: Record<string, unknown>;
}

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'paused'
  | 'done'
  | 'error';

export interface ToolContext {
  sessionId: string;
  logger: Logger;
  dryRun: boolean;
  workingDir: string;
  allowedShellCommands?: string[];
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface ClawConfig {
  provider: 'anthropic' | 'openai' | 'local';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxIterations: number;
  temperature: number;
  maxTokens?: number;
  dryRun: boolean;
  confirmDestructive: boolean;
  allowedShellCommands: string[];
  blockedPaths: string[];
  sessionDir: string;
  logDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  streamResponse: boolean;
  saveSession: boolean;
}
