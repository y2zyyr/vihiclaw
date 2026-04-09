/**
 * Enhanced Safety Checks / 增強安全檢查
 * Phase 2 Round 19 - Comprehensive security validation / 全面安全驗證
 */

import path from 'path';

export interface SafetyConfig {
  blockedPaths: string[];
  allowedCommands: string[];
  maxFileSize: number;
  maxDepth: number;
  requireConfirmation: boolean;
}

export interface SafetyResult {
  allowed: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
}

export class SafetyChecker {
  private config: SafetyConfig;

  constructor(config: SafetyConfig) {
    this.config = config;
  }

  /**
   * Check if file operation is safe / 檢查文件操作是否安全
   */
  checkFileOperation(filePath: string, operation: 'read' | 'write' | 'delete'): SafetyResult {
    const resolved = path.resolve(filePath);

    // Check blocked paths / 檢查阻擋路徑
    for (const blocked of this.config.blockedPaths) {
      if (resolved.startsWith(path.resolve(blocked))) {
        return {
          allowed: false,
          reason: `Access to blocked path: ${blocked}`,
          severity: 'high',
        };
      }
    }

    // Write operations need extra checks / 寫入操作需要額外檢查
    if (operation === 'write' || operation === 'delete') {
      // Check for system directories / 檢查系統目錄
      const systemDirs = ['/bin', '/sbin', '/usr/bin', '/System'];
      for (const sysDir of systemDirs) {
        if (resolved.startsWith(sysDir)) {
          return {
            allowed: false,
            reason: `Cannot modify system directory: ${sysDir}`,
            severity: 'high',
          };
        }
      }
    }

    return { allowed: true, severity: 'low' };
  }

  /**
   * Check if shell command is safe / 檢查 shell 命令是否安全
   */
  checkShellCommand(command: string): SafetyResult {
    const cmd = command.trim().split(' ')[0];

    // Check allowed commands / 檢查允許的命令
    if (this.config.allowedCommands.length > 0) {
      if (!this.config.allowedCommands.includes(cmd)) {
        return {
          allowed: false,
          reason: `Command not in allowlist: ${cmd}`,
          severity: 'high',
        };
      }
    }

    // Block dangerous patterns / 阻擋危險模式
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      />\s*\/dev\/null/,
      /curl.*\|.*sh/,
      /wget.*\|.*sh/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: 'Dangerous command pattern detected',
          severity: 'high',
        };
      }
    }

    return { allowed: true, severity: 'low' };
  }

  /**
   * Check if requires confirmation / 檢查是否需要確認
   */
  requiresConfirmation(operation: string, _target: string): boolean {
    if (!this.config.requireConfirmation) {
      return false;
    }

    const destructiveOps = ['delete', 'remove', 'rm', 'overwrite'];
    return destructiveOps.some(op => operation.toLowerCase().includes(op));
  }
}

// Default safety configuration / 默認安全配置
export const defaultSafetyConfig: SafetyConfig = {
  blockedPaths: [
    '~/.ssh',
    '~/.gnupg',
    '/etc',
    '/usr/local/etc',
  ],
  allowedCommands: [
    'ls',
    'cat',
    'grep',
    'find',
    'git',
    'npm',
    'node',
    'python',
    'pip',
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxDepth: 10,
  requireConfirmation: true,
};
