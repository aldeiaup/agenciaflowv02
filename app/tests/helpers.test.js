/**
 * Tests for helpers.js
 * Run: npm test
 */

describe('Helpers Module', () => {
  let h;

  beforeAll(() => {
    // Mock browser globals needed by helpers
    global.COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#F97316', '#A855F7', '#EAB308', '#EC4899', '#06B6D4'];
    global.TODAY = '2026-03-17';
    global.document = {
      createElement: () => {
        let _text = '';
        return {
          style: {},
          appendChild: () => {},
          remove: () => {},
          querySelectorAll: () => [],
          set textContent(v) { _text = String(v); },
          get textContent() { return _text; },
          get innerHTML() {
            // Simple HTML entity encoding simulation
            return _text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          },
        };
      },
      body: {
        appendChild: () => {},
        insertAdjacentHTML: () => {},
      },
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    h = require('../src/utils/helpers');
  });

  describe('Date Utilities', () => {
    test('fmtDate formats date', () => {
      expect(h.fmtDate('2026-03-17')).toBe('17/03/2026');
    });

    test('fmtDate handles null', () => {
      expect(h.fmtDate(null)).toBe('\u2014');
    });

    test('isLate detects overdue tasks', () => {
      expect(h.isLate('2026-03-15', 'doing')).toBe(true);
      expect(h.isLate('2026-03-15', 'done')).toBe(false);
    });
  });

  describe('String Utilities', () => {
    test('capitalize capitalizes first letter', () => {
      expect(h.capitalize('hello')).toBe('Hello');
    });

    test('capitalize handles empty', () => {
      expect(h.capitalize('')).toBe('');
    });

    test('truncate shortens long strings', () => {
      const long = 'a'.repeat(100);
      expect(h.truncate(long, 10).length).toBe(11);
    });
  });

  describe('Array Utilities', () => {
    test('unique removes duplicates', () => {
      expect(h.unique([1, 1, 2, 3, 3])).toEqual([1, 2, 3]);
    });

    test('groupBy groups by key', () => {
      const items = [
        { type: 'A', val: 1 },
        { type: 'B', val: 2 },
        { type: 'A', val: 3 },
      ];
      const grouped = h.groupBy(items, 'type');
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
    });
  });

  describe('ID Generation', () => {
    test('genId returns a number', () => {
      const id = h.genId();
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });
  });

  describe('Timer', () => {
    test('formatTimer formats seconds', () => {
      expect(h.formatTimer(3661)).toBe('01:01:01');
      expect(h.formatTimer(0)).toBe('00:00:00');
      expect(h.formatTimer(3600)).toBe('01:00:00');
    });
  });

  describe('Sanitize', () => {
    test('sanitize escapes HTML', () => {
      const result = h.sanitize('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    test('sanitize handles null', () => {
      expect(h.sanitize(null)).toBe('');
    });

    test('sanitize handles normal strings', () => {
      expect(h.sanitize('Hello World')).toBe('Hello World');
    });
  });
});
