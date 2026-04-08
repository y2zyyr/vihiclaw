import { AgentState, ToolCall, ToolResult } from '../types/index.js';

export interface AgentOptions {
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
  dryRun?: boolean;
}

export interface AgentCallbacks {
  onStateChange?: (state: AgentState) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (result: ToolResult) => void;
  onMessage?: (role: 'user' | 'assistant', content: string) => void;
  onError?: (error: Error) => void;
}

export interface ToolExecutionResult {
  toolCallId: string;
  result: ToolResult;
}
