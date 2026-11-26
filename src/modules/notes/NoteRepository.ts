import type { Note, NoteUpdates } from '../../shared/types';
import { StorageKeys } from '../../shared/constants/StorageKeys';

// Persistence layer for notes (chrome.storage.local)
export class NoteRepository {
  private readonly key = StorageKeys.NOTES;

  private async _getAll(): Promise<Note[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.key], (result) => {
        resolve((result[this.key] as Note[] | undefined) ?? []);
      });
    });
  }

  private async _setAll(notes: Note[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.key]: notes }, resolve);
    });
  }

  async save(note: Note): Promise<Note> {
    const notes = await this._getAll();
    notes.unshift(note);
    await this._setAll(notes);
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
    const notes = await this._getAll();
    await this._setAll(notes.filter((n) => n.id !== id));
  }

  async update(id: string, updates: NoteUpdates): Promise<Note | null> {
    const notes = await this._getAll();
    const idx = notes.findIndex((n) => n.id === id);
    const existing = notes[idx];
    if (idx !== -1 && existing) {
      const updated: Note = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      notes[idx] = updated;
      await this._setAll(notes);
      return updated;
    }
    return null;
  }
}
