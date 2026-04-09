/**
 * Lint Runner / 代碼檢查運行器
 * Phase 2 Round 27 - Run linters on code / 在代碼上運行檢查器
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface LintResult {
  success: boolean;
  issues: LintIssue[];
  output: string;
}

export interface LintIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  rule?: string;
}

export class LintRunner {
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  async runESLint(files?: string[]): Promise<LintResult> {
    const eslintPath = join(this.workingDir, 'node_modules/.bin/eslint');

    if (!existsSync(eslintPath)) {
      return {
        success: false,
        issues: [],
        output: 'ESLint not found. Run: npm install eslint',
      };
    }

    const args = ['--format', 'json'];
    if (files && files.length > 0) {
      args.push(...files);
    } else {
      args.push('.');
    }

    return new Promise((resolve) => {
      const child = spawn(eslintPath, args, {
        cwd: this.workingDir,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const issues = this.parseESLintOutput(stdout);
        resolve({
          success: code === 0,
          issues,
          output: stdout || stderr,
        });
      });
    });
  }

  private parseESLintOutput(output: string): LintIssue[] {
    try {
      const results = JSON.parse(output);
      const issues: LintIssue[] = [];

      for (const result of results) {
        for (const message of result.messages) {
          issues.push({
            file: result.filePath,
            line: message.line,
            column: message.column,
            severity: message.severity === 2 ? 'error' : 'warning',
            message: message.message,
            rule: message.ruleId,
          });
        }
      }

      return issues;
    } catch {
      return [];
    }
  }

  formatIssues(issues: LintIssue[]): string {
    if (issues.length === 0) {
      return 'No lint issues found.';
    }

    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    const lines = [
      `Lint Results: ${errors.length} errors, ${warnings.length} warnings`,
      '',
    ];

    for (const issue of issues.slice(0, 10)) {
      const icon = issue.severity === 'error' ? '✗' : '⚠';
      lines.push(`${icon} ${issue.file}:${issue.line}:${issue.column} - ${issue.message}`);
      if (issue.rule) {
        lines.push(`   (${issue.rule})`);
      }
    }

    if (issues.length > 10) {
      lines.push(`... and ${issues.length - 10} more`);
    }

    return lines.join('\n');
  }
}