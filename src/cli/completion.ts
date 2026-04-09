/**
 * Command Completion / 命令補全
 * Phase 2 Round 17 - Smart completion for REPL / REPL 智能補全
 */

import { ToolRegistry } from '../tools/registry.js';
import { CommandHistory } from './history.js';

export interface CompletionContext {
  line: string;
  cursor: number;
  history: CommandHistory;
  toolRegistry: ToolRegistry;
}

export interface CompletionResult {
  completions: string[];
  format?: 'list' | 'inline';
}

export class CommandCompletion {
  private toolRegistry: ToolRegistry;
  private history: CommandHistory;
  private commands = [
    '/help',
    '/resume',
    '/sessions',
    '/clear',
    '/tools',
    '/config',
    '/dryrun',
    '/export',
    '/memory',
    '/exit',
  ];

  constructor(toolRegistry: ToolRegistry, history: CommandHistory) {
    this.toolRegistry = toolRegistry;
    this.history = history;
  }

  complete(context: CompletionContext): CompletionResult {
    const { line, cursor } = context;
    const prefix = line.substring(0, cursor);

    // Command completion / 命令補全
    if (prefix.startsWith('/')) {
      const matches = this.commands.filter(cmd =>
        cmd.toLowerCase().startsWith(prefix.toLowerCase())
      );
      return { completions: matches };
    }

    // History completion / 歷史補全
    const historyMatches = this.history.search(prefix);
    if (historyMatches.length > 0) {
      return { completions: historyMatches.slice(0, 5) };
    }

    return { completions: [] };
  }

  getToolCompletions(): string[] {
    return this.toolRegistry.getAll().map(t => t.name);
  }
}
