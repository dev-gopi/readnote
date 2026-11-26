// Cleans extracted text
export class TextCleaner {
  clean(text: string): string {
    return text
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
