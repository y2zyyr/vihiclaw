import chalk from 'chalk';
import { loadConfig } from '../config/loader.js';
import { createLogger } from '../utils/logger.js';
import { createDefaultRegistry } from '../tools/index.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { OpenAIProvider } from '../providers/openai.js';
import { LocalProvider } from '../providers/local.js';
import { SessionManager } from '../session/manager.js';
import { AgentLoop } from '../agent/loop.js';
import { ClawError } from '../utils/errors.js';
export async function runSingleCommand(prompt, overrides) {
    const config = await loadConfig(overrides);
    const logger = createLogger(config.logLevel, config.logDir);
    logger.info('Running single command', { prompt: prompt.substring(0, 100) });
    // Initialize components
    const toolRegistry = createDefaultRegistry();
    const sessionManager = new SessionManager(config.sessionDir);
    await sessionManager.initialize();
    const session = await sessionManager.create();
    const provider = createProvider(config);
    const agent = new AgentLoop(provider, toolRegistry, sessionManager, session.id, logger, config, {
        onStateChange: (state) => {
            if (state === 'thinking') {
                if (process.stderr.isTTY) {
                    process.stderr.write(chalk.gray('Thinking... '));
                }
            }
            else if (state === 'executing') {
                if (process.stderr.isTTY) {
                    process.stderr.write(chalk.gray('Executing tools... '));
                }
            }
        },
        onMessage: (role, content) => {
            if (role === 'assistant') {
                if (process.stderr.isTTY) {
                    process.stderr.write('\r' + ' '.repeat(30) + '\r');
                }
                console.log(content);
            }
        },
        onToolCall: (toolCall) => {
            if (process.stderr.isTTY) {
                process.stderr.write(chalk.gray(`[${toolCall.name}] `));
            }
        },
        onError: (error) => {
            if (process.stderr.isTTY) {
                process.stderr.write('\r' + ' '.repeat(30) + '\r');
            }
            console.error(chalk.red('Error:'), error.message);
        },
    });
    try {
        await agent.run(prompt);
    }
    catch (error) {
        if (error instanceof ClawError) {
            console.error(chalk.red('Error:'), error.message);
            process.exit(1);
        }
        else {
            console.error(chalk.red('Unexpected error:'), error);
            process.exit(1);
        }
    }
}
function createProvider(config) {
    switch (config.provider) {
        case 'anthropic':
            return new AnthropicProvider(config.apiKey || '');
        case 'openai':
            return new OpenAIProvider({
                apiKey: config.apiKey || '',
            });
        case 'local':
            return new LocalProvider({
                baseURL: config.baseUrl || 'http://localhost:11434/v1',
                apiKey: config.apiKey,
                model: config.model,
            });
        default:
            throw new ClawError(`Unknown provider: ${config.provider}`, 'UNKNOWN_PROVIDER', false);
    }
}
//# sourceMappingURL=single.js.map