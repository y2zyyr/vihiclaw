import { LLMProvider } from './base.js';
import { CompletionParams, CompletionResult, StreamChunk } from '../types/index.js';
interface OpenAIConfig {
    apiKey: string;
    baseURL?: string;
}
export declare class OpenAIProvider implements LLMProvider {
    readonly name = "openai";
    private apiKey;
    private baseURL;
    constructor(config: OpenAIConfig);
    private fetchOpenAI;
    complete(params: CompletionParams): Promise<CompletionResult>;
    completeStream(params: CompletionParams): AsyncIterable<StreamChunk>;
}
export {};
//# sourceMappingURL=openai.d.ts.map