import {
  CompletionParams,
  CompletionResult,
  StreamChunk,
  Message,
  ToolDefinition,
} from '../types/index.js';

export interface LLMProvider {
  readonly name: string;

  complete(params: CompletionParams): Promise<CompletionResult>;
  completeStream?(params: CompletionParams): AsyncIterable<StreamChunk>;
}

// Helper to convert our Message format to Anthropic format
export function toAnthropicMessages(messages: Message[]): Array<{
  role: 'user' | 'assistant';
  content: string;
}> {
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

// Helper to convert our ToolDefinition to Anthropic format
export function toAnthropicTools(tools: ToolDefinition[]): Array<{
  name: string;
  description: string;
  input_schema: { type: string; properties?: Record<string, unknown>; required?: string[] };
}> {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as { type: string; properties?: Record<string, unknown>; required?: string[] },
  }));
}
