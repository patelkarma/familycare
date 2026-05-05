/**
 * Locks in the response interceptor's 429 handling so a backend Retry-After
 * header always gets translated into a friendly user-facing message.
 *
 * Tests the interceptor by registering a mock adapter that synthesizes axios
 * error shapes — same code path the real network would hit, no MSW needed.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api from './axiosInstance';

const installFakeAdapter = (status, headers = {}, data = {}) => {
  const original = api.defaults.adapter;
  api.defaults.adapter = () =>
    Promise.reject({
      response: { status, headers, data },
      config: {},
      isAxiosError: true,
      message: 'Request failed with status code ' + status,
    });
  return () => {
    api.defaults.adapter = original;
  };
};

describe('axios response interceptor — 429 handling', () => {
  beforeEach(() => {
    // Stub window.location for the 401 path so a stray 401 in another test
    // doesn't try to redirect the test runner.
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rewrites 429 error message with Retry-After seconds (plural)', async () => {
    const restore = installFakeAdapter(429, { 'retry-after': '42' });
    try {
      await expect(api.get('/anything')).rejects.toMatchObject({
        message: 'Too many attempts. Try again in 42 seconds.',
      });
    } finally {
      restore();
    }
  });

  it('uses singular "second" when retry-after is exactly 1', async () => {
    const restore = installFakeAdapter(429, { 'retry-after': '1' });
    try {
      await expect(api.get('/anything')).rejects.toMatchObject({
        message: 'Too many attempts. Try again in 1 second.',
      });
    } finally {
      restore();
    }
  });

  it('falls back to a generic message when Retry-After is missing', async () => {
    const restore = installFakeAdapter(429, {});
    try {
      await expect(api.get('/anything')).rejects.toMatchObject({
        message: 'Too many attempts. Please wait a minute and try again.',
      });
    } finally {
      restore();
    }
  });
});
