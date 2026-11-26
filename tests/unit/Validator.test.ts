// Unit tests for Validator
import { Validator } from '../../src/shared/utils/Validator';

describe('Validator', () => {
  describe('isNonEmptyString', () => {
    it('returns true for a non-empty string', () => {
      expect(Validator.isNonEmptyString('hello')).toBe(true);
    });

    it('returns false for an empty string', () => {
      expect(Validator.isNonEmptyString('')).toBe(false);
    });

    it('returns false for a whitespace-only string', () => {
      expect(Validator.isNonEmptyString('   ')).toBe(false);
    });

    it('returns false for non-strings', () => {
      expect(Validator.isNonEmptyString(42)).toBe(false);
      expect(Validator.isNonEmptyString(null)).toBe(false);
      expect(Validator.isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('returns true for valid URLs', () => {
      expect(Validator.isValidUrl('https://example.com')).toBe(true);
      expect(Validator.isValidUrl('http://localhost:3000/path?q=1')).toBe(true);
    });

    it('returns false for invalid URLs', () => {
      expect(Validator.isValidUrl('not-a-url')).toBe(false);
      expect(Validator.isValidUrl('')).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('strips HTML tags', () => {
      expect(Validator.sanitizeText('<b>hello</b> <script>evil</script>')).toBe('hello evil');
    });

    it('trims whitespace', () => {
      expect(Validator.sanitizeText('  hi  ')).toBe('hi');
    });
  });

  describe('truncate', () => {
    it('returns unchanged text when under the limit', () => {
      expect(Validator.truncate('short', 10)).toBe('short');
    });

    it('truncates and appends ellipsis when over the limit', () => {
      expect(Validator.truncate('hello world', 5)).toBe('hello...');
    });
  });
});
