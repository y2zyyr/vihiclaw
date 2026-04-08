#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../config/loader.js';
import { runREPL } from './repl.js';
import { runSingleCommand } from './single.js';
import { ClawConfig } from '../types/index.js';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('claw')
    .description('本地优先的 AI coding agent CLI 工具')
    .version(VERSION);

  program
    .option('-p, --provider <provider>', 'LLM provider (anthropic, openai, local)')
    .option('-m, --model <model>', 'Model name')
    .option('-k, --api-key <key>', 'API key')
    .option('--dry-run', 'Dry run mode (show actions without executing)')
    .option('--session-dir <dir>', 'Session directory')
    .option('--log-dir <dir>', 'Log directory')
    .option('--log-level <level>', 'Log level (debug, info, warn, error)')
    .option('--no-stream', 'Disable streaming responses');

  program
    .command('chat')
    .description('Start interactive chat (REPL)')
    .action(async () => {
      const opts = program.opts();
      await runREPL(parseOptions(opts));
    });

  program
    .command('ask')
    .description('Ask a single question')
    .argument('<prompt>', 'The question to ask')
    .action(async (prompt: string) => {
      const opts = program.opts();
      await runSingleCommand(prompt, parseOptions(opts));
    });

  program
    .command('session')
    .description('Session management')
    .addCommand(
      new Command('list')
        .description('List all sessions')
        .action(async () => {
          const config = await loadConfig();
          const { SessionManager } = await import('../session/manager.js');
          const manager = new SessionManager(config.sessionDir);
          const sessions = await manager.list();
          console.log(chalk.cyan('Sessions:'));
          for (const session of sessions) {
            console.log(`  ${session}`);
          }
        })
    )
    .addCommand(
      new Command('delete')
        .description('Delete a session')
        .argument('<sessionId>', 'Session ID to delete')
        .action(async (sessionId: string) => {
          const config = await loadConfig();
          const { SessionManager } = await import('../session/manager.js');
          const manager = new SessionManager(config.sessionDir);
          const deleted = await manager.delete(sessionId);
          if (deleted) {
            console.log(chalk.green(`Deleted session: ${sessionId}`));
          } else {
            console.log(chalk.red(`Session not found: ${sessionId}`));
          }
        })
    );

  // Default command: REPL
  program.action(async () => {
    const opts = program.opts();
    await runREPL(parseOptions(opts));
  });

  await program.parseAsync();
}

function parseOptions(opts: Record<string, unknown>): Partial<ClawConfig> {
  const overrides: Partial<ClawConfig> = {};

  if (opts.provider) overrides.provider = opts.provider as 'anthropic' | 'openai' | 'local';
  if (opts.model) overrides.model = opts.model as string;
  if (opts.apiKey) overrides.apiKey = opts.apiKey as string;
  if (opts.dryRun) overrides.dryRun = true;
  if (opts.sessionDir) overrides.sessionDir = opts.sessionDir as string;
  if (opts.logDir) overrides.logDir = opts.logDir as string;
  if (opts.logLevel) overrides.logLevel = opts.logLevel as 'debug' | 'info' | 'warn' | 'error';
  if (opts.stream === false) overrides.streamResponse = false;

  return overrides;
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
