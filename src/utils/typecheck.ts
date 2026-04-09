/**
 * Type Checker Integration / 類型檢查器集成
 * Phase 2 Round 26 - Integrate with TypeScript / 與 TypeScript 集成
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface TypeCheckResult {
  success: boolean;
  errors: TypeError[];
  output: string;
}

export interface TypeError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
}

export class TypeChecker {
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  async check(): Promise<TypeCheckResult> {
    if (!existsSync(join(this.workingDir, 'tsconfig.json'))) {
      return {
        success: false,
        errors: [],
        output: 'No tsconfig.json found',
      };
    }

    const tscPath = join(this.workingDir, 'node_modules/.bin/tsc');
    if (!existsSync(tscPath)) {
      return {
        success: false,
        errors: [],
        output: 'TypeScript not found. Run: npm install typescript',
      };
    }

    return new Promise((resolve) => {
      const child = spawn(tscPath, ['--noEmit'], {
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
        const errors = this.parseErrors(stdout + stderr);
        resolve({
          success: code === 0,
          errors,
          output: stdout + stderr,
        });
      });
    });
  }

  private parseErrors(output: string): TypeError[] {
    const errors: TypeError[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse TypeScript error format: file(line,col): error TScode: message
      const match = line.match(/^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: parseInt(match[4]),
          message: match[5],
        });
      }
    }

    return errors;
  }

  formatErrors(errors: TypeError[]): string {
    if (errors.length === 0) {
      return 'No type errors found.';
    }

    const lines = [`Found ${errors.length} type errors:`, ''];

    for (const error of errors.slice(0, 10)) {
      lines.push(`${error.file}:${error.line}:${error.column} - TS${error.code}: ${error.message}`);
    }

    if (errors.length > 10) {
      lines.push(`... and ${errors.length - 10} more`);
    }

    return lines.join('\n');
  }
}
