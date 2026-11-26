import type { Note, NoteUpdates } from '../../shared/types';
import { NoteRepository } from './NoteRepository';

// Business logic for notes
export class NoteManager {
  private readonly repo: NoteRepository;

  constructor() {
    this.repo = new NoteRepository();
  }

  async createNote(
    text: string,
    pageUrl: string,
    pageTitle: string,
    tags: string[] = [],
    id?: string
  ): Promise<Note> {
    const now = new Date().toISOString();
    const cleanTags = Array.from(
      new Set(tags.map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))
    ).slice(0, 12);
    const note: Note = {
      id:
        id ||
        `note-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      text,
      pageUrl,
      pageTitle,
      createdAt: now,
      updatedAt: now,
      tags: cleanTags,
    };
    await this.repo.save(note);
    return note;
  }

  async getNotesByPage(url: string): Promise<Note[]> {
    return this.repo.findByUrl(url);
  }

  async getAllNotes(): Promise<Note[]> {
    return this.repo.findAll();
  }

  async deleteNote(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async updateNote(id: string, updates: NoteUpdates): Promise<Note | null> {
    return this.repo.update(id, updates);
  }
}
