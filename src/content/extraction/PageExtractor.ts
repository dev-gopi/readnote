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
    const rawText = articleEl ? articleEl.innerText : document.body.innerText;
    return {
      title: document.title,
      url: window.location.href,
      text: this.cleaner.clean(rawText),
      html: articleEl ? articleEl.innerHTML : '',
    };
  }
}
