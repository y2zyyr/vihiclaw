/**
 * Packager / 打包器
 * Phase 2 Round 29 - Package for distribution / 打包分發
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface PackageInfo {
  name: string;
  version: string;
  files: string[];
  size: number;
}

export class Packager {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Get package info / 獲取包信息
   */
  getInfo(): PackageInfo | null {
    const packageJsonPath = join(this.projectPath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      return {
        name: pkg.name || 'unknown',
        version: pkg.version || '0.0.0',
        files: pkg.files || ['dist'],
        size: 0, // Would need fs.stat for actual size
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate install command / 生成安裝命令
   */
  getInstallCommand(): string {
    const info = this.getInfo();
    if (!info) return '';

    return `npm install -g ${info.name}`;
  }

  /**
   * Check if ready for publish / 檢查是否準備好發布
   */
  checkPublishReady(): { ready: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check package.json / 檢查 package.json
    const packageJsonPath = join(this.projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      issues.push('package.json not found');
      return { ready: false, issues };
    }

    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Required fields / 必填字段
    if (!pkg.name) issues.push('Missing name in package.json');
    if (!pkg.version) issues.push('Missing version in package.json');
    if (!pkg.main) issues.push('Missing main in package.json');
    if (!pkg.bin) issues.push('Missing bin in package.json (for CLI)');

    // Check dist exists / 檢查 dist 是否存在
    if (!existsSync(join(this.projectPath, 'dist'))) {
      issues.push('dist/ directory not found. Run npm run build first.');
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  }
}
