/**
 * Plugin System Types / 插件系統類型
 * Phase 2 Round 12 - Plugin system foundation / 插件系統基礎
 */

import { Tool } from '../tools/base.js';
import { ClawConfig } from '../types/index.js';

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export interface PluginContext {
  config: ClawConfig;
  registerTool: (tool: Tool) => void;
  unregisterTool: (name: string) => void;
  getLogger: () => unknown;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  entry: string;
  dependencies?: string[];
}
