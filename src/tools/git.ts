import { spawn } from 'child_process';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';
import { ToolError } from '../utils/errors.js';

const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Run git command safely / 安全執行 git 命令
 */
function runGitCommand(
  args: string[],
  cwd: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const child = spawn('git', args, {
      cwd,
      env: { ...process.env, PATH: process.env.PATH },
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeout);

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
      if (stdout.length > MAX_OUTPUT_SIZE) {
        child.kill('SIGTERM');
        stdout = stdout.substring(0, MAX_OUTPUT_SIZE) + '\n... (output truncated)';
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      if (stderr.length > MAX_OUTPUT_SIZE) {
        child.kill('SIGTERM');
        stderr = stderr.substring(0, MAX_OUTPUT_SIZE) + '\n... (output truncated)';
      }
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new ToolError(`Failed to execute git: ${error.message}`));
    });
  });
}

export const gitStatusTool = defineTool(
  'git_status',
  'Check git repository status / 檢查 git 倉庫狀態',
  {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to git repository / git 倉庫路徑',
      },
    },
    required: ['path'],
  },
  async (params: { path: string }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: '[DRY RUN] Would check git status / [模擬運行] 將檢查 git 狀態',
      };
    }

    try {
      const result = await runGitCommand(['status'], params.path);

      return {
        success: result.exitCode === 0,
        content: result.stdout || result.stderr,
        error: result.exitCode !== 0 ? `Git exit code / Git 退出碼: ${result.exitCode}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to check git status / 檢查 git 狀態失敗: ${error}`,
      };
    }
  }
);

export const gitDiffTool = defineTool(
  'git_diff',
  'Show git diff / 顯示 git 差異',
  {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to git repository / git 倉庫路徑',
      },
      staged: {
        type: 'boolean',
        description: 'Show staged changes / 顯示暫存區更改',
      },
    },
    required: ['path'],
  },
  async (params: { path: string; staged?: boolean }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: '[DRY RUN] Would show git diff / [模擬運行] 將顯示 git 差異',
      };
    }

    try {
      const args = params.staged ? ['diff', '--staged'] : ['diff'];
      const result = await runGitCommand(args, params.path);

      return {
        success: result.exitCode === 0,
        content: result.stdout || 'No changes / 無更改',
        error: result.exitCode !== 0 ? `Git exit code / Git 退出碼: ${result.exitCode}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to show git diff / 顯示 git 差異失敗: ${error}`,
      };
    }
  }
);

export const gitLogTool = defineTool(
  'git_log',
  'Show git commit log / 顯示 git 提交日誌',
  {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to git repository / git 倉庫路徑',
      },
      maxCount: {
        type: 'number',
        description: 'Maximum number of commits to show / 顯示的最大提交數',
      },
    },
    required: ['path'],
  },
  async (params: { path: string; maxCount?: number }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: '[DRY RUN] Would show git log / [模擬運行] 將顯示 git 日誌',
      };
    }

    try {
      const args = ['log', '--oneline'];
      if (params.maxCount) {
        args.push(`-${params.maxCount}`);
      }
      const result = await runGitCommand(args, params.path);

      return {
        success: result.exitCode === 0,
        content: result.stdout || 'No commits / 無提交',
        error: result.exitCode !== 0 ? `Git exit code / Git 退出碼: ${result.exitCode}` : undefined,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to show git log / 顯示 git 日誌失敗: ${error}`,
      };
    }
  }
);
