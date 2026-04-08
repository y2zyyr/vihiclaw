import fs from 'fs/promises';
import path from 'path';
import { defineTool } from './base.js';
import { ToolContext, ToolResult } from '../types/index.js';
import { ToolError } from '../utils/errors.js';

const MAX_RESULTS = 100;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

async function searchInFile(
  filePath: string,
  pattern: string,
  caseSensitive: boolean
): Promise<Array<{ line: number; content: string }>> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const results: Array<{ line: number; content: string }> = [];

  const flags = caseSensitive ? '' : 'i';
  const regex = new RegExp(pattern, flags);

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      results.push({ line: i + 1, content: lines[i].trim() });
    }
  }

  return results;
}

async function searchInDirectory(
  dirPath: string,
  pattern: string,
  caseSensitive: boolean,
  results: Array<{ file: string; line: number; content: string }>,
  depth = 0,
  maxDepth = 5
): Promise<void> {
  if (depth > maxDepth || results.length >= MAX_RESULTS) {
    return;
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (results.length >= MAX_RESULTS) break;

    const fullPath = path.join(dirPath, entry.name);

    // Skip hidden files and directories
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      // Skip node_modules and common directories
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      await searchInDirectory(fullPath, pattern, caseSensitive, results, depth + 1, maxDepth);
    } else if (entry.isFile()) {
      // Check file size
      try {
        const stats = await fs.stat(fullPath);
        if (stats.size > MAX_FILE_SIZE) continue;

        const fileResults = await searchInFile(fullPath, pattern, caseSensitive);
        for (const result of fileResults) {
          results.push({
            file: fullPath,
            line: result.line,
            content: result.content,
          });
          if (results.length >= MAX_RESULTS) break;
        }
      } catch {
        // Skip files we can't read
        continue;
      }
    }
  }
}

export const searchTextTool = defineTool(
  'search_text',
  'Search for text patterns in files within a directory. Supports regex patterns. Returns matching lines with file names and line numbers.',
  {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The search pattern (regex supported)',
      },
      path: {
        type: 'string',
        description: 'The directory path to search in (default: current directory)',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Whether the search is case sensitive (default: false)',
      },
    },
    required: ['pattern'],
  },
  async (
    params: { pattern: string; path?: string; caseSensitive?: boolean },
    context: ToolContext
  ): Promise<ToolResult> => {
    const searchPath = path.resolve(context.workingDir, params.path || '.');

    try {
      const results: Array<{ file: string; line: number; content: string }> = [];
      const stats = await fs.stat(searchPath);

      if (stats.isFile()) {
        const fileResults = await searchInFile(searchPath, params.pattern, params.caseSensitive ?? false);
        for (const result of fileResults) {
          results.push({
            file: searchPath,
            line: result.line,
            content: result.content,
          });
        }
      } else {
        await searchInDirectory(searchPath, params.pattern, params.caseSensitive ?? false, results);
      }

      if (results.length === 0) {
        return {
          success: true,
          content: `No matches found for pattern "${params.pattern}"`,
        };
      }

      const output = [
        `Found ${results.length} matches for "${params.pattern}":`,
        '',
        ...results.map((r) => `${r.file}:${r.line}: ${r.content}`),
      ].join('\n');

      context.logger.debug(`Searched for "${params.pattern}"`, { results: results.length });

      return {
        success: true,
        content: output,
      };
    } catch (error) {
      throw new ToolError(`Failed to search: ${error}`);
    }
  }
);
