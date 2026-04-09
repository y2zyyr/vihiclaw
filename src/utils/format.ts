/**
 * Code Formatter Integration / 代碼格式化器集成
 * Phase 2 Round 25 - Integrate with code formatters / 與代碼格式化器集成
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface FormatOptions {
  write: boolean;
  fix?: boolean;
  check: boolean;
}

export class CodeFormatter {
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  /**
   * Detect available formatter / 檢測可用格式化器
   */
  detectFormatter(): 'prettier' | 'eslint' | 'biome' | null {
    if (existsSync(join(this.workingDir, 'node_modules/.bin/prettier'))) {
      return 'prettier';
    }
    if (existsSync(join(this.workingDir, 'node_modules/.bin/eslint'))) {
      return 'eslint';
    }
    if (existsSync(join(this.workingDir, 'node_modules/.bin/biome'))) {
      return 'biome';
    }
    return null;
  }

  /**
   * Format files / 格式化文件
   */
  async format(files: string[], options: FormatOptions): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const formatter = this.detectFormatter();

    if (!formatter) {
      return {
        success: false,
        output: '',
        error: 'No formatter found. Install prettier, eslint, or biome.',
      };
    }

    const args: string[] = [];

    switch (formatter) {
      case 'prettier':
        args.push(...files);
        if (options.check) args.push('--check');
        if (options.write) args.push('--write');
        break;
      case 'eslint':
        args.push(...files);
        if (options.fix) args.push('--fix');
        break;
      case 'biome':
        args.push('format', ...files);
        if (options.write) args.push('--write');
        break;
    }

    return new Promise((resolve) => {
      const child = spawn(
        join(this.workingDir, 'node_modules/.bin', formatter),
        args,
        { cwd: this.workingDir }
      );

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout || stderr,
          error: code !== 0 ? `Formatter exited with code ${code}` : undefined,
        });
      });
    });
  }
}
