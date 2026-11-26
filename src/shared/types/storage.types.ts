export type StoreName = 'notes' | 'highlights' | 'pages';

export interface SyncItem {
  id: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface SyncResult {
  success: boolean;
  lastSync?: string | null;
  error?: string;
}

export interface SyncFetchResponse<T = SyncItem> {
  data?: T[];
}
