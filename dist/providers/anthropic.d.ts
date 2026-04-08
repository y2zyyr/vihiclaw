import { LLMProvider } from './base.js';
import { CompletionParams, CompletionResult, StreamChunk } from '../types/index.js';
export declare class AnthropicProvider implements LLMProvider {
    readonly name = "anthropic";
    private client;
    constructor(apiKey: string);
    complete(params: CompletionParams): Promise<CompletionResult>;
    completeStream(params: CompletionParams): AsyncIterable<StreamChunk>;
}
//# sourceMappingURL=anthropic.d.ts.map