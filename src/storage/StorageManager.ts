import type { StoreName } from '../shared/types';
import { LocalStorage } from './LocalStorage';
import { IndexedDBManager } from './IndexedDBManager';

// Facade over storage backends
export class StorageManager {
  private readonly local: LocalStorage;
  private readonly idb: IndexedDBManager;

  constructor() {
    this.local = new LocalStorage();
    this.idb = new IndexedDBManager();
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.local.get<T>(key);
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    return this.local.set(key, value);
  }

  async remove(key: string): Promise<void> {
    return this.local.remove(key);
  }

  async clear(): Promise<void> {
    return this.local.clear();
  }

  // Large data via IndexedDB
  async saveBlob<T>(storeName: StoreName, item: T): Promise<IDBValidKey> {
    return this.idb.put(storeName, item);
  }

  async getBlob<T = unknown>(storeName: StoreName, id: IDBValidKey): Promise<T | undefined> {
    return this.idb.get<T>(storeName, id);
  }
}
