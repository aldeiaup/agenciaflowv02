/**
 * Tests for security.js utility functions (non-browser-dependent)
 * Run: npm test
 */

describe('Security Module', () => {
  let sec;

  beforeAll(() => {
    // Mock minimal browser crypto and storage
    const storage = {};
    global.crypto = {
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
      subtle: {
        digest: async (algo, data) => {
          // Simple mock hash for testing
          const hash = new Uint8Array(32);
          for (let i = 0; i < 32; i++) {
            hash[i] = data[i % data.length] ? (data[i % data.length] + i) % 256 : i;
          }
          return hash.buffer;
        },
        importKey: async (format, keyData, algo, extractable, usages) => {
          return { type: 'PBKDF2', data: keyData };
        },
        deriveBits: async (algorithm, baseKey, length) => {
          const data = baseKey.data || new TextEncoder().encode('test');
          const hash = new Uint8Array(length / 8);
          for (let i = 0; i < hash.length; i++) {
            const saltByte = algorithm.salt ? algorithm.salt[i % algorithm.salt.length] : 0;
            hash[i] = (data[i % data.length] + saltByte + algorithm.iterations) % 256;
          }
          return hash.buffer;
        },
      },
    };
    global.localStorage = {
      _data: {},
      getItem: (key) => storage[key] || null,
      setItem: (key, val) => { storage[key] = val; },
      removeItem: (key) => { delete storage[key]; },
    };
    global.window = { location: { href: '' } };
    global.navigator = { userAgent: 'test' };

    sec = require('../src/utils/security');
  });

  describe('Email Validation', () => {
    test('validates correct emails', () => {
      expect(sec.validateEmail('test@example.com')).toBe(true);
      expect(sec.validateEmail('user+tag@domain.co')).toBe(true);
      expect(sec.validateEmail('a@b.br')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(sec.validateEmail('')).toBe(false);
      expect(sec.validateEmail('notanemail')).toBe(false);
      expect(sec.validateEmail('@domain.com')).toBe(false);
      expect(sec.validateEmail('user@')).toBe(false);
    });
  });

  describe('Password Strength', () => {
    test('classifies weak passwords', () => {
      const result = sec.validatePasswordStrength('abc');
      expect(result.score).toBeLessThanOrEqual(2);
      expect(result.isStrong).toBe(false);
    });

    test('classifies strong passwords', () => {
      const result = sec.validatePasswordStrength('Abcdef1!');
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.isStrong).toBe(true);
    });
  });

  describe('Token Generation', () => {
    test('generates token with correct length', () => {
      const token = sec.generateToken(64);
      expect(token.length).toBe(64);
    });

    test('generates alphanumeric tokens', () => {
      const token = sec.generateToken(48);
      expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('tracks attempts', () => {
      const email = 'test@example.com';
      const attempts = sec.recordFailedAttempt(email);
      expect(attempts.count).toBeGreaterThanOrEqual(1);
    });

    test('resets attempts', () => {
      const email = 'reset-test@example.com';
      sec.recordFailedAttempt(email);
      sec.resetAttempts(email);
      const remaining = sec.getRemainingAttempts(email);
      expect(remaining).toBe(sec.SEC_CONFIG.maxAttempts);
    });
  });

  describe('Configuration Constants', () => {
    test('has correct security config', () => {
      expect(sec.SEC_CONFIG.maxAttempts).toBe(5);
      expect(sec.SEC_CONFIG.lockoutMinutes).toBe(10);
      expect(sec.SEC_CONFIG.sessionHours).toBe(8);
      expect(sec.SEC_CONFIG.minPasswordLen).toBe(8);
      expect(sec.SEC_CONFIG.saltRounds).toBe(100000);
    });
  });
});
