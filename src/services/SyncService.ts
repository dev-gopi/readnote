import type { SyncFetchResponse, SyncItem } from '../shared/types';
import type { ApiClient } from './ApiClient';

// Remote sync operations
export class SyncService {
  private readonly client: ApiClient;

  constructor(apiClient: ApiClient) {
    this.client = apiClient;
  }

  async fetch(): Promise<SyncItem[]> {
    const response = await this.client.get<SyncFetchResponse<SyncItem>>('/sync/data');
    return response.data ?? [];
  }

  async push(data: SyncItem[]): Promise<unknown> {
    return this.client.post('/sync/data', { data });
  }
}
