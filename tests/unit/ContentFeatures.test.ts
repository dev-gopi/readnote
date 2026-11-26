/// <reference types="jest" />
/** @jest-environment jsdom */
import { TextCleaner } from '../../src/content/extraction/TextCleaner';
import { ArticleDetector } from '../../src/content/extraction/ArticleDetector';
import { HighlightRenderer } from '../../src/content/highlighting/HighlightRenderer';

describe('Content extraction and cross-node highlighting', () => {
  test('TextCleaner strips zero-width chars, citations, and computes stats', () => {
    const cleaner = new TextCleaner();
    const cleaned = cleaner.clean('Hello\u200B world[1] \u201Ctest\u201D[citation needed]');
    expect(cleaned).toBe('Hello world "test"');
    const stats = cleaner.getStats('One two three four five');
    expect(stats.wordCount).toBe(5);
    expect(stats.readingTimeMinutes).toBe(1);
  });

  test('ArticleDetector prefers prose-rich article over nav/sidebar boilerplate', () => {
    document.body.innerHTML = `
      <nav class="nav">
        <a href="#">Home</a><a href="#">About</a><a href="#">Contact</a>
        This navigation bar has links and some text to exceed length if needed.
      </nav>
      <article>
        <p>${'Artificial intelligence enables faster reading comprehension and synthesis. '.repeat(6)}</p>
        <p>${'Careful note taking improves long term retention across complex topics. '.repeat(6)}</p>
        <p>${'Structured summaries help learners review key concepts efficiently. '.repeat(6)}</p>
      </article>
      <footer class="footer">Copyright 2026 Privacy Terms Cookie Notice</footer>
    `;
    // jsdom does not compute innerText from layout, so mirror textContent onto innerText for elements
    document.querySelectorAll<HTMLElement>('nav, article, footer, p').forEach((el) => {
      Object.defineProperty(el, 'innerText', {
        get: () => el.textContent ?? '',
        configurable: true,
      });
    });

    const detector = new ArticleDetector();
    const detected = detector.detect();
    expect(detected?.tagName).toBe('ARTICLE');
  });

  test('HighlightRenderer highlights text spanning across inline elements', () => {
    document.body.innerHTML = `
      <p id="p1">ReadNote makes <strong>cross-node</strong> <a href="#">highlighting</a> work cleanly.</p>
    `;
    const renderer = new HighlightRenderer();
    const ok = renderer.highlightTextInDocument(
      'makes cross-node highlighting work',
      'hl-123',
      '#fef08a'
    );
    expect(ok).toBe(true);
    const marks = document.querySelectorAll('[data-readnote-highlight="hl-123"]');
    expect(marks.length).toBeGreaterThanOrEqual(2);

    const readingEl = renderer.highlightReadingSentence('ReadNote makes cross-node highlighting');
    expect(readingEl).not.toBeNull();
    renderer.clearReadingHighlight();
    expect(document.querySelector('.readnote-reading-active')).toBeNull();
  });
});
