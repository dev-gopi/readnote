import type { Highlight } from '../../shared/types';
import { StorageKeys } from '../../shared/constants/StorageKeys';
import { LocalStorage } from '../../storage/LocalStorage';

// Persistence for highlights
export class HighlightRepository {
  private readonly key = StorageKeys.HIGHLIGHTS;
  private readonly storage = new LocalStorage();

  private async _getAll(): Promise<Highlight[]> {
    return (await this.storage.get<Highlight[]>(this.key)) ?? [];
  }

  private async _updateAll(
    updater: (items: Highlight[]) => Highlight[]
  ): Promise<Highlight[]> {
    return this.storage.update<Highlight[]>(this.key, (items) => updater([...(items ?? [])]));
  }

  async save(highlight: Highlight): Promise<Highlight> {
    await this._updateAll((items) => {
      // Content scripts may retry a save after the service worker wakes up.
      const existingIndex = items.findIndex((item) => item.id === highlight.id);
      if (existingIndex === -1) return [...items, highlight];
      items[existingIndex] = highlight;
      return items;
    });
    return highlight;
  }

  async findByUrl(url: string): Promise<Highlight[]> {
    const all = await this._getAll();
    return all.filter((h) => h.pageUrl === url);
  }

  async delete(id: string): Promise<void> {
    await this._updateAll((items) => items.filter((item) => item.id !== id));
  }

  async findAll(): Promise<Highlight[]> {
    return this._getAll();
  }
}
