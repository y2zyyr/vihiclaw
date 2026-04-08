import { ContextBuilder } from '../context/builder.js';
import { ClawError } from '../utils/errors.js';
/**
 * AgentLoop implements a state machine-driven agent loop
 *
 * States:
 * - idle: Waiting for input
 * - thinking: LLM inference in progress
 * - executing: Tool execution in progress
 * - paused: Paused (needs confirmation)
 * - done: Completed successfully
 * - error: Encountered an error
 */
export class AgentLoop {
    provider;
    toolRegistry;
    sessionManager;
    sessionId;
    logger;
    config;
    callbacks;
    state = 'idle';
    context;
    pendingToolCalls = [];
    currentIteration = 0;
    constructor(provider, toolRegistry, sessionManager, sessionId, logger, config, callbacks) {
        this.provider = provider;
        this.toolRegistry = toolRegistry;
        this.sessionManager = sessionManager;
        this.sessionId = sessionId;
        this.logger = logger;
        this.config = config;
        this.callbacks = callbacks;
        this.context = new ContextBuilder();
    }
    setState(newState) {
        this.state = newState;
        this.callbacks?.onStateChange?.(newState);
        this.logger.debug(`Agent state changed to: ${newState}`);
    }
    getState() {
        return this.state;
    }
    /**
     * Main entry point: run the agent with user input
     */
    async run(userInput) {
        // Reset state
        this.setState('idle');
        this.currentIteration = 0;
        // Add user message to context
        this.context.addUserMessage(userInput);
        await this.sessionManager.addMessage(this.sessionId, {
            role: 'user',
            content: userInput,
        });
        this.callbacks?.onMessage?.('user', userInput);
        // Start the loop
        await this.loop();
    }
    /**
     * Resume from paused state (e.g., after user confirmation)
     */
    async resume() {
        if (this.state !== 'paused') {
            throw new Error(`Cannot resume from state: ${this.state}`);
        }
        await this.loop();
    }
    /**
     * The main state machine loop
     */
    async loop() {
        while (this.state !== 'done' && this.state !== 'error') {
            // Check iteration limit
            if (this.currentIteration >= this.config.maxIterations) {
                this.logger.warn(`Max iterations (${this.config.maxIterations}) reached`);
                this.setState('done');
                return;
            }
            this.currentIteration++;
            switch (this.state) {
                case 'idle':
                    await this.handleIdle();
                    break;
                case 'thinking':
                    await this.handleThinking();
                    break;
                case 'executing':
                    await this.handleExecuting();
                    break;
                case 'paused':
                    // Wait for external resume
                    return;
                default:
                    this.setState('error');
                    return;
            }
        }
    }
    async handleIdle() {
        // Transition to thinking state
        this.setState('thinking');
    }
    async handleThinking() {
        try {
            this.logger.debug('Requesting completion from provider');
            const result = await this.provider.complete({
                messages: this.context.getMessages(),
                tools: this.toolRegistry.getDefinitions(),
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens,
            });
            this.logger.debug('Received completion', {
                contentLength: result.content.length,
                toolCallsCount: result.toolCalls?.length,
            });
            // Add assistant message to context
            this.context.addAssistantMessage(result.content, result.toolCalls);
            await this.sessionManager.addMessage(this.sessionId, {
                role: 'assistant',
                content: result.content,
                toolCalls: result.toolCalls,
            });
            this.callbacks?.onMessage?.('assistant', result.content);
            // Check if there are tool calls to execute
            if (result.toolCalls && result.toolCalls.length > 0) {
                this.pendingToolCalls = result.toolCalls;
                this.setState('executing');
            }
            else {
                // No tool calls, we're done
                this.setState('done');
            }
        }
        catch (error) {
            this.logger.error('Error during thinking', { error: String(error) });
            this.callbacks?.onError?.(error);
            this.setState('error');
        }
    }
    async handleExecuting() {
        try {
            const results = [];
            // Execute each pending tool call
            for (const toolCall of this.pendingToolCalls) {
                this.callbacks?.onToolCall?.(toolCall);
                const result = await this.executeTool(toolCall);
                results.push({ toolCallId: toolCall.id, result });
                this.callbacks?.onToolResult?.(result);
                // Add tool result to context
                this.context.addToolResult(toolCall.id, result.content);
                await this.sessionManager.addMessage(this.sessionId, {
                    role: 'tool',
                    content: result.content,
                    toolCallId: toolCall.id,
                });
            }
            // Clear pending calls
            this.pendingToolCalls = [];
            // Go back to thinking for the next iteration
            this.setState('thinking');
        }
        catch (error) {
            this.logger.error('Error during tool execution', { error: String(error) });
            this.callbacks?.onError?.(error);
            this.setState('error');
        }
    }
    async executeTool(toolCall) {
        const tool = this.toolRegistry.get(toolCall.name);
        if (!tool) {
            return {
                success: false,
                content: '',
                error: `Tool not found: ${toolCall.name}`,
            };
        }
        try {
            this.logger.debug(`Executing tool: ${toolCall.name}`, { arguments: toolCall.arguments });
            const toolContext = {
                sessionId: this.sessionId,
                logger: this.logger,
                dryRun: this.config.dryRun,
                workingDir: process.cwd(),
            };
            const toolResult = await tool.execute(toolCall.arguments, toolContext);
            this.logger.debug(`Tool ${toolCall.name} completed`, { success: toolResult.success });
            return toolResult;
        }
        catch (error) {
            const errorMessage = error instanceof ClawError ? error.message : String(error);
            this.logger.error(`Tool ${toolCall.name} failed`, { error: errorMessage });
            return {
                success: false,
                content: '',
                error: errorMessage,
            };
        }
    }
    /**
     * Stop the agent loop
     */
    stop() {
        this.setState('done');
    }
    /**
     * Get the current conversation context
     */
    getContext() {
        return this.context.getMessages();
    }
}
//# sourceMappingURL=loop.js.map