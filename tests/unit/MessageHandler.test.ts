/// <reference types="jest" />
import { MessageHandler } from '../../src/background/handlers/MessageHandler';
import type { ExtensionResponse } from '../../src/shared/types';

function setupChromeMocks(pageText: string, selectedText = '') {
  const store: Record<string, unknown> = {};
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      lastError: undefined,
      onMessage: { addListener: jest.fn() },
    },
    storage: {
      local: {
        get: (keys: string[], cb: (res: Record<string, unknown>) => void) => {
          const out: Record<string, unknown> = {};
          keys.forEach((k) => {
            if (k in store) out[k] = store[k];
          });
          cb(out);
        },
        set: (items: Record<string, unknown>, cb: () => void) => {
          Object.assign(store, items);
          cb();
        },
        remove: (keys: string[], cb: () => void) => {
          keys.forEach((k) => delete store[k]);
          cb();
        },
        clear: (cb: () => void) => {
          Object.keys(store).forEach((k) => delete store[k]);
          cb();
        },
      },
    },
    tabs: {
      sendMessage: (_tabId: number, _msg: unknown, cb: (res: ExtensionResponse) => void) => {
        cb({
          success: true,
          content: {
            title: 'Test Article',
            url: 'https://example.com/article',
            text: pageText,
            html: `<p>${pageText}</p>`,
            selectedText,
          },
        });
      },
    },
  };
}

async function dispatch(
  handler: MessageHandler,
  type: string,
  payload?: Record<string, unknown>
): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    void handler.handleMessage(
      { type, ...(payload ? { payload } : {}) },
      { tab: { id: 1, url: 'https://example.com/article', title: 'Test Article' } } as Parameters<
        MessageHandler['handleMessage']
      >[1],
      resolve
    );
  });
}

describe('MessageHandler end-to-end features', () => {
  const sampleArticle = [
    'Photosynthesis converts sunlight into chemical energy inside plant chloroplasts.',
    'Chlorophyll pigments absorb blue and red wavelengths while reflecting green light.',
    'During the light-dependent reactions, water molecules split and release oxygen gas.',
    'The Calvin cycle then uses ATP and NADPH to fix carbon dioxide into glucose sugars.',
    'Plants rely on glucose for cellular respiration and structural cellulose growth.',
  ].join(' ');

  beforeEach(() => {
    setupChromeMocks(sampleArticle);
  });

  test('handles SAVE_NOTE with tags, UPDATE_NOTE, GET_NOTES, and DELETE_NOTE', async () => {
    const handler = new MessageHandler();
    const saveRes = await dispatch(handler, 'SAVE_NOTE', {
      text: 'Remember Calvin cycle',
      tags: ['Biology', '#study'],
    });
    expect(saveRes.success).toBe(true);
    const noteId = (saveRes.data as { id: string; tags: string[] }).id;
    expect((saveRes.data as { tags: string[] }).tags).toEqual(['biology', 'study']);

    const updRes = await dispatch(handler, 'UPDATE_NOTE', {
      id: noteId,
      text: 'Updated note text',
      tags: ['exam'],
    });
    expect(updRes.success).toBe(true);

    const listRes = await dispatch(handler, 'GET_NOTES');
    expect((listRes.data as unknown[]).length).toBe(1);

    const delRes = await dispatch(handler, 'DELETE_NOTE', { id: noteId });
    expect(delRes.success).toBe(true);
  });

  test('supports all AI_SUMMARIZE styles (brief, bullets, detailed, study)', async () => {
    const handler = new MessageHandler();
    for (const style of ['brief', 'bullets', 'detailed', 'study'] as const) {
      const res = await dispatch(handler, 'AI_SUMMARIZE', { tabId: 1, style });
      expect(res.success).toBe(true);
      expect(res.summary).toContain('Test Article');
      if (style === 'brief') expect(res.summary).toContain('TL;DR:');
      if (style === 'study') expect(res.summary).toContain('Key Concepts:');
    }
  });

  test('generates quiz questions and supports IMPORT_DATA idempotently', async () => {
    const handler = new MessageHandler();
    const quizRes = await dispatch(handler, 'GENERATE_QUIZ', { tabId: 1 });
    expect(quizRes.success).toBe(true);
    const questions = quizRes.data as Array<{ question: string; options: string[]; answer: string }>;
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]?.options).toContain(questions[0]?.answer);

    const importRes = await dispatch(handler, 'IMPORT_DATA', {
      notes: [{ id: 'imp-1', text: 'Imported note', pageUrl: 'https://a.com', pageTitle: 'A', tags: ['backup'] }],
      highlights: [{ id: 'hl-1', text: 'Imported highlight', color: '#fef08a', pageUrl: 'https://a.com', pageTitle: 'A' }],
    });
    expect(importRes.success).toBe(true);
    expect(importRes.data).toEqual({ notesImported: 1, highlightsImported: 1 });
  });

  test('translates text via TRANSLATE_TEXT using Google Translate response format', async () => {
    const handler = new MessageHandler();
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [[['হ্যালো বিশ্ব', 'Hello world']]],
    });

    const res = await dispatch(handler, 'TRANSLATE_TEXT', {
      text: 'Hello world',
      targetLang: 'bn',
    });
    expect(res.success).toBe(true);
    expect(res.data).toBe('হ্যালো বিশ্ব');
  });
});
