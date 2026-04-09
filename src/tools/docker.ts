/**
 * Docker Tools / Docker 工具
 * Phase 2 Round 20 - Docker integration / Docker 集成
 */

import { spawn } from 'child_process';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';

function runDockerCommand(
  args: string[],
  cwd: string,
  timeout = 60000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn('docker', args, { cwd });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeout);

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    child.on('error', () => {
      clearTimeout(timeoutId);
      resolve({ stdout: '', stderr: 'Docker not available', exitCode: 1 });
    });
  });
}

export const dockerPsTool = defineTool(
  'docker_ps',
  'List running Docker containers / 列出運行中的 Docker 容器',
  {
    type: 'object',
    properties: {
      all: {
        type: 'boolean',
        description: 'Show all containers (including stopped) / 顯示所有容器（包括已停止）',
      },
    },
  },
  async (params: { all?: boolean }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: '[DRY RUN] Would list Docker containers',
      };
    }

    const args = ['ps'];
    if (params.all) args.push('-a');

    const result = await runDockerCommand(args, context.workingDir);

    return {
      success: result.exitCode === 0,
      content: result.stdout || result.stderr,
      error: result.exitCode !== 0 ? `Docker exit code: ${result.exitCode}` : undefined,
    };
  },
  { isConcurrencySafe: true }
);

export const dockerImagesTool = defineTool(
  'docker_images',
  'List Docker images / 列出 Docker 镜像',
  {
    type: 'object',
    properties: {},
  },
  async (_params: unknown, context: ToolContext): Promise<ToolResult> => {
    const result = await runDockerCommand(['images'], context.workingDir);

    return {
      success: result.exitCode === 0,
      content: result.stdout || result.stderr,
      error: result.exitCode !== 0 ? `Docker exit code: ${result.exitCode}` : undefined,
    };
  },
  { isConcurrencySafe: true }
);

export const dockerLogsTool = defineTool(
  'docker_logs',
  'Get logs from a Docker container / 獲取 Docker 容器日誌',
  {
    type: 'object',
    properties: {
      container: {
        type: 'string',
        description: 'Container ID or name / 容器 ID 或名稱',
      },
      tail: {
        type: 'number',
        description: 'Number of lines to show / 顯示行數',
        default: 100,
      },
    },
    required: ['container'],
  },
  async (params: { container: string; tail?: number }, context: ToolContext): Promise<ToolResult> => {
    const args = ['logs', '--tail', String(params.tail || 100), params.container];
    const result = await runDockerCommand(args, context.workingDir);

    return {
      success: result.exitCode === 0,
      content: result.stdout || result.stderr,
      error: result.exitCode !== 0 ? `Docker exit code: ${result.exitCode}` : undefined,
    };
  },
  { isConcurrencySafe: true }
);
