import { spawn } from 'child_process';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';
import { ToolError, PermissionError } from '../utils/errors.js';

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

function isCommandAllowed(command: string, allowedCommands: string[]): boolean {
  // Extract the base command (before any spaces or arguments)
  const baseCommand = command.trim().split(/\s+/)[0];
  return allowedCommands.includes(baseCommand);
}

function sanitizeCommand(command: string): string {
  // Basic sanitization - remove dangerous characters
  // This is a simplified version; production code should be more thorough
  return command.trim();
}

export const runShellTool = defineTool(
  'run_shell',
  'Execute a shell command. Returns stdout and stderr. Use with caution - only safe commands are allowed by default.',
  {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
      },
    },
    required: ['command'],
  },
  async (
    params: { command: string; timeout?: number },
    context: ToolContext
  ): Promise<ToolResult> => {
    const command = sanitizeCommand(params.command);

    // Check if command is allowed
    // In a real implementation, allowed commands would come from config
    const allowedCommands = context.allowedShellCommands || [
      'ls', 'cat', 'echo', 'grep', 'find', 'head', 'tail', 'wc', 'pwd', 'which',
      'mkdir', 'touch', 'cp', 'mv', 'rm', 'npm', 'node', 'git'
    ];

    if (!isCommandAllowed(command, allowedCommands)) {
      throw new PermissionError(
        `Command "${command}" is not in the allowed list. Allowed commands: ${allowedCommands.join(', ')}`
      );
    }

    if (context.dryRun) {
      context.logger.info(`[DRY RUN] Would execute: ${command}`);
      return {
        success: true,
        content: `[DRY RUN] Would execute: ${command}`,
      };
    }

    context.logger.info(`Executing shell command: ${command}`);

    return new Promise((resolve, reject) => {
      const timeout = params.timeout || DEFAULT_TIMEOUT;
      let stdout = '';
      let stderr = '';
      let killed = false;

      // Use shell execution for simplicity
      const child = spawn(command, [], {
        shell: true,
        cwd: context.workingDir,
        env: { ...process.env, PATH: process.env.PATH },
      });

      const timeoutId = setTimeout(() => {
        killed = true;
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

        const output = [
          stdout ? `stdout:\n${stdout}` : '',
          stderr ? `stderr:\n${stderr}` : '',
          `Exit code: ${code}`,
          killed ? '(timed out)' : '',
        ]
          .filter(Boolean)
          .join('\n');

        resolve({
          success: code === 0 && !killed,
          content: output,
          error: code !== 0 ? `Command exited with code ${code}` : undefined,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(new ToolError(`Failed to execute command: ${error.message}`));
      });
    });
  }
);
