import fs from 'fs/promises';
import path from 'path';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';
import { ToolError } from '../utils/errors.js';

export const writeFileTool = defineTool(
  'write_file',
  'Write content to a file at the specified path. Creates the file if it does not exist, overwrites if it does.',
  {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to write',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['path', 'content'],
  },
  async (params: { path: string; content: string }, context: ToolContext): Promise<ToolResult> => {
    const filePath = path.resolve(context.workingDir, params.path);

    if (context.dryRun) {
      context.logger.info(`[DRY RUN] Would write to: ${filePath}`);
      return {
        success: true,
        content: `[DRY RUN] Would write ${params.content.length} characters to ${params.path}`,
      };
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, params.content, 'utf-8');
      context.logger.info(`Wrote file: ${filePath}`, { size: params.content.length });

      return {
        success: true,
        content: `Successfully wrote ${params.content.length} characters to ${params.path}`,
      };
    } catch (error) {
      throw new ToolError(`Failed to write file: ${error}`);
    }
  }
);
