/**
 * Environment Checker / 環境檢查器
 * Phase 2 Round 23 - Check runtime environment / 檢查運行時環境
 */

import { execSync } from 'child_process';

export interface EnvironmentCheck {
  name: string;
  installed: boolean;
  version?: string;
  required: boolean;
  message?: string;
}

export class EnvironmentChecker {
  async checkNode(): Promise<EnvironmentCheck> {
    try {
      const version = execSync('node --version', { encoding: 'utf-8' }).trim();
      const major = parseInt(version.slice(1).split('.')[0]);
      return {
        name: 'Node.js',
        installed: true,
        version,
        required: true,
        message: major >= 18 ? undefined : 'Node.js 18+ recommended',
      };
    } catch {
      return {
        name: 'Node.js',
        installed: false,
        required: true,
        message: 'Node.js is required',
      };
    }
  }

  async checkGit(): Promise<EnvironmentCheck> {
    try {
      const version = execSync('git --version', { encoding: 'utf-8' }).trim();
      return {
        name: 'Git',
        installed: true,
        version: version.split(' ')[2],
        required: false,
        message: 'Required for git tools',
      };
    } catch {
      return {
        name: 'Git',
        installed: false,
        required: false,
        message: 'Git tools will not be available',
      };
    }
  }

  async checkDocker(): Promise<EnvironmentCheck> {
    try {
      const version = execSync('docker --version', { encoding: 'utf-8' }).trim();
      return {
        name: 'Docker',
        installed: true,
        version: version.split(' ')[2],
        required: false,
        message: 'Required for docker tools',
      };
    } catch {
      return {
        name: 'Docker',
        installed: false,
        required: false,
        message: 'Docker tools will not be available',
      };
    }
  }

  async runAllChecks(): Promise<EnvironmentCheck[]> {
    return Promise.all([
      this.checkNode(),
      this.checkGit(),
      this.checkDocker(),
    ]);
  }

  formatReport(checks: EnvironmentCheck[]): string {
    const lines = ['Environment Check Report:', ''];

    for (const check of checks) {
      const status = check.installed ? '✓' : '✗';
      const required = check.required ? ' (required)' : ' (optional)';
      const version = check.version ? ` ${check.version}` : '';
      lines.push(`${status} ${check.name}${version}${required}`);
      if (check.message) {
        lines.push(`  ${check.message}`);
      }
    }

    return lines.join('\n');
  }
}
