import type { Note, NoteUpdates } from '../../shared/types';
import { NoteRepository } from './NoteRepository';

// Business logic for notes
export class NoteManager {
  private readonly repo: NoteRepository;

  constructor() {
    this.repo = new NoteRepository();
  }

  async createNote(text: string, pageUrl: string, pageTitle: string): Promise<Note> {
    const now = new Date().toISOString();
    const note: Note = {
      id: `note-${Date.now()}`,
      text,
      pageUrl,
      pageTitle,
      createdAt: now,
      updatedAt: now,
      tags: [],
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
