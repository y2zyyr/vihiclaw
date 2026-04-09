/**
 * Batch File Operations / 批量文件操作
 * Phase 2 Round 9 - Enhanced file system operations / 增強文件系統操作
 */

import fs from 'fs/promises';
import path from 'path';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';

export const batchReadTool = defineTool(
  'batch_read_files',
  'Read multiple files at once / 一次性讀取多個文件',
  {
    type: 'object',
    properties: {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of file paths to read / 要讀取的文件路徑數組',
      },
    },
    required: ['paths'],
  },
  async (params: { paths: string[] }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: `[DRY RUN] Would read ${params.paths.length} files / [模擬運行] 將讀取 ${params.paths.length} 個文件`,
      };
    }

    const results: Array<{ path: string; content?: string; error?: string }> = [];

    for (const filePath of params.paths) {
      try {
        const fullPath = path.resolve(context.workingDir, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        results.push({ path: filePath, content });
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        results.push({
          path: filePath,
          error: err.code === 'ENOENT' ? 'File not found' : err.message,
        });
      }
    }

    const output = results
      .map((r) => {
        if (r.error) {
          return `--- ${r.path} ---\nERROR: ${r.error}\n`;
        }
        return `--- ${r.path} ---\n${r.content}\n`;
      })
      .join('\n');

    return {
      success: true,
      content: output,
    };
  },
  { isConcurrencySafe: true }
);

export const batchWriteTool = defineTool(
  'batch_write_files',
  'Write multiple files at once / 一次性寫入多個文件',
  {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['path', 'content'],
        },
        description: 'Array of {path, content} objects / {路徑, 內容} 對象數組',
      },
    },
    required: ['files'],
  },
  async (params: { files: Array<{ path: string; content: string }> }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: `[DRY RUN] Would write ${params.files.length} files / [模擬運行] 將寫入 ${params.files.length} 個文件`,
      };
    }

    const results: Array<{ path: string; success: boolean; error?: string }> = [];

    for (const file of params.files) {
      try {
        const fullPath = path.resolve(context.workingDir, file.path);
        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, file.content, 'utf-8');
        results.push({ path: file.path, success: true });
      } catch (error) {
        results.push({
          path: file.path,
          success: false,
          error: String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    const output = [
      `Batch write results: ${successCount} succeeded, ${failCount} failed`,
      ...results.map((r) => `  ${r.success ? '✓' : '✗'} ${r.path}${r.error ? `: ${r.error}` : ''}`),
    ].join('\n');

    return {
      success: failCount === 0,
      content: output,
    };
  }
);

export const moveFileTool = defineTool(
  'move_file',
  'Move or rename a file / 移動或重命名文件',
  {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Source file path / 源文件路徑',
      },
      destination: {
        type: 'string',
        description: 'Destination file path / 目標文件路徑',
      },
    },
    required: ['source', 'destination'],
  },
  async (params: { source: string; destination: string }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: `[DRY RUN] Would move ${params.source} → ${params.destination} / [模擬運行] 將移動`,
      };
    }

    try {
      const srcPath = path.resolve(context.workingDir, params.source);
      const dstPath = path.resolve(context.workingDir, params.destination);

      // Ensure destination directory exists
      await fs.mkdir(path.dirname(dstPath), { recursive: true });
      await fs.rename(srcPath, dstPath);

      return {
        success: true,
        content: `Moved: ${params.source} → ${params.destination}`,
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      return {
        success: false,
        content: '',
        error: `Move failed: ${err.code === 'ENOENT' ? 'Source file not found' : err.message}`,
      };
    }
  }
);

export const copyFileTool = defineTool(
  'copy_file',
  'Copy a file / 複製文件',
  {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Source file path / 源文件路徑',
      },
      destination: {
        type: 'string',
        description: 'Destination file path / 目標文件路徑',
      },
    },
    required: ['source', 'destination'],
  },
  async (params: { source: string; destination: string }, context: ToolContext): Promise<ToolResult> => {
    if (context.dryRun) {
      return {
        success: true,
        content: `[DRY RUN] Would copy ${params.source} → ${params.destination} / [模擬運行] 將複製`,
      };
    }

    try {
      const srcPath = path.resolve(context.workingDir, params.source);
      const dstPath = path.resolve(context.workingDir, params.destination);

      // Ensure destination directory exists
      await fs.mkdir(path.dirname(dstPath), { recursive: true });
      await fs.copyFile(srcPath, dstPath);

      return {
        success: true,
        content: `Copied: ${params.source} → ${params.destination}`,
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      return {
        success: false,
        content: '',
        error: `Copy failed: ${err.code === 'ENOENT' ? 'Source file not found' : err.message}`,
      };
    }
  },
  { isConcurrencySafe: true }
);
