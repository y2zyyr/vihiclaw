import { AgentState, ToolCall, ToolResult } from '../types/index.js';

export interface AgentOptions {
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
  dryRun?: boolean;
}

export interface ToolExecutionTrace {
  toolCallId: string;
  toolName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

export interface AgentCallbacks {
  onStateChange?: (state: AgentState) => void;
  onToolCall?: (toolCall: ToolCall, trace: ToolExecutionTrace) => void;
  onToolResult?: (result: ToolResult, trace: ToolExecutionTrace) => void;
  onMessage?: (role: 'user' | 'assistant', content: string) => void;
  onError?: (error: Error) => void;
  onToolExecutionStart?: (trace: ToolExecutionTrace) => void;
  onToolExecutionEnd?: (trace: ToolExecutionTrace) => void;
}

export interface ToolExecutionResult {
  toolCallId: string;
  result: ToolResult;
}
