import type { Highlight, Note } from '../types';

// Input validation utilities
export class Validator {
  static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidNote(note: Partial<Note> | null | undefined): note is Note {
    return Boolean(
      note &&
        this.isNonEmptyString(note.text) &&
        typeof note.pageUrl === 'string' &&
        this.isValidUrl(note.pageUrl)
    );
  }

  static isValidHighlight(
    highlight: Partial<Highlight> | null | undefined
  ): highlight is Highlight {
    return Boolean(
      highlight &&
        this.isNonEmptyString(highlight.text) &&
        typeof highlight.pageUrl === 'string' &&
        this.isValidUrl(highlight.pageUrl)
    );
  }

  static sanitizeText(text: unknown): string {
    return String(text).replace(/<[^>]*>/g, '').trim();
  }

  static truncate(text: string, maxLength = 500): string {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }
}
