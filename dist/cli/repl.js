import readline from 'readline';
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
export async function runREPL(overrides) {
    const config = await loadConfig(overrides);
    const logger = createLogger(config.logLevel, config.logDir);
    logger.info('Starting VIHIclaw REPL');
    // Initialize components
    const toolRegistry = createDefaultRegistry();
    const sessionManager = new SessionManager(config.sessionDir);
    await sessionManager.initialize();
    const session = await sessionManager.create();
    logger.info(`Created session: ${session.id}`);
    const provider = createProvider(config);
    const agent = new AgentLoop(provider, toolRegistry, sessionManager, session.id, logger, config, {
        onStateChange: (state) => {
            if (state === 'thinking') {
                process.stdout.write(chalk.gray('\n  Thinking...'));
            }
            else if (state === 'executing') {
                process.stdout.write('\r' + chalk.gray('  Executing tools...'));
            }
            else if (state === 'done') {
                process.stdout.write('\r' + ' '.repeat(30) + '\r');
            }
        },
        onMessage: (role, content) => {
            if (role === 'assistant') {
                console.log(chalk.cyan('\nAssistant:'), content);
            }
        },
        onToolCall: (toolCall) => {
            console.log(chalk.gray(`  [Tool] ${toolCall.name}`));
        },
        onToolResult: (result) => {
            if (!result.success) {
                console.log(chalk.red(`  [Error] ${result.error}`));
            }
        },
        onError: (error) => {
            console.error(chalk.red('\nError:'), error.message);
        },
    });
    // Print welcome message
    console.log(chalk.bold.cyan('\n🐾 VIHIclaw - AI Coding Agent/AI 編程代理'));
    console.log(chalk.gray(`Session: ${session.id}`));
    console.log(chalk.gray(`Provider: ${config.provider} (${config.model})`));
    console.log(chalk.gray('Type "exit" or press Ctrl+C to quit / 輸入 "exit" 或按 Ctrl+C 退出'));
    // Create readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.bold('> '),
    });
    rl.prompt();
    rl.on('line', async (input) => {
        const trimmed = input.trim();
        if (!trimmed) {
            rl.prompt();
            return;
        }
        if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
            console.log(chalk.gray('\nGoodbye! 👋'));
            rl.close();
            return;
        }
        // Special commands
        if (trimmed.startsWith('/')) {
            await handleCommand(trimmed, agent, config);
            rl.prompt();
            return;
        }
        // Process user input
        try {
            await agent.run(trimmed);
        }
        catch (error) {
            if (error instanceof ClawError) {
                console.error(chalk.red('Error:'), error.message);
            }
            else {
                console.error(chalk.red('Unexpected error:'), error);
            }
        }
        console.log(); // Empty line
        rl.prompt();
    });
    rl.on('close', () => {
        console.log(chalk.gray('\nSession saved.'));
        process.exit(0);
    });
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
async function handleCommand(command, _agent, config) {
    const parts = command.slice(1).split(' ');
    const cmd = parts[0];
    switch (cmd) {
        case 'help':
            console.log(chalk.cyan('\nAvailable commands:'));
            console.log('  /help     - Show this help');
            console.log('  /clear    - Clear the conversation');
            console.log('  /tools    - List available tools');
            console.log('  /config   - Show current configuration');
            console.log('  /dryrun   - Toggle dry-run mode');
            console.log('  /exit     - Exit the REPL');
            console.log();
            break;
        case 'tools':
            const { createDefaultRegistry } = await import('../tools/index.js');
            const registry = createDefaultRegistry();
            console.log(chalk.cyan('\nAvailable tools:'));
            for (const tool of registry.getAll()) {
                console.log(`  ${chalk.bold(tool.name)} - ${tool.description}`);
            }
            console.log();
            break;
        case 'config':
            console.log(chalk.cyan('\nCurrent configuration:'));
            console.log(`  Provider: ${config.provider}`);
            console.log(`  Model: ${config.model}`);
            console.log(`  Dry run: ${config.dryRun}`);
            console.log(`  Max iterations: ${config.maxIterations}`);
            console.log();
            break;
        case 'dryrun':
            config.dryRun = !config.dryRun;
            console.log(chalk.cyan(`\nDry-run mode: ${config.dryRun ? 'ON' : 'OFF'}\n`));
            break;
        case 'clear':
            console.log(chalk.yellow('\nNote: Context clearing not implemented yet\n'));
            break;
        default:
            console.log(chalk.red(`\nUnknown command: /${cmd}\n`));
    }
}
//# sourceMappingURL=repl.js.map