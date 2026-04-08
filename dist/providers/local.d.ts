import { LLMProvider } from './base.js';
import { CompletionParams, CompletionResult, StreamChunk } from '../types/index.js';
interface LocalProviderConfig {
    baseURL: string;
    apiKey?: string;
    model: string;
}
/**
 * Local/OpenAI-compatible provider
 * Works with Ollama, LM Studio, vLLM, etc.
 */
export declare class LocalProvider implements LLMProvider {
    readonly name = "local";
    private baseURL;
    private apiKey?;
    private model;
    constructor(config: LocalProviderConfig);
    private fetchLocal;
    complete(params: CompletionParams): Promise<CompletionResult>;
    completeStream(params: CompletionParams): AsyncIterable<StreamChunk>;
}
export {};
//# sourceMappingURL=local.d.ts.map