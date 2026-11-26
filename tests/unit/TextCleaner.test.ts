// Unit tests for TextCleaner
import { TextCleaner } from '../../src/content/extraction/TextCleaner';

describe('TextCleaner', () => {
  const cleaner = new TextCleaner();

  it('collapses multiple spaces', () => {
    expect(cleaner.clean('hello    world')).toBe('hello world');
  });

  it('replaces tabs with spaces', () => {
    expect(cleaner.clean('col1\tcol2')).toBe('col1 col2');
  });

  it('collapses 3+ newlines to double newline', () => {
    expect(cleaner.clean('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('trims leading/trailing whitespace', () => {
    expect(cleaner.clean('  trimmed  ')).toBe('trimmed');
  });
});
