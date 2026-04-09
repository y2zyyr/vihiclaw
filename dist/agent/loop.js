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
    memoryManager;
    state = 'idle';
    context;
    pendingToolCalls = [];
    currentIteration = 0;
    toolTraces = new Map();
    constructor(provider, toolRegistry, sessionManager, sessionId, logger, config, callbacks, memoryManager) {
        this.provider = provider;
        this.toolRegistry = toolRegistry;
        this.sessionManager = sessionManager;
        this.sessionId = sessionId;
        this.logger = logger;
        this.config = config;
        this.callbacks = callbacks;
        this.memoryManager = memoryManager;
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
    getToolTraces() {
        return Array.from(this.toolTraces.values()).sort((a, b) => a.startTime - b.startTime);
    }
    clearToolTraces() {
        this.toolTraces.clear();
    }
    /**
     * Set YOLO mode (auto-confirm destructive actions)
     */
    setYolo(enabled) {
        this.config.yolo = enabled;
        this.logger.debug(`YOLO mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Main entry point: run the agent with user input
     */
    async run(userInput) {
        // Reset state
        this.setState('idle');
        this.currentIteration = 0;
        this.clearToolTraces();
        // Add user message to context
        this.context.addUserMessage(userInput);
        await this.sessionManager.addMessage(this.sessionId, {
            role: 'user',
            content: userInput,
        });
        this.callbacks?.onMessage?.('user', userInput);
        // Capture user message to memory / 捕獲用戶消息到記憶
        if (this.memoryManager) {
            try {
                await this.memoryManager.captureConversation(this.sessionId, 'user', userInput);
            }
            catch (error) {
                this.logger.debug('Failed to capture user message to memory', { error: String(error) });
            }
        }
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
        const startTime = Date.now();
        try {
            this.logger.debug('Requesting completion from provider');
            const result = await this.provider.complete({
                messages: this.context.getMessages(),
                tools: this.toolRegistry.getDefinitions(),
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens,
            });
            const duration = Date.now() - startTime;
            this.logger.debug('Received completion', {
                contentLength: result.content.length,
                toolCallsCount: result.toolCalls?.length,
                duration: `${duration}ms`,
            });
            // Add assistant message to context
            this.context.addAssistantMessage(result.content, result.toolCalls);
            await this.sessionManager.addMessage(this.sessionId, {
                role: 'assistant',
                content: result.content,
                toolCalls: result.toolCalls,
            });
            this.callbacks?.onMessage?.('assistant', result.content);
            // Capture assistant message to memory / 捕獲助手消息到記憶
            if (this.memoryManager) {
                try {
                    await this.memoryManager.captureConversation(this.sessionId, 'assistant', result.content, result.toolCalls);
                }
                catch (error) {
                    this.logger.debug('Failed to capture assistant message to memory', { error: String(error) });
                }
            }
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
            // Categorize tool calls by concurrency safety / 按並發安全性分類工具調用
            const safeCalls = [];
            const unsafeCalls = [];
            for (const toolCall of this.pendingToolCalls) {
                const tool = this.toolRegistry.get(toolCall.name);
                if (tool?.isConcurrencySafe) {
                    safeCalls.push(toolCall);
                }
                else {
                    unsafeCalls.push(toolCall);
                }
            }
            this.logger.debug('Tool execution plan', {
                safe: safeCalls.map(c => c.name),
                unsafe: unsafeCalls.map(c => c.name),
            });
            // Execute safe tools concurrently / 並發執行安全工具
            const safePromises = safeCalls.map(tc => this.executeToolWithTracing(tc));
            // Execute unsafe tools serially / 串行執行非安全工具
            const unsafeResults = [];
            for (const toolCall of unsafeCalls) {
                unsafeResults.push(await this.executeToolWithTracing(toolCall));
            }
            // Wait for concurrent results / 等待並發結果
            const safeResults = await Promise.all(safePromises);
            // Combine results in original order / 按原始順序合併結果
            const results = [];
            const safeMap = new Map(safeResults.map(r => [r.toolCallId, r]));
            const unsafeMap = new Map(unsafeResults.map(r => [r.toolCallId, r]));
            for (const toolCall of this.pendingToolCalls) {
                const result = safeMap.get(toolCall.id) || unsafeMap.get(toolCall.id);
                if (result) {
                    results.push(result);
                    // Add to context in order / 按順序添加到上下文
                    this.context.addToolResult(toolCall.id, result.result.content);
                    await this.sessionManager.addMessage(this.sessionId, {
                        role: 'tool',
                        content: result.result.content,
                        toolCallId: toolCall.id,
                    });
                }
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
    async executeToolWithTracing(toolCall) {
        // Create trace for this tool execution
        const trace = {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            startTime: Date.now(),
            status: 'pending',
        };
        this.toolTraces.set(toolCall.id, trace);
        this.callbacks?.onToolCall?.(toolCall, trace);
        this.callbacks?.onToolExecutionStart?.(trace);
        const result = await this.executeTool(toolCall, trace);
        // Update trace with completion
        trace.endTime = Date.now();
        trace.duration = trace.endTime - trace.startTime;
        trace.status = result.success ? 'success' : 'error';
        if (!result.success) {
            trace.error = result.error;
        }
        this.callbacks?.onToolResult?.(result, trace);
        this.callbacks?.onToolExecutionEnd?.(trace);
        // Capture to memory system if available / 如果有記憶系統則捕獲
        if (this.memoryManager) {
            try {
                await this.memoryManager.captureToolExecution(this.sessionId, toolCall.name, toolCall.arguments, result.content, trace);
            }
            catch (error) {
                this.logger.debug('Failed to capture tool execution to memory', { error: String(error) });
            }
        }
        return { toolCallId: toolCall.id, result };
    }
    async executeTool(toolCall, trace) {
        const tool = this.toolRegistry.get(toolCall.name);
        if (!tool) {
            trace.status = 'error';
            trace.error = `Tool not found: ${toolCall.name}`;
            return {
                success: false,
                content: '',
                error: `Tool not found: ${toolCall.name}`,
            };
        }
        try {
            trace.status = 'running';
            this.logger.debug(`Executing tool: ${toolCall.name}`, { arguments: toolCall.arguments });
            const toolContext = {
                sessionId: this.sessionId,
                logger: this.logger,
                dryRun: this.config.dryRun,
                workingDir: process.cwd(),
                allowedShellCommands: this.config.allowedShellCommands,
                yoloMode: this.config.yolo,
            };
            const toolResult = await tool.execute(toolCall.arguments, toolContext);
            this.logger.debug(`Tool ${toolCall.name} completed`, { success: toolResult.success });
            return toolResult;
        }
        catch (error) {
            const errorMessage = error instanceof ClawError ? error.message : String(error);
            this.logger.error(`Tool ${toolCall.name} failed`, { error: errorMessage });
            trace.status = 'error';
            trace.error = errorMessage;
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