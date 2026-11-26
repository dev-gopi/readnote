// Detects the main article element on the page
export class ArticleDetector {
  detect(): HTMLElement | null {
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.post-content',
      '.article-body',
      '#content',
    ];
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.innerText.length > 300) return el;
    }
    return null;
  }
}
