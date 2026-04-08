import { ToolRegistry } from './registry.js';
import { readFileTool } from './read.js';
import { writeFileTool } from './write.js';
import { listDirTool } from './dir.js';
import { searchTextTool } from './search.js';
import { runShellTool } from './shell.js';
import { editFileTool } from './edit.js';
export function createDefaultRegistry() {
    const registry = new ToolRegistry();
    registry.register(readFileTool);
    registry.register(writeFileTool);
    registry.register(listDirTool);
    registry.register(searchTextTool);
    registry.register(runShellTool);
    registry.register(editFileTool);
    return registry;
}
export * from './base.js';
export * from './registry.js';
//# sourceMappingURL=index.js.map