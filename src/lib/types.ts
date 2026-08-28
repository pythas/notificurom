export type TaskStatus = 'inbox' | 'next' | 'in_progress' | 'waiting' | 'done';

export type TaskSourceType = 'issue' | 'pr' | 'review_request' | 'message' | 'task';

export interface NormalizedItem {
  source: string; // 'github', 'slack', etc.
  sourceType: TaskSourceType;
  sourceId: string; // unique identifier
  title: string;
  url: string;
  repository?: string;
  author?: string;
  authorAvatarUrl?: string;
  isClosed: boolean;
  sourceCreatedAt: string; // ISO 8601
  sourceUpdatedAt?: string; // ISO 8601
  metadata: Record<string, unknown>;
}

export interface Ingestor {
  readonly name: string;
  isEnabled(): Promise<boolean>;
  fetchItems(): Promise<NormalizedItem[]>;
}

export interface SyncResult {
  source: string;
  fetched: number;
  created: number;
  updated: number;
  autoResolved: number;
  errors: string[];
}
