/**
 * Code Indexer / 代碼索引器
 * Phase 2 Round 16 - Index code for faster navigation / 索引代碼以實現更快速導航
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import';
  filePath: string;
  line: number;
  column: number;
}

export interface FileIndex {
  path: string;
  symbols: CodeSymbol[];
  imports: string[];
  exports: string[];
}

export class CodeIndexer {
  private index: Map<string, FileIndex> = new Map();
  private symbolMap: Map<string, CodeSymbol[]> = new Map();

  async indexDirectory(dirPath: string, _patterns: string[] = ['**/*.ts', '**/*.js']): Promise<void> {
    // Simplified implementation without glob
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          await this.indexFile(path.join(dirPath, entry.name));
        }
      }
    } catch {
      // Ignore errors
    }
  }

  async indexFile(filePath: string): Promise<FileIndex | null> {
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const symbols = this.extractSymbols(content, filePath);
      const imports = this.extractImports(content);
      const exports = this.extractExports(content);

      const fileIndex: FileIndex = {
        path: filePath,
        symbols,
        imports,
        exports,
      };

      this.index.set(filePath, fileIndex);

      // Update symbol map / 更新符號映射
      for (const symbol of symbols) {
        const existing = this.symbolMap.get(symbol.name) || [];
        existing.push(symbol);
        this.symbolMap.set(symbol.name, existing);
      }

      return fileIndex;
    } catch {
      return null;
    }
  }

  private extractSymbols(content: string, filePath: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');

    // Simple regex-based extraction / 簡單基於正則的提取
    const patterns = [
      { type: 'function' as const, regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/ },
      { type: 'function' as const, regex: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/ },
      { type: 'class' as const, regex: /^(?:export\s+)?class\s+(\w+)/ },
      { type: 'interface' as const, regex: /^(?:export\s+)?interface\s+(\w+)/ },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          symbols.push({
            name: match[1],
            type: pattern.type,
            filePath,
            line: i + 1,
            column: line.indexOf(match[1]) + 1,
          });
        }
      }
    }

    return symbols;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const regex = /^import\s+.*?\s+from\s+['"]([^'"]+)['"];?$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const regex = /^export\s+(?:default\s+)?(?:class|function|interface|const|let|var)?\s*(\w+)?/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        exports.push(match[1]);
      }
    }
    return exports;
  }

  findSymbol(name: string): CodeSymbol[] {
    return this.symbolMap.get(name) || [];
  }

  searchSymbols(query: string): CodeSymbol[] {
    const results: CodeSymbol[] = [];
    for (const [name, symbols] of this.symbolMap) {
      if (name.toLowerCase().includes(query.toLowerCase())) {
        results.push(...symbols);
      }
    }
    return results;
  }

  getFileIndex(path: string): FileIndex | undefined {
    return this.index.get(path);
  }

  getAllFiles(): FileIndex[] {
    return Array.from(this.index.values());
  }

  clear(): void {
    this.index.clear();
    this.symbolMap.clear();
  }
}
