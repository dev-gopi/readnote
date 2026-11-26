import type {
  ExtensionMessage,
  ExtensionResponse,
  ExtractedPage,
  QuizQuestion,
} from '../../shared/types';
import { NoteManager } from '../../modules/notes/NoteManager';
import { HighlightService } from '../../modules/highlights/HighlightService';

// Handles runtime messages from content/popup/sidepanel
export class MessageHandler {
  private readonly noteManager = new NoteManager();
  private readonly highlightService = new HighlightService();

  register(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      void this.handleMessage(
        message as ExtensionMessage,
        sender,
        sendResponse as (response: ExtensionResponse) => void
      );
      return true; // Keep channel open for async response
    });
  }

  async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ): Promise<void> {
    const { type, payload } = message;

    try {
      switch (type) {
        case 'GET_PAGE_CONTENT': {
          const tabId = this._resolveTabId(payload, sender);
          if (tabId === undefined) {
            sendResponse({ success: false, error: 'No active tab found.' });
            return;
          }
          const page = await this._extractPageFromTab(tabId);
          sendResponse({ success: true, content: page });
          break;
        }

        case 'SAVE_NOTE': {
          const text = typeof payload?.['text'] === 'string' ? payload['text'].trim() : '';
          if (!text) {
            sendResponse({ success: false, error: 'Note text cannot be empty.' });
            return;
          }
          const pageUrl =
            typeof payload?.['pageUrl'] === 'string'
              ? payload['pageUrl']
              : (sender.tab?.url ?? '');
          const pageTitle =
            typeof payload?.['pageTitle'] === 'string'
              ? payload['pageTitle']
              : (sender.tab?.title ?? 'Untitled Page');
          const note = await this.noteManager.createNote(text, pageUrl, pageTitle);
          sendResponse({ success: true, data: note });
          break;
        }

        case 'GET_NOTES': {
          const notes = await this.noteManager.getAllNotes();
          sendResponse({ success: true, data: notes });
          break;
        }

        case 'DELETE_NOTE': {
          const id = typeof payload?.['id'] === 'string' ? payload['id'] : '';
          if (!id) {
            sendResponse({ success: false, error: 'Note ID is required.' });
            return;
          }
          await this.noteManager.deleteNote(id);
          sendResponse({ success: true });
          break;
        }

        case 'SAVE_HIGHLIGHT': {
          const text = typeof payload?.['text'] === 'string' ? payload['text'].trim() : '';
          if (!text) {
            sendResponse({ success: false, error: 'Highlight text cannot be empty.' });
            return;
          }
          const pageUrl =
            typeof payload?.['pageUrl'] === 'string'
              ? payload['pageUrl']
              : (sender.tab?.url ?? '');
          const pageTitle =
            typeof payload?.['pageTitle'] === 'string'
              ? payload['pageTitle']
              : (sender.tab?.title ?? 'Untitled Page');
          const color = typeof payload?.['color'] === 'string' ? payload['color'] : undefined;
          const id = typeof payload?.['id'] === 'string' ? payload['id'] : undefined;
          const highlight = await this.highlightService.createHighlight(
            text,
            pageUrl,
            pageTitle,
            color,
            id
          );
          sendResponse({ success: true, data: highlight });
          break;
        }

        case 'GET_HIGHLIGHTS': {
          const highlights = await this.highlightService.getAll();
          sendResponse({ success: true, data: highlights });
          break;
        }

        case 'DELETE_HIGHLIGHT': {
          const id = typeof payload?.['id'] === 'string' ? payload['id'] : '';
          if (!id) {
            sendResponse({ success: false, error: 'Highlight ID is required.' });
            return;
          }
          await this.highlightService.remove(id);
          sendResponse({ success: true });
          break;
        }

        case 'AI_SUMMARIZE': {
          const tabId = this._resolveTabId(payload, sender);
          const customText = typeof payload?.['text'] === 'string' ? payload['text'].trim() : '';
          let sourceText = customText;
          let title = customText ? 'Custom Selection' : 'Current Page';

          if (!sourceText && tabId !== undefined) {
            const page = await this._extractPageFromTab(tabId);
            const selected = page.selectedText?.trim() ?? '';
            if (selected) {
              sourceText = selected;
              title = `${page.title || 'Page'} (Selection)`;
            } else {
              sourceText = page.text;
              title = page.title || title;
            }
          }

          if (!sourceText) {
            sendResponse({
              success: false,
              error: 'Could not extract readable text from this page or selection.',
            });
            return;
          }

          const summary = this._buildExtractiveSummary(title, sourceText);
          sendResponse({ success: true, summary });
          break;
        }

        case 'GENERATE_QUIZ': {
          const tabId = this._resolveTabId(payload, sender);
          if (tabId === undefined) {
            sendResponse({ success: false, error: 'No active tab found.' });
            return;
          }
          const page = await this._extractPageFromTab(tabId);
          const selected = page.selectedText?.trim() ?? '';
          const sourceText = selected || page.text;
          if (!sourceText) {
            sendResponse({
              success: false,
              error: 'Not enough readable text on this page or selection to generate a quiz.',
            });
            return;
          }
          const questions = this._buildQuizQuestions(sourceText);
          sendResponse({ success: true, data: questions });
          break;
        }

        case 'TRANSLATE_TEXT': {
          const text = typeof payload?.['text'] === 'string' ? payload['text'].trim() : '';
          const targetLang =
            typeof payload?.['targetLang'] === 'string' && payload['targetLang']
              ? payload['targetLang']
              : 'bn';
          if (!text) {
            sendResponse({ success: false, error: 'No text to translate.' });
            return;
          }
          const translated = await this._translateText(text, targetLang);
          sendResponse({ success: true, data: translated });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown message type: ${type}` });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error occurred.';
      sendResponse({ success: false, error: msg });
    }
  }

  private _resolveTabId(
    payload: Record<string, unknown> | undefined,
    sender: chrome.runtime.MessageSender
  ): number | undefined {
    const payloadTabId = payload?.['tabId'];
    if (typeof payloadTabId === 'number') return payloadTabId;
    return sender.tab?.id;
  }

  private async _extractPageFromTab(tabId: number): Promise<ExtractedPage> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage<ExtensionResponse>(
        tabId,
        { type: 'GET_PAGE_CONTENT' },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(
              new Error(
                'Cannot access this page. Try reloading the tab or opening a standard web page.'
              )
            );
            return;
          }
          if (response?.content) {
            resolve(response.content);
          } else {
            reject(new Error('No content returned from the page.'));
          }
        }
      );
    });
  }

  private _buildExtractiveSummary(title: string, text: string): string {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 360);

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readMins = Math.max(1, Math.ceil(wordCount / 200));

    // Extract top keywords (excluding common stop words)
    const stopWords = new Set([
      'about', 'after', 'again', 'against', 'between', 'could', 'every', 'first',
      'found', 'great', 'house', 'large', 'might', 'never', 'other', 'place',
      'point', 'right', 'shall', 'should', 'since', 'small', 'sound', 'still',
      'study', 'their', 'there', 'these', 'thing', 'think', 'those', 'three',
      'under', 'water', 'where', 'which', 'while', 'world', 'would', 'write',
      'years', 'being', 'having', 'doing', 'using', 'based', 'within', 'without',
    ]);
    const freq = new Map<string, number>();
    words.forEach((raw) => {
      const clean = raw.toLowerCase().replace(/[^a-z]/g, '');
      if (clean.length >= 5 && !stopWords.has(clean)) {
        freq.set(clean, (freq.get(clean) ?? 0) + 1);
      }
    });
    const topKeywords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);

    const header = [
      title,
      `${wordCount} words · ${sentences.length} sentences · ~${readMins} min read`,
      topKeywords.length > 0 ? `Key Topics: ${topKeywords.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (sentences.length === 0) {
      const preview = text.slice(0, 600).trim();
      return `${header}\n\n${preview}${text.length > 600 ? '...' : ''}`;
    }

    // Score sentences by keyword overlap and position, then preserve original order
    const scored = sentences.map((s, index) => {
      const lower = s.toLowerCase();
      const keywordHits = topKeywords.reduce(
        (acc, kw) => (lower.includes(kw) ? acc + 2 : acc),
        0
      );
      const positionBonus = index < 3 ? 2 : 0;
      return { s, index, score: keywordHits + positionBonus };
    });

    const selected = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .sort((a, b) => a.index - b.index)
      .map((item) => `• ${item.s}`);

    return `${header}\n\nKey Takeaways:\n${selected.join('\n\n')}`;
  }

  private _buildQuizQuestions(text: string): QuizQuestion[] {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 35 && s.length < 240);

    const candidateWords = Array.from(
      new Set(
        text
          .replace(/[^a-zA-Z\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 5)
      )
    );

    const questions: QuizQuestion[] = [];
    for (const sentence of sentences) {
      if (questions.length >= 6) break;
      const wordsInSentence = sentence
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 5);
      const answer = wordsInSentence[0];
      if (!answer) continue;

      const distractors = candidateWords
        .filter((w) => w.toLowerCase() !== answer.toLowerCase())
        .slice(0, 3);
      if (distractors.length < 3) continue;

      const blanked = sentence.replace(new RegExp(`\\b${answer}\\b`), '_____');
      const options = [answer, ...distractors].sort((a, b) => a.localeCompare(b));
      questions.push({
        question: `Complete the statement: "${blanked}"`,
        options,
        answer,
      });
    }

    if (questions.length === 0) {
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      questions.push({
        question: 'Approximately how long is the analyzed text?',
        options: [
          `About ${wordCount} words`,
          '10 words',
          '50,000 words',
          'Empty text',
        ],
        answer: `About ${wordCount} words`,
      });
    }

    return questions;
  }

  private async _translateText(text: string, targetLang: string): Promise<string> {
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= 1400) {
        chunks.push(remaining);
        break;
      }
      let cut = remaining.lastIndexOf('.', 1400);
      if (cut < 400) cut = remaining.lastIndexOf(' ', 1400);
      if (cut <= 0) cut = 1400;
      chunks.push(remaining.slice(0, cut + 1).trim());
      remaining = remaining.slice(cut + 1).trim();
    }

    const translatedParts: string[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(chunk)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Translation failed (${res.status})`);
      }
      const data = (await res.json()) as unknown[];
      const segments = Array.isArray(data[0]) ? (data[0] as unknown[][]) : [];
      const part = segments
        .map((seg) => (typeof seg[0] === 'string' ? seg[0] : ''))
        .join('');
      translatedParts.push(part);
    }

    return translatedParts.join(' ').trim();
  }
}
