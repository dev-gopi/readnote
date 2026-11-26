// Wrapper around chrome.storage.local
export class LocalStorage {
  private static readonly writeQueues = new Map<string, Promise<void>>();

  async get<T = unknown>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve((result[key] as T | undefined) ?? null);
      });
    });
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    return this._enqueueWrite(key, () =>
      new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      })
    );
  }

  /**
   * Read-modify-write operations are queued per key. This prevents two rapid
   * note/highlight actions from both reading an old array and losing a save.
   */
  async update<T>(key: string, updater: (current: T | null) => T): Promise<T> {
    let nextValue: T | undefined;
    await this._enqueueWrite(key, async () => {
      const current = await this.get<T>(key);
      nextValue = updater(current);
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ [key]: nextValue }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      });
    });
    return nextValue as T;
  }

  async remove(key: string): Promise<void> {
    return this._enqueueWrite(key, () =>
      new Promise((resolve, reject) => {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      })
    );
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  async getMultiple(keys: string[]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (values) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(values);
      });
    });
  }

  private _enqueueWrite(key: string, write: () => Promise<void>): Promise<void> {
    const previous = LocalStorage.writeQueues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(write);
    LocalStorage.writeQueues.set(key, current);
    return current.finally(() => {
      if (LocalStorage.writeQueues.get(key) === current) {
        LocalStorage.writeQueues.delete(key);
      }
    });
  }
}
