import fs from 'fs/promises';
import path from 'path';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';
import { ToolError } from '../utils/errors.js';

/**
 * Apply a text edit to file content.
 * Supports: exact replacement, line-based replacement, insertion
 */
function applyEdit(
  content: string,
  oldText: string,
  newText: string,
  lineNumber?: number
): { success: boolean; result: string; error?: string } {
  if (lineNumber !== undefined) {
    // Line-based edit
    const lines = content.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) {
      return {
        success: false,
        result: content,
        error: `Line number ${lineNumber} is out of range (1-${lines.length})`,
      };
    }

    // Try exact match on the line
    const lineIndex = lineNumber - 1;
    if (lines[lineIndex].includes(oldText)) {
      lines[lineIndex] = lines[lineIndex].replace(oldText, newText);
      return { success: true, result: lines.join('\n') };
    }

    // If oldText is empty, insert at the beginning of the line
    if (oldText === '') {
      lines[lineIndex] = newText + lines[lineIndex];
      return { success: true, result: lines.join('\n') };
    }

    return {
      success: false,
      result: content,
      error: `Old text not found on line ${lineNumber}: "${oldText}"`,
    };
  }

  // Full-text replacement
  if (!content.includes(oldText)) {
    return {
      success: false,
      result: content,
      error: `Old text not found in file: "${oldText.substring(0, 100)}..."`,
    };
  }

  // Replace first occurrence
  const result = content.replace(oldText, newText);
  return { success: true, result };
}

export const editFileTool = defineTool(
  'edit_file',
  'Edit a file by replacing text. Supports exact text replacement or line-based edits. Creates a backup before editing.',
  {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to edit',
      },
      oldText: {
        type: 'string',
        description: 'The text to replace (or empty for line insertion)',
      },
      newText: {
        type: 'string',
        description: 'The new text to insert',
      },
      lineNumber: {
        type: 'number',
        description: 'Optional: specific line number to edit (1-based)',
      },
    },
    required: ['path', 'oldText', 'newText'],
  },
  async (
    params: { path: string; oldText: string; newText: string; lineNumber?: number },
    context: ToolContext
  ): Promise<ToolResult> => {
    const filePath = path.resolve(context.workingDir, params.path);

    try {
      // Read current content
      const content = await fs.readFile(filePath, 'utf-8');

      // Apply edit
      const editResult = applyEdit(content, params.oldText, params.newText, params.lineNumber);

      if (!editResult.success) {
        return {
          success: false,
          content: '',
          error: editResult.error,
        };
      }

      if (context.dryRun) {
        context.logger.info(`[DRY RUN] Would edit: ${filePath}`);
        return {
          success: true,
          content: `[DRY RUN] Would edit ${params.path}:\n- Removed: ${params.oldText.substring(0, 100)}...\n+ Added: ${params.newText.substring(0, 100)}...`,
        };
      }

      // Create backup
      const backupPath = `${filePath}.backup`;
      await fs.writeFile(backupPath, content, 'utf-8');

      // Write new content
      await fs.writeFile(filePath, editResult.result, 'utf-8');

      context.logger.info(`Edited file: ${filePath}`);

      return {
        success: true,
        content: `Successfully edited ${params.path}. Backup saved to ${params.path}.backup`,
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return {
          success: false,
          content: '',
          error: `File not found: ${params.path}`,
        };
      }
      throw new ToolError(`Failed to edit file: ${error}`);
    }
  }
);
