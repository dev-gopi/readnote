import type { ExtractedPage } from '../../shared/types';
import { ArticleDetector } from './ArticleDetector';
import { TextCleaner } from './TextCleaner';

// Extracts clean text content from the page
export class PageExtractor {
  private readonly detector: ArticleDetector;
  private readonly cleaner: TextCleaner;

  constructor() {
    this.detector = new ArticleDetector();
    this.cleaner = new TextCleaner();
  }

  extract(): ExtractedPage {
    const articleEl = this.detector.detect();
    const rawText = articleEl?.innerText || document.body?.innerText || '';
    const cleanedText = this.cleaner.clean(rawText);
    const stats = this.cleaner.getStats(cleanedText);
    return {
      title: this.cleaner.clean(document.title),
      url: window.location.href,
      text: cleanedText,
      html: articleEl ? articleEl.innerHTML : '',
      wordCount: stats.wordCount,
      readingTimeMinutes: stats.readingTimeMinutes,
    };
  }
}
