/// <reference types="jest" />
import { LocalStorage } from '../../src/storage/LocalStorage';
import { NoteRepository } from '../../src/modules/notes/NoteRepository';
import { HighlightRepository } from '../../src/modules/highlights/HighlightRepository';
import type { Highlight, Note } from '../../src/shared/types';

function createChromeStorageMock() {
  const store: Record<string, unknown> = {};
  let nextError: string | null = null;

  const chromeMock = {
    runtime: {
      get lastError() {
        return nextError ? { message: nextError } : undefined;
      },
    },
    storage: {
      local: {
        get: (keys: string[], cb: (result: Record<string, unknown>) => void) => {
          setTimeout(() => {
            const out: Record<string, unknown> = {};
            keys.forEach((k) => {
              if (k in store) out[k] = store[k];
            });
            cb(out);
          }, 5);
        },
        set: (items: Record<string, unknown>, cb: () => void) => {
          setTimeout(() => {
            if (!nextError) {
              Object.assign(store, items);
            }
            cb();
          }, 5);
        },
        remove: (keys: string[], cb: () => void) => {
          setTimeout(() => {
            if (!nextError) {
              keys.forEach((k) => delete store[k]);
            }
            cb();
          }, 5);
        },
        clear: (cb: () => void) => {
          setTimeout(() => {
            if (!nextError) {
              Object.keys(store).forEach((k) => delete store[k]);
            }
            cb();
          }, 5);
        },
      },
    },
  };

  return {
    chromeMock,
    setError: (msg: string | null) => {
      nextError = msg;
    },
  };
}

describe('LocalStorage & Repositories', () => {
  let mockCtl: ReturnType<typeof createChromeStorageMock>;

  beforeEach(() => {
    mockCtl = createChromeStorageMock();
    (globalThis as unknown as { chrome: unknown }).chrome = mockCtl.chromeMock;
  });

  test('serializes concurrent update() calls per key without losing writes', async () => {
    const storage = new LocalStorage();
    await Promise.all([
      storage.update<number[]>('nums', (cur) => [...(cur ?? []), 1]),
      storage.update<number[]>('nums', (cur) => [...(cur ?? []), 2]),
      storage.update<number[]>('nums', (cur) => [...(cur ?? []), 3]),
    ]);
    const result = await storage.get<number[]>('nums');
    expect(result).toEqual([1, 2, 3]);
  });

  test('surfaces chrome.runtime.lastError instead of silently failing', async () => {
    const storage = new LocalStorage();
    mockCtl.setError('Quota exceeded');
    await expect(storage.set('k', 'v')).rejects.toThrow('Quota exceeded');
    await expect(storage.get('k')).rejects.toThrow('Quota exceeded');
    await expect(storage.remove('k')).rejects.toThrow('Quota exceeded');
  });

  test('NoteRepository supports atomic-style save, update, findByUrl, and delete', async () => {
    const repo = new NoteRepository();
    const note: Note = {
      id: 'n1',
      text: 'Initial',
      pageUrl: 'https://example.com/a',
      pageTitle: 'Page A',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      tags: ['tag1'],
    };

    await repo.save(note);
    await repo.save(note); // idempotent
    expect(await repo.findAll()).toHaveLength(1);

    const updated = await repo.update('n1', { text: 'Updated', tags: ['tag2'] });
    expect(updated?.text).toBe('Updated');
    expect(updated?.tags).toEqual(['tag2']);
    expect(await repo.findByUrl('https://example.com/a')).toHaveLength(1);

    await repo.delete('n1');
    expect(await repo.findAll()).toHaveLength(0);
  });

  test('HighlightRepository saves idempotently and deletes cleanly', async () => {
    const repo = new HighlightRepository();
    const hl: Highlight = {
      id: 'h1',
      text: 'Important text',
      color: '#fef08a',
      pageUrl: 'https://example.com/a',
      pageTitle: 'Page A',
      createdAt: '2026-01-01T00:00:00.000Z',
      note: '',
    };

    await repo.save(hl);
    await repo.save({ ...hl, color: '#bbf7d0' }); // same id updates in place
    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.color).toBe('#bbf7d0');

    await repo.delete('h1');
    expect(await repo.findAll()).toHaveLength(0);
  });
});
