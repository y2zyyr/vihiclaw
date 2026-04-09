#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { profileCheckpoint, printProfileReport } from '../utils/profiler.js';
import { loadConfig } from '../config/loader.js';
import { runREPL } from './repl.js';
import { runSingleCommand } from './single.js';
import { runSetupWizard } from './setup.js';
const VERSION = '0.1.0';
async function main() {
    // Record entry checkpoint / 記錄入口檢查點
    profileCheckpoint('cli_entry');
    const program = new Command();
    program
        .name('vihiclaw')
        .description('A local-first AI coding agent CLI tool / 本地優先的 AI 編程代理 CLI 工具')
        .version(VERSION);
    program
        .option('-p, --provider <provider>', 'LLM provider (anthropic, openai, local)')
        .option('-m, --model <model>', 'Model name')
        .option('-k, --api-key <key>', 'API key')
        .option('--dry-run', 'Dry run mode (show actions without executing) / 模擬運行模式')
        .option('--session-dir <dir>', 'Session directory / 會話目錄')
        .option('--log-dir <dir>', 'Log directory / 日誌目錄')
        .option('--log-level <level>', 'Log level (debug, info, warn, error) / 日誌級別')
        .option('--no-stream', 'Disable streaming responses / 禁用流式響應');
    program
        .command('setup')
        .alias('onboard')
        .description('Run setup wizard / 運行設置嚮導')
        .action(async () => {
        console.log(chalk.cyan('\n🐾 VIHIclaw Setup Wizard / 設置嚮導'));
        console.log(chalk.gray('Reconfiguring VIHIclaw... / 重新配置 VIHIclaw...\n'));
        const success = await runSetupWizard();
        if (success) {
            console.log(chalk.green('\n✅ 設置完成！請重新運行 vihi / Setup complete! Please restart vihi'));
        }
        else {
            console.log(chalk.red('\n❌ 設置已取消 / Setup cancelled'));
            process.exit(1);
        }
    });
    program
        .command('chat')
        .description('Start interactive chat (REPL) / 啟動交互式對話')
        .action(async () => {
        const opts = program.opts();
        await runREPL(parseOptions(opts));
        printProfileReport();
    });
    program
        .command('ask')
        .description('Ask a single question / 單次提問')
        .argument('<prompt>', 'The question to ask / 要詢問的問題')
        .action(async (prompt) => {
        const opts = program.opts();
        await runSingleCommand(prompt, parseOptions(opts));
        printProfileReport();
    });
    program
        .command('session')
        .description('Session management / 會話管理')
        .addCommand(new Command('list')
        .description('List all sessions / 列出所有會話')
        .action(async () => {
        const config = await loadConfig();
        const { SessionManager } = await import('../session/manager.js');
        const manager = new SessionManager(config.sessionDir);
        const sessions = await manager.list();
        console.log(chalk.cyan('Sessions / 會話列表:'));
        for (const session of sessions) {
            console.log(`  ${session}`);
        }
    }))
        .addCommand(new Command('delete')
        .description('Delete a session / 刪除會話')
        .argument('<sessionId>', 'Session ID to delete / 要刪除的會話 ID')
        .action(async (sessionId) => {
        const config = await loadConfig();
        const { SessionManager } = await import('../session/manager.js');
        const manager = new SessionManager(config.sessionDir);
        const deleted = await manager.delete(sessionId);
        if (deleted) {
            console.log(chalk.green(`Deleted session / 已刪除會話: ${sessionId}`));
        }
        else {
            console.log(chalk.red(`Session not found / 會話未找到: ${sessionId}`));
        }
    }));
    // Default command: REPL / 默認命令：REPL
    program.action(async () => {
        const opts = program.opts();
        await runREPL(parseOptions(opts));
        printProfileReport();
    });
    await program.parseAsync();
}
function parseOptions(opts) {
    const overrides = {};
    if (opts.provider)
        overrides.provider = opts.provider;
    if (opts.model)
        overrides.model = opts.model;
    if (opts.apiKey)
        overrides.apiKey = opts.apiKey;
    if (opts.dryRun)
        overrides.dryRun = true;
    if (opts.sessionDir)
        overrides.sessionDir = opts.sessionDir;
    if (opts.logDir)
        overrides.logDir = opts.logDir;
    if (opts.logLevel)
        overrides.logLevel = opts.logLevel;
    if (opts.stream === false)
        overrides.streamResponse = false;
    return overrides;
}
main().catch((error) => {
    console.error(chalk.red('Error / 錯誤:'), error.message);
    process.exit(1);
});
//# sourceMappingURL=index.js.map