import type { SyncItem, SyncResult } from '../shared/types';
import type { SyncService } from '../services/SyncService';
import type { LocalStorage } from './LocalStorage';

// Manages sync between local and remote storage
export class SyncManager {
  private readonly local: LocalStorage;
  private readonly syncService: SyncService;
  private lastSync: string | null = null;

  constructor(localStore: LocalStorage, syncService: SyncService) {
    this.local = localStore;
    this.syncService = syncService;
  }

  async sync(): Promise<SyncResult> {
    try {
      const localData = await this.local.get<SyncItem[]>('sync_data');
      const remoteData = await this.syncService.fetch();
      const merged = this._merge(localData, remoteData);
      await this.local.set('sync_data', merged);
      await this.syncService.push(merged);
      this.lastSync = new Date().toISOString();
      return { success: true, lastSync: this.lastSync };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  private _merge(local: SyncItem[] | null, remote: SyncItem[] | null): SyncItem[] {
    // Simple last-write-wins merge by updatedAt timestamp
    const map: Record<string, SyncItem> = {};
    [...(local ?? []), ...(remote ?? [])].forEach((item) => {
      const existing = map[item.id];
      if (!existing || item.updatedAt > existing.updatedAt) {
        map[item.id] = item;
      }
    });
    return Object.values(map);
  }
}
