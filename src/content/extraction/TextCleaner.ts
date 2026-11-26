// Cleans extracted text and computes reading statistics
export class TextCleaner {
  clean(text: string): string {
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[(?:\d+|citation needed|edit)\]/gi, '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  getStats(text: string): { wordCount: number; readingTimeMinutes: number } {
    const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    return { wordCount, readingTimeMinutes };
  }
}
