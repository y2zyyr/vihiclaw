import { CompletionParams, CompletionResult, StreamChunk, Message, ToolDefinition } from '../types/index.js';
export interface LLMProvider {
    readonly name: string;
    complete(params: CompletionParams): Promise<CompletionResult>;
    completeStream?(params: CompletionParams): AsyncIterable<StreamChunk>;
}
export declare function toAnthropicMessages(messages: Message[]): Array<{
    role: 'user' | 'assistant';
    content: string;
}>;
export declare function toAnthropicTools(tools: ToolDefinition[]): Array<{
    name: string;
    description: string;
    input_schema: {
        type: string;
        properties?: Record<string, unknown>;
        required?: string[];
    };
}>;
//# sourceMappingURL=base.d.ts.map