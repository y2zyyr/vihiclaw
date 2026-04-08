import { z } from 'zod';
import { ClawConfig } from '../types/index.js';

// Zod schema for config validation
export const configSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'local']).default('anthropic'),
  model: z.string().default('claude-sonnet-4-6'),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  maxIterations: z.number().int().min(1).max(1000).default(50),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().optional(),
  dryRun: z.boolean().default(false),
  confirmDestructive: z.boolean().default(true),
  allowedShellCommands: z.array(z.string()).default([
    'ls', 'cat', 'echo', 'grep', 'find', 'head', 'tail', 'wc', 'pwd', 'which'
  ]),
  blockedPaths: z.array(z.string()).default(['.env', '.ssh', '.aws', '.npmrc']),
  sessionDir: z.string().default('~/.claw/sessions'),
  logDir: z.string().default('~/.claw/logs'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  streamResponse: z.boolean().default(true),
  saveSession: z.boolean().default(true),
});

export type ConfigSchema = z.infer<typeof configSchema>;

// Default configuration
export const DEFAULT_CONFIG: Partial<ClawConfig> = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  maxIterations: 50,
  temperature: 0.7,
  dryRun: false,
  confirmDestructive: true,
  allowedShellCommands: ['ls', 'cat', 'echo', 'grep', 'find', 'head', 'tail', 'wc', 'pwd', 'which'],
  blockedPaths: ['.env', '.ssh', '.aws', '.npmrc'],
  sessionDir: '~/.claw/sessions',
  logDir: '~/.claw/logs',
  logLevel: 'info',
  streamResponse: true,
  saveSession: true,
};
