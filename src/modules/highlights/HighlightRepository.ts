import type { Highlight } from '../../shared/types';
import { StorageKeys } from '../../shared/constants/StorageKeys';

// Persistence for highlights
export class HighlightRepository {
  private readonly key = StorageKeys.HIGHLIGHTS;

  private async _getAll(): Promise<Highlight[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.key], (r) => {
        resolve((r[this.key] as Highlight[] | undefined) ?? []);
      });
    });
  }

  private async _setAll(items: Highlight[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.key]: items }, resolve);
    });
  }

  async save(highlight: Highlight): Promise<Highlight> {
    const all = await this._getAll();
    all.push(highlight);
    await this._setAll(all);
    return highlight;
  }

  async findByUrl(url: string): Promise<Highlight[]> {
    const all = await this._getAll();
    return all.filter((h) => h.pageUrl === url);
  }

  async delete(id: string): Promise<void> {
    const all = await this._getAll();
    await this._setAll(all.filter((h) => h.id !== id));
  }

  async findAll(): Promise<Highlight[]> {
    return this._getAll();
  }
}
