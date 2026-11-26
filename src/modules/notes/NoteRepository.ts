import type { Note, NoteUpdates } from '../../shared/types';
import { StorageKeys } from '../../shared/constants/StorageKeys';
import { LocalStorage } from '../../storage/LocalStorage';

// Persistence layer for notes (chrome.storage.local)
export class NoteRepository {
  private readonly key = StorageKeys.NOTES;
  private readonly storage = new LocalStorage();

  private async _getAll(): Promise<Note[]> {
    return (await this.storage.get<Note[]>(this.key)) ?? [];
  }

  private async _updateAll(updater: (notes: Note[]) => Note[]): Promise<Note[]> {
    return this.storage.update<Note[]>(this.key, (notes) => {
      // Never mutate a value received from chrome.storage in place.
      return updater([...(notes ?? [])]);
    });
  }

  async save(note: Note): Promise<Note> {
    await this._updateAll((notes) => [note, ...notes.filter((item) => item.id !== note.id)]);
    return note;
  }

  async findAll(): Promise<Note[]> {
    return this._getAll();
  }

  async findByUrl(url: string): Promise<Note[]> {
    const notes = await this._getAll();
    return notes.filter((n) => n.pageUrl === url);
  }

  async delete(id: string): Promise<void> {
    await this._updateAll((notes) => notes.filter((note) => note.id !== id));
  }

  async update(id: string, updates: NoteUpdates): Promise<Note | null> {
    let updated: Note | null = null;
    await this._updateAll((notes) =>
      notes.map((existing) => {
        if (existing.id !== id) return existing;
        updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    return updated;
  }
}
