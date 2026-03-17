import { describe, test, expect } from 'vitest';
import {
  isAbsoluteUrl,
  extractHostname,
  isMarketingHostname,
  surfaceUrls,
  appendSearchParams,
} from '../surfaceConfig';

describe('isAbsoluteUrl', () => {
  test('recognizes http and https', () => {
    expect(isAbsoluteUrl('http://example.com')).toBe(true);
    expect(isAbsoluteUrl('https://example.com')).toBe(true);
  });

  test('rejects relative paths', () => {
    expect(isAbsoluteUrl('/foo/bar')).toBe(false);
    expect(isAbsoluteUrl('foo')).toBe(false);
  });
});

describe('extractHostname', () => {
  test('extracts hostname from URL', () => {
    expect(extractHostname('https://www.example.com:8080/path')).toBe('www.example.com');
  });

  test('normalizes plain hostname', () => {
    expect(extractHostname('EXAMPLE.COM')).toBe('example.com');
  });

  test('returns empty string for empty input', () => {
    expect(extractHostname('')).toBe('');
  });
});

describe('isMarketingHostname', () => {
  test('default localhost is a marketing host', () => {
    expect(isMarketingHostname('localhost')).toBe(true);
  });
});

describe('surfaceUrls', () => {
  test('all surface URLs are strings', () => {
    expect(typeof surfaceUrls.marketing).toBe('string');
    expect(typeof surfaceUrls.app).toBe('string');
    expect(typeof surfaceUrls.console).toBe('string');
    expect(typeof surfaceUrls.docs).toBe('string');
  });

  test('no trailing slashes (except root path)', () => {
    Object.values(surfaceUrls).forEach((url) => {
      if (url !== '/') {
        expect(url).not.toMatch(/\/$/);
      }
    });
  });
});

describe('appendSearchParams', () => {
  test('appends params to absolute URL', () => {
    const result = appendSearchParams('http://localhost:4100/app', 'foo=bar');
    expect(result).toContain('foo=bar');
  });

  test('appends params to relative URL', () => {
    const result = appendSearchParams('/app', 'foo=bar');
    expect(result).toBe('/app?foo=bar');
  });

  test('returns original URL when search is empty', () => {
    expect(appendSearchParams('/app', '')).toBe('/app');
  });
});
