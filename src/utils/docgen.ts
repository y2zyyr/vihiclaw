/**
 * Documentation Generator / 文檔生成器
 * Phase 2 Round 22 - Auto-generate documentation / 自動生成文檔
 */

import { ToolRegistry } from '../tools/registry.js';

export interface DocGenOptions {
  format: 'markdown' | 'json';
  includeExamples?: boolean;
}

export class DocumentationGenerator {
  generateToolsDocs(registry: ToolRegistry, options: DocGenOptions): string {
    const tools = registry.getAll();

    if (options.format === 'json') {
      return JSON.stringify(
        tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
          isConcurrencySafe: t.isConcurrencySafe,
        })),
        null,
        2
      );
    }

    // Markdown format
    const lines: string[] = [
      '# VIHIclaw Tools Documentation',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total Tools: ${tools.length}`,
      '',
      '## Table of Contents',
      '',
    ];

    for (const tool of tools) {
      lines.push(`- [${tool.name}](#${tool.name})`);
    }

    lines.push('');

    for (const tool of tools) {
      lines.push(`## ${tool.name}`, '');
      lines.push(tool.description);
      lines.push('');
      lines.push('### Parameters');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(tool.parameters, null, 2));
      lines.push('```');
      lines.push('');

      if (tool.isConcurrencySafe) {
        lines.push('⚡ This tool can be executed concurrently with other tools.');
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
