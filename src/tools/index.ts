import { ToolRegistry } from './registry.js';
import { readFileTool } from './read.js';
import { writeFileTool } from './write.js';
import { listDirTool } from './dir.js';
import { searchTextTool } from './search.js';
import { runShellTool } from './shell.js';
import { editFileTool } from './edit.js';
import { gitStatusTool, gitDiffTool, gitLogTool } from './git.js';

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // File system tools / 文件系統工具
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(listDirTool);
  registry.register(searchTextTool);
  registry.register(editFileTool);

  // Execution tools / 執行工具
  registry.register(runShellTool);

  // Git tools / Git 工具
  registry.register(gitStatusTool);
  registry.register(gitDiffTool);
  registry.register(gitLogTool);

  return registry;
}

export * from './base.js';
export * from './registry.js';
