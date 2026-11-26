import type { StoreName } from '../shared/types';

// IndexedDB wrapper for large data
export class IndexedDBManager {
  private readonly dbName: string;
  private readonly version: number;
  private db: IDBDatabase | null = null;
  private readonly stores: readonly StoreName[] = ['notes', 'highlights', 'pages'];

  constructor(dbName = 'ReadNoteAI', version = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        this.stores.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: StoreName, item: T): Promise<IDBValidKey> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).put(item);
      request.onsuccess = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async get<T = unknown>(storeName: StoreName, id: IDBValidKey): Promise<T | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result as T | undefined);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll<T = unknown>(storeName: StoreName): Promise<T[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve((request.result as T[]) ?? []);
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(storeName: StoreName, id: IDBValidKey): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).delete(id);
      request.onsuccess = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
