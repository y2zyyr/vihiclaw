import readline from 'readline';
import chalk from 'chalk';
import { join } from 'path';
import { loadConfig } from '../config/loader.js';
import { isFirstRun, runSetupWizard } from './setup.js';
import { createLogger } from '../utils/logger.js';
import { createDefaultRegistry } from '../tools/index.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import { OpenAIProvider } from '../providers/openai.js';
import { OpenAICompatibleProvider } from '../providers/openai_compatible.js';
import { LocalProvider } from '../providers/local.js';
import { SessionManager } from '../session/manager.js';
import { exportSession, suggestExportFilename } from '../session/exporter.js';
import { AgentLoop } from '../agent/loop.js';
import { ClawConfig, AgentState } from '../types/index.js';
import { ClawError } from '../utils/errors.js';
import { ToolExecutionTrace } from '../agent/types.js';

export async function runREPL(overrides?: Partial<ClawConfig>): Promise<void> {
  // Check first run / 檢查首次運行
  if (!overrides?.apiKey && isFirstRun()) {
    const setupSuccess = await runSetupWizard();
    if (!setupSuccess) {
      console.log(chalk.yellow('\n您可以手動創建配置文件 / You can manually create config:'));
      console.log(chalk.gray('  ~/.vihiclaw/config.json'));
      process.exit(1);
    }
    console.log(chalk.cyan('\n🚀 啟動 VIHIclaw...\n'));
  }

  const config = await loadConfig(overrides);
  const logger = createLogger(config.logLevel, config.logDir);

  // Debug mode state (can be toggled with Ctrl+O) / 調試模式狀態（可用 Ctrl+O 切換）
  let debugMode = config.debug || false;

  // YOLO mode state (auto-confirm destructive actions, toggle with Ctrl+Y) / YOLO 模式狀態（自動確認危險操作，用 Ctrl+Y 切換）
  let yoloMode = config.yolo || false;

  logger.info('Starting VIHIclaw REPL');

  // Initialize components
  const toolRegistry = createDefaultRegistry();
  const sessionManager = new SessionManager(config.sessionDir);
  await sessionManager.initialize();

  // Check for resume flag / 檢查恢復標誌
  const resumeSessionId = process.argv.includes('--resume')
    ? process.argv[process.argv.indexOf('--resume') + 1]
    : null;

  let session;
  if (resumeSessionId) {
    session = await sessionManager.load(resumeSessionId);
    if (session) {
      logger.info(`Resumed session: ${session.id}`);
      console.log(chalk.yellow(`\nResumed session / 恢復會話: ${session.id}`));
      console.log(chalk.gray(`Messages / 消息數: ${session.messages.length}`));
    } else {
      console.log(chalk.red(`\nSession not found / 會話未找到: ${resumeSessionId}`));
      console.log(chalk.gray('Creating new session / 創建新會話'));
      session = await sessionManager.create();
    }
  } else {
    session = await sessionManager.create();
    logger.info(`Created session: ${session.id}`);
  }

  const provider = createProvider(config, debugMode);
  const agent = new AgentLoop(
    provider,
    toolRegistry,
    sessionManager,
    session.id,
    logger,
    config,
    {
      onStateChange: (state: AgentState) => {
        if (state === 'thinking') {
          process.stdout.write(chalk.gray('\n  Thinking...'));
        } else if (state === 'executing') {
          process.stdout.write('\r' + chalk.gray('  Executing tools...'));
        } else if (state === 'done') {
          process.stdout.write('\r' + ' '.repeat(30) + '\r');
        }
      },
      onMessage: (role, content) => {
        if (role === 'assistant') {
          console.log(chalk.cyan('\nAssistant:'), content);
        }
      },
      onToolExecutionStart: (trace: ToolExecutionTrace) => {
        process.stdout.write(chalk.gray(`\n  [${trace.toolName}] `));
      },
      onToolExecutionEnd: (trace: ToolExecutionTrace) => {
        if (trace.duration !== undefined) {
          const duration = trace.duration < 1000
            ? `${trace.duration}ms`
            : `${(trace.duration / 1000).toFixed(1)}s`;
          const color = trace.status === 'success' ? chalk.green : chalk.red;
          process.stdout.write(color(`✓ ${duration}`));
        }
      },
      onError: (error) => {
        console.error(chalk.red('\nError:'), error.message);
      },
    }
  );

  // Print welcome message
  console.log(chalk.bold.cyan('\n🐾 VIHIclaw - AI Coding Agent'));
  console.log(chalk.gray(`Session: ${session.id}`));
  console.log(chalk.gray(`Provider: ${config.provider} (${config.model})`));
  console.log(chalk.gray('Type "exit" or press Ctrl+C to quit'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold('> '),
  });

  // Enable keypress events for shortcuts / 啟用快捷鍵的 keypress 事件
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Handle Ctrl+O to toggle debug / 處理 Ctrl+O 切換調試
  process.stdin.on('keypress', (_str, key) => {
    if (key && key.ctrl && key.name === 'o') {
      debugMode = !debugMode;
      // Update provider debug state if supported / 如果支持則更新 provider 調試狀態
      if ('setDebug' in provider && typeof (provider as any).setDebug === 'function') {
        (provider as any).setDebug(debugMode);
      }
      console.log(chalk.gray(`\n[Debug: ${debugMode ? 'ON' : 'OFF'}]`));
      rl.prompt();
    }
    // Handle Ctrl+Y to toggle YOLO mode / 處理 Ctrl+Y 切換 YOLO 模式
    if (key && key.ctrl && key.name === 'y') {
      yoloMode = !yoloMode;
      // Update agent YOLO state if supported / 如果支持則更新 agent YOLO 狀態
      if ('setYolo' in agent && typeof (agent as any).setYolo === 'function') {
        (agent as any).setYolo(yoloMode);
      }
      console.log(chalk.yellow(`\n[YOLO: ${yoloMode ? 'ON' : 'OFF'}] ${yoloMode ? '⚠️ Auto-confirming destructive actions' : 'Confirming destructive actions'}`));
      rl.prompt();
    }
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim();
    if (!trimmed) { rl.prompt(); return; }
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      console.log(chalk.gray('\nGoodbye!'));
      rl.close();
      return;
    }

    if (trimmed.startsWith('/')) {
      await handleCommand(trimmed, agent, config, sessionManager, session.id, debugMode, yoloMode);
      rl.prompt();
      return;
    }

    try {
      await agent.run(trimmed);
      // Show tool execution summary
      const traces = agent.getToolTraces();
      if (traces.length > 0) {
        const totalDuration = traces.reduce((sum, t) => sum + (t.duration || 0), 0);
        console.log(chalk.gray(`\n  (${traces.length} tools, ${totalDuration}ms total)`));
      }
    } catch (error) {
      if (error instanceof ClawError) {
        console.error(chalk.red('Error:'), error.message);
      } else {
        console.error(chalk.red('Unexpected error:'), error);
      }
    }
    console.log();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nSession saved.'));
    process.exit(0);
  });
}

function createProvider(config: ClawConfig, debug = false) {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config.apiKey || '');
    case 'openai':
      return new OpenAIProvider({ apiKey: config.apiKey || '' });
    case 'deepseek':
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey || '',
        baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
        defaultModel: config.model || 'deepseek-chat',
        headers: config.headers,
        debug,
      });
    case 'minimax':
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey || '',
        baseURL: config.baseUrl || 'https://api.minimax.chat/v1',
        defaultModel: config.model || 'abab6.5-chat',
        headers: config.headers,
        debug,
      });
    case 'kimi':
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey || '',
        baseURL: config.baseUrl || 'https://api.moonshot.cn/v1',
        defaultModel: config.model || 'moonshot-v1-8k',
        headers: config.headers,
        debug,
      });
    case 'other':
      if (!config.baseUrl) {
        throw new ClawError('Custom provider requires baseUrl', 'MISSING_BASEURL', false);
      }
      return new OpenAICompatibleProvider({
        apiKey: config.apiKey || '',
        baseURL: config.baseUrl,
        defaultModel: config.model || 'gpt-3.5-turbo',
        headers: config.headers,
        debug,
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

async function handleCommand(
  command: string,
  _agent: AgentLoop,
  config: ClawConfig,
  sessionManager: SessionManager,
  currentSessionId: string,
  showDebug = false,
  yoloMode = false
): Promise<void> {
  const parts = command.slice(1).split(' ');
  const cmd = parts[0];

  switch (cmd) {
    case 'help':
      console.log(chalk.cyan('\nAvailable commands:'));
      console.log('  /help              - Show this help');
      console.log('  /resume            - Resume previous session');
      console.log('  /sessions          - List available sessions');
      console.log('  /clear             - Clear the conversation');
      console.log('  /tools             - List available tools');
      console.log('  /config            - Show current configuration');
      console.log('  /debug             - Toggle debug mode (Ctrl+O) / 切換調試模式');
      console.log('  /yolo              - Toggle YOLO mode (Ctrl+Y) / 切換 YOLO 模式');
      console.log('  /dryrun            - Toggle dry-run mode');
      console.log('  /export [format]   - Export session (json|markdown)');
      console.log('  /memory [cmd]      - Memory operations (stats|search)');
      console.log('  /exit              - Exit the REPL');
      console.log();
      break;
    case 'debug':
      console.log(chalk.cyan('\nDebug Mode / 調試模式:'));
      console.log(`  Current / 當前: ${showDebug ? chalk.green('ON') : chalk.gray('OFF')}`);
      console.log(chalk.gray('\n  Set in config to enable / 在配置中設置以啟用:'));
      console.log(chalk.gray('  ~/.vihiclaw/config.json → "debug": true'));
      console.log();
      break;
    case 'yolo':
      console.log(chalk.cyan('\nYOLO Mode / YOLO 模式:'));
      console.log(`  Current / 當前: ${yoloMode ? chalk.yellow('ON ⚠️') : chalk.gray('OFF')}`);
      console.log(chalk.gray('\n  When enabled, destructive actions are auto-confirmed / 啟用後將自動確認危險操作'));
      console.log(chalk.gray('  Set in config to enable by default / 在配置中設置默認啟用:'));
      console.log(chalk.gray('  ~/.vihiclaw/config.json → "yolo": true'));
      console.log();
      break;
    case 'sessions':
      const sessions = await sessionManager.list();
      console.log(chalk.cyan('\nAvailable sessions:'));
      if (sessions.length === 0) {
        console.log(chalk.gray('  No sessions found'));
      } else {
        for (const sid of sessions) {
          const marker = sid === currentSessionId ? ' (current)' : '';
          console.log(`  ${sid}${marker}`);
        }
      }
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
      console.log(`  Debug mode: ${showDebug ? chalk.green('ON') : chalk.gray('OFF')}`);
      console.log(`  YOLO mode: ${yoloMode ? chalk.yellow('ON ⚠️') : chalk.gray('OFF')}`);
      console.log();
      break;
    case 'export': {
      const format = parts[1] as 'json' | 'markdown' || 'markdown';
      if (format !== 'json' && format !== 'markdown') {
        console.log(chalk.red(`\nInvalid format: ${format}`));
        console.log(chalk.gray('Usage: /export [json|markdown]'));
        console.log();
        break;
      }

      const outputDir = process.env.HOME || process.env.USERPROFILE || '.';
      const filename = suggestExportFilename(currentSessionId, format);
      const outputPath = join(outputDir, 'Downloads', filename);

      console.log(chalk.gray(`\nExporting to / 導出至: ${outputPath}`));

      const result = await exportSession(sessionManager, currentSessionId, {
        format,
        outputPath,
        includeMetadata: true,
        includeTimestamps: true,
      });

      if (result.success) {
        console.log(chalk.green(`\n✓ Exported / 導出成功: ${result.messageCount} messages`));
        console.log(chalk.gray(`  Path / 路徑: ${result.outputPath}`));
      } else {
        console.log(chalk.red(`\n✗ Export failed / 導出失敗: ${result.error}`));
      }
      console.log();
      break;
    }
    case 'memory': {
      // Memory manager would be initialized with the agent
      // For now, show placeholder / 記憶管理器會與代理一起初始化
      console.log(chalk.cyan('\nMemory System / 記憶系統:'));
      console.log(chalk.gray('  (Integrated with agent loop / 已與代理循環集成)'));
      console.log();
      console.log('Commands / 命令:');
      console.log('  stats  - Show memory statistics / 顯示記憶統計');
      console.log('  search - Search memories / 搜索記憶');
      console.log();
      break;
    }
    default:
      console.log(chalk.red(`\nUnknown command: /${cmd}`));
  }
}
