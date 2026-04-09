import fs from 'fs/promises';
import path from 'path';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';
import { ToolError } from '../utils/errors.js';

export const listDirTool = defineTool(
  'list_dir',
  'List the contents of a directory. Returns a formatted list of files and directories.',
  {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the directory to list',
      },
    },
    required: ['path'],
  },
  async (params: { path: string }, context: ToolContext): Promise<ToolResult> => {
    const dirPath = path.resolve(context.workingDir, params.path);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const files: string[] = [];
      const dirs: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs.push(entry.name + '/');
        } else {
          files.push(entry.name);
        }
      }

      // Sort alphabetically
      dirs.sort();
      files.sort();

      const output = [
        `Directory: ${params.path}`,
        `Total: ${entries.length} items`,
        '',
        ...dirs.map(d => `[DIR]  ${d}`),
        ...files.map(f => `[FILE] ${f}`),
      ].join('\n');

      context.logger.debug(`Listed directory: ${dirPath}`, { items: entries.length });

      return {
        success: true,
        content: output,
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return {
          success: false,
          content: '',
          error: `Directory not found: ${params.path}`,
        };
      }
      throw new ToolError(`Failed to list directory: ${error}`);
    }
  },
  { isConcurrencySafe: true }
);
