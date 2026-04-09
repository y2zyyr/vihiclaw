/**
 * Dependency Analyzer / 依賴分析器
 * Phase 2 Round 24 - Analyze project dependencies / 分析項目依賴
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development';
}

export interface DependencyReport {
  projectName: string;
  dependencies: DependencyInfo[];
  devDependencies: DependencyInfo[];
  totalCount: number;
  outdated?: DependencyInfo[];
}

export class DependencyAnalyzer {
  analyze(projectPath: string): DependencyReport | null {
    const packageJsonPath = join(projectPath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const content = readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content);

      const deps: DependencyInfo[] = [];
      const devDeps: DependencyInfo[] = [];

      if (pkg.dependencies) {
        for (const [name, version] of Object.entries(pkg.dependencies)) {
          deps.push({
            name,
            version: version as string,
            type: 'production',
          });
        }
      }

      if (pkg.devDependencies) {
        for (const [name, version] of Object.entries(pkg.devDependencies)) {
          devDeps.push({
            name,
            version: version as string,
            type: 'development',
          });
        }
      }

      return {
        projectName: pkg.name || 'unknown',
        dependencies: deps,
        devDependencies: devDeps,
        totalCount: deps.length + devDeps.length,
      };
    } catch {
      return null;
    }
  }

  formatReport(report: DependencyReport): string {
    const lines = [
      `Project: ${report.projectName}`,
      '',
      `Total Dependencies: ${report.totalCount}`,
      `  Production: ${report.dependencies.length}`,
      `  Development: ${report.devDependencies.length}`,
      '',
      'Key Dependencies:',
    ];

    for (const dep of report.dependencies.slice(0, 10)) {
      lines.push(`  - ${dep.name}@${dep.version}`);
    }

    return lines.join('\n');
  }
}