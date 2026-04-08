import Anthropic from '@anthropic-ai/sdk';
import { toAnthropicMessages, toAnthropicTools } from './base.js';
import { ProviderError } from '../utils/errors.js';
export class AnthropicProvider {
    name = 'anthropic';
    client;
    constructor(apiKey) {
        if (!apiKey) {
            throw new ProviderError('Anthropic API key is required', false);
        }
        this.client = new Anthropic({ apiKey });
    }
    async complete(params) {
        try {
            const response = await this.client.messages.create({
                model: params.model || 'claude-sonnet-4-6',
                max_tokens: params.maxTokens || 4096,
                temperature: params.temperature ?? 0.7,
                messages: toAnthropicMessages(params.messages),
                tools: params.tools ? toAnthropicTools(params.tools) : undefined,
            });
            const content = response.content
                .filter((c) => c.type === 'text')
                .map((c) => c.text)
                .join('');
            const toolCalls = response.content
                .filter((c) => c.type === 'tool_use')
                .map((c) => ({
                id: c.id,
                name: c.name,
                arguments: c.input,
            }));
            return {
                content,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                usage: response.usage
                    ? {
                        inputTokens: response.usage.input_tokens,
                        outputTokens: response.usage.output_tokens,
                        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
                    }
                    : undefined,
            };
        }
        catch (error) {
            if (error instanceof Anthropic.APIError) {
                const retryable = error.status === 429 || error.status >= 500;
                throw new ProviderError(`Anthropic API error: ${error.message}`, retryable);
            }
            throw new ProviderError(`Unexpected error: ${error}`, false);
        }
    }
    async *completeStream(params) {
        try {
            const stream = await this.client.messages.create({
                model: params.model || 'claude-sonnet-4-6',
                max_tokens: params.maxTokens || 4096,
                temperature: params.temperature ?? 0.7,
                messages: toAnthropicMessages(params.messages),
                tools: params.tools ? toAnthropicTools(params.tools) : undefined,
                stream: true,
            });
            let currentToolCall;
            for await (const chunk of stream) {
                if (chunk.type === 'content_block_delta') {
                    if (chunk.delta.type === 'text_delta') {
                        yield {
                            content: chunk.delta.text,
                        };
                    }
                    else if (chunk.delta.type === 'input_json_delta') {
                        // Tool use delta - accumulate partial JSON if needed
                    }
                }
                else if (chunk.type === 'content_block_start') {
                    if (chunk.content_block.type === 'tool_use') {
                        currentToolCall = {
                            id: chunk.content_block.id,
                            name: chunk.content_block.name,
                        };
                        yield {
                            toolCall: currentToolCall,
                        };
                    }
                }
                else if (chunk.type === 'message_stop') {
                    yield { done: true };
                }
            }
        }
        catch (error) {
            if (error instanceof Anthropic.APIError) {
                const retryable = error.status === 429 || error.status >= 500;
                throw new ProviderError(`Anthropic API error: ${error.message}`, retryable);
            }
            throw new ProviderError(`Unexpected error: ${error}`, false);
        }
    }
}
//# sourceMappingURL=anthropic.js.map