/**
 * Memory System Types / 記憶系統類型
 * Inspired by MemPalace analysis - 5-layer architecture / 受 MemPalace 啟發的五層架構
 *
 * Layer 1: Facts / 事實層 - Raw memory items
 * Layer 2: Index / 索引層 - Vector + keyword + metadata
 * Layer 3: Derived / 派生層 - Summaries, preferences, decisions
 * Layer 4: Working Memory / 工作記憶層 - Context packs for agents
 * Layer 5: Audit / 審計層 - Provenance and traceability
 */

export interface MemoryItem {
  id: string;
  sourceType: 'conversation' | 'tool_execution' | 'file_change' | 'decision' | 'error';
  sourcePath?: string;
  contentRaw: string;
  timestamp: string;
  actor?: string;
  project?: string;
  topic?: string;
  entityRefs?: string[];
  provenance: string;
  hash: string;
  ingestRunId: string;
  sessionId: string;
}

export interface MemoryDerivation {
  id: string;
  derivationType: 'summary' | 'preference' | 'principle' | 'decision_chain' | 'timeline';
  content: string;
  sourceMemoryIds: string[];
  generatedAt: string;
  generatedBy: string;
  promptVersion: string;
  confidence: number;
  obsoleteFlag: boolean;
  validFrom?: string;
  validTo?: string;
  supersededBy?: string;
}

export interface MemoryLink {
  id: string;
  fromId: string;
  toId: string;
  linkType: 'derived_from' | 'supersedes' | 'contradicts' | 'relates_to' | 'part_of';
  strength: number;
  createdAt: string;
}

export interface ContextPack {
  id: string;
  packType: 'coding' | 'decision' | 'summary' | 'entity';
  targetTask: string;
  timeRange?: { from: string; to: string };
  keyEntities: string[];
  rawFragments: MemoryItem[];
  derivedSummaries: MemoryDerivation[];
  openQuestions?: string[];
  conflictPoints?: string[];
  evidenceGaps?: string[];
  assembledAt: string;
}

export interface AuditRecord {
  id: string;
  runType: 'ingest' | 'summarize' | 'repair' | 'conflict_check';
  runId: string;
  startedAt: string;
  completedAt?: string;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  errors: string[];
}

export interface MemorySearchResult {
  item: MemoryItem;
  score: number;
  matchType: 'vector' | 'keyword' | 'metadata';
}

export interface MemorySearchOptions {
  query?: string;
  sourceTypes?: MemoryItem['sourceType'][];
  projects?: string[];
  topics?: string[];
  entities?: string[];
  sessionId?: string;
  timeRange?: { from: string; to: string };
  limit?: number;
  offset?: number;
}
