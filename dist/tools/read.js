import fs from 'fs/promises';
import path from 'path';
import { defineTool } from './base.js';
import { ToolError } from '../utils/errors.js';
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
export const readFileTool = defineTool('read_file', 'Read the contents of a file at the specified path. Returns the file content as a string.', {
    type: 'object',
    properties: {
        path: {
            type: 'string',
            description: 'The path to the file to read',
        },
    },
    required: ['path'],
}, async (params, context) => {
    const filePath = path.resolve(context.workingDir, params.path);
    try {
        // Check file size first
        const stats = await fs.stat(filePath);
        if (stats.size > MAX_FILE_SIZE) {
            return {
                success: false,
                content: '',
                error: `File too large (${stats.size} bytes). Max allowed: ${MAX_FILE_SIZE} bytes`,
            };
        }
        const content = await fs.readFile(filePath, 'utf-8');
        context.logger.debug(`Read file: ${filePath}`, { size: content.length });
        return {
            success: true,
            content,
        };
    }
    catch (error) {
        const err = error;
        if (err.code === 'ENOENT') {
            return {
                success: false,
                content: '',
                error: `File not found: ${params.path}`,
            };
        }
        if (err.code === 'EACCES') {
            return {
                success: false,
                content: '',
                error: `Permission denied: ${params.path}`,
            };
        }
        throw new ToolError(`Failed to read file: ${error}`);
    }
}, { isConcurrencySafe: true });
//# sourceMappingURL=read.js.map