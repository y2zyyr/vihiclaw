import { ProviderError } from '../utils/errors.js';
export class OpenAIProvider {
    name = 'openai';
    apiKey;
    baseURL;
    constructor(config) {
        if (!config.apiKey) {
            throw new ProviderError('OpenAI API key is required', false);
        }
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    }
    async fetchOpenAI(endpoint, body) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.text();
            const retryable = response.status === 429 || response.status >= 500;
            throw new ProviderError(`OpenAI API error: ${error}`, retryable);
        }
        return response;
    }
    async complete(params) {
        try {
            const body = {
                model: params.model || 'gpt-4',
                messages: params.messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                tools: params.tools?.map((t) => ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters,
                    },
                })),
            };
            const response = await this.fetchOpenAI('/chat/completions', body);
            const data = (await response.json());
            const message = data.choices[0]?.message;
            const toolCalls = message?.tool_calls?.map((tc) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: JSON.parse(tc.function.arguments),
            }));
            return {
                content: message?.content || '',
                toolCalls: toolCalls?.length ? toolCalls : undefined,
                usage: data.usage
                    ? {
                        inputTokens: data.usage.prompt_tokens,
                        outputTokens: data.usage.completion_tokens,
                        totalTokens: data.usage.total_tokens,
                    }
                    : undefined,
            };
        }
        catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }
            throw new ProviderError(`Unexpected error: ${error}`, false);
        }
    }
    async *completeStream(params) {
        try {
            const body = {
                model: params.model || 'gpt-4',
                messages: params.messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                tools: params.tools?.map((t) => ({
                    type: 'function',
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters,
                    },
                })),
                stream: true,
            };
            const response = await this.fetchOpenAI('/chat/completions', body);
            const reader = response.body?.getReader();
            if (!reader) {
                throw new ProviderError('No response body', false);
            }
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            yield { done: true };
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta;
                            if (delta?.content) {
                                yield { content: delta.content };
                            }
                            if (delta?.tool_calls) {
                                for (const tc of delta.tool_calls) {
                                    if (tc.function?.name) {
                                        yield {
                                            toolCall: {
                                                id: tc.id || '',
                                                name: tc.function.name,
                                                arguments: tc.function.arguments
                                                    ? JSON.parse(tc.function.arguments)
                                                    : {},
                                            },
                                        };
                                    }
                                }
                            }
                        }
                        catch {
                            // Ignore parse errors in stream
                        }
                    }
                }
            }
        }
        catch (error) {
            if (error instanceof ProviderError) {
                throw error;
            }
            throw new ProviderError(`Unexpected error: ${error}`, false);
        }
    }
}
//# sourceMappingURL=openai.js.map