import type {
  ExtensionMessage,
  ExtensionResponse,
  ExtractedPage,
  QuizQuestion,
  SummaryStyle,
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
          const tags = Array.isArray(payload?.['tags'])
            ? payload['tags'].filter((t): t is string => typeof t === 'string')
            : [];
          const note = await this.noteManager.createNote(text, pageUrl, pageTitle, tags);
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

        case 'UPDATE_NOTE': {
          const id = typeof payload?.['id'] === 'string' ? payload['id'] : '';
          const text = typeof payload?.['text'] === 'string' ? payload['text'].trim() : '';
          const tags = Array.isArray(payload?.['tags'])
            ? payload['tags'].filter((tag): tag is string => typeof tag === 'string')
            : undefined;
          if (!id || !text) {
            sendResponse({ success: false, error: 'A note ID and text are required.' });
            return;
          }
          const note = await this.noteManager.updateNote(id, { text, ...(tags ? { tags } : {}) });
          if (!note) {
            sendResponse({ success: false, error: 'Note no longer exists.' });
            return;
          }
          sendResponse({ success: true, data: note });
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
          const rawStyle = typeof payload?.['style'] === 'string' ? payload['style'] : 'bullets';
          const style: SummaryStyle =
            rawStyle === 'brief' || rawStyle === 'detailed' || rawStyle === 'study'
              ? rawStyle
              : 'bullets';
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

          const summary = this._buildExtractiveSummary(title, sourceText, style);
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

        case 'IMPORT_DATA': {
          const notes = Array.isArray(payload?.['notes']) ? payload['notes'] : [];
          const highlights = Array.isArray(payload?.['highlights']) ? payload['highlights'] : [];
          let notesImported = 0;
          let highlightsImported = 0;

          for (const raw of notes) {
            if (!raw || typeof raw !== 'object') continue;
            const item = raw as Record<string, unknown>;
            const text = typeof item['text'] === 'string' ? item['text'].trim() : '';
            if (!text) continue;
            const pageUrl = typeof item['pageUrl'] === 'string' ? item['pageUrl'] : '';
            const pageTitle = typeof item['pageTitle'] === 'string' ? item['pageTitle'] : 'Imported Note';
            const tags = Array.isArray(item['tags'])
              ? item['tags'].filter((t): t is string => typeof t === 'string')
              : [];
            const id = typeof item['id'] === 'string' ? item['id'] : undefined;
            await this.noteManager.createNote(text, pageUrl, pageTitle, tags, id);
            notesImported += 1;
          }

          for (const raw of highlights) {
            if (!raw || typeof raw !== 'object') continue;
            const item = raw as Record<string, unknown>;
            const text = typeof item['text'] === 'string' ? item['text'].trim() : '';
            if (!text) continue;
            const pageUrl = typeof item['pageUrl'] === 'string' ? item['pageUrl'] : '';
            const pageTitle = typeof item['pageTitle'] === 'string' ? item['pageTitle'] : 'Imported Highlight';
            const color = typeof item['color'] === 'string' ? item['color'] : undefined;
            const id = typeof item['id'] === 'string' ? item['id'] : undefined;
            await this.highlightService.createHighlight(text, pageUrl, pageTitle, color, id);
            highlightsImported += 1;
          }

          sendResponse({
            success: true,
            data: { notesImported, highlightsImported },
          });
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

  private _buildExtractiveSummary(
    title: string,
    text: string,
    style: SummaryStyle = 'bullets'
  ): string {
    const sentences = this._splitSentences(text).filter(
      (sentence) => sentence.length > 25 && sentence.length < 420
    );
    const words = this._tokenize(text);
    const wordCount = words.length;
    const readMins = Math.max(1, Math.ceil(wordCount / 200));

    // Extract top keywords (excluding common stop words)
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'were', 'been', 'into', 'than', 'them',
      'they', 'will', 'your', 'also', 'more', 'most', 'some', 'such', 'only', 'each',
      'about', 'after', 'again', 'against', 'between', 'could', 'every', 'first',
      'found', 'great', 'house', 'large', 'might', 'never', 'other', 'place',
      'point', 'right', 'shall', 'should', 'since', 'small', 'sound', 'still',
      'study', 'their', 'there', 'these', 'thing', 'think', 'those', 'three',
      'under', 'water', 'where', 'which', 'while', 'world', 'would', 'write',
      'years', 'being', 'having', 'doing', 'using', 'based', 'within', 'without',
    ]);
    const freq = new Map<string, number>();
    words.forEach((word) => {
      if (word.length >= 4 && !stopWords.has(word)) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    });
    const topKeywords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);

    const header = [
      title,
      `${wordCount} words · ${sentences.length} sentences · ~${readMins} min read`,
      topKeywords.length > 0 ? `Key Topics: ${topKeywords.slice(0, 6).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (sentences.length === 0) {
      const preview = text.slice(0, 600).trim();
      return `${header}\n\n${preview}${text.length > 600 ? '...' : ''}`;
    }

    // Score sentences by keyword overlap and position, then preserve original order
    // MMR-style selection keeps takeaways informative without repeating the
    // same point in several differently worded sentences.
    const selected: Array<{ sentence: string; index: number; tokens: Set<string> }> = [];
    const targetCount =
      style === 'brief'
        ? Math.min(3, Math.max(1, sentences.length))
        : style === 'detailed'
          ? Math.min(12, Math.max(4, Math.ceil(sentences.length / 5)))
          : Math.min(7, Math.max(3, Math.ceil(sentences.length / 8)));
    const candidates = sentences.map((sentence, index) => ({
      sentence,
      index,
      tokens: new Set(this._tokenize(sentence).filter((word) => !stopWords.has(word))),
    }));
    while (selected.length < targetCount && candidates.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      candidates.forEach((candidate, index) => {
        const keywordScore = topKeywords.reduce(
          (score, keyword) => score + (candidate.tokens.has(keyword) ? 3 : 0),
          0
        );
        const positionBonus = candidate.index < 3 ? 1.2 : 0;
        const redundancy = selected.reduce((max, prior) => {
          const shared = [...candidate.tokens].filter((word) => prior.tokens.has(word)).length;
          const union = new Set([...candidate.tokens, ...prior.tokens]).size || 1;
          return Math.max(max, shared / union);
        }, 0);
        const score = keywordScore + positionBonus - redundancy * 3;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });
      selected.push(candidates.splice(bestIndex, 1)[0]!);
    }

    const ordered = selected.sort((a, b) => a.index - b.index);

    if (style === 'brief') {
      return `${header}\n\nTL;DR:\n${ordered.map((item) => item.sentence).join(' ')}`;
    }

    if (style === 'study') {
      const takeaways = ordered.map((item) => `• ${item.sentence}`);
      const reviewPrompts = topKeywords
        .slice(0, 3)
        .map((kw, i) => `${i + 1}. Explain the role of "${kw}" in this text.`);
      return [
        header,
        `\nKey Concepts:\n${topKeywords.map((kw) => `#${kw}`).join('  ') || 'None detected'}`,
        `\nStudy Takeaways:\n${takeaways.join('\n\n')}`,
        reviewPrompts.length > 0 ? `\nSelf-Check Prompts:\n${reviewPrompts.join('\n')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    const takeaways = ordered.map((item) => `• ${item.sentence}`);
    const sectionLabel = style === 'detailed' ? 'Detailed Summary' : 'Key Takeaways';
    return `${header}\n\n${sectionLabel}:\n${takeaways.join('\n\n')}`;
  }

  private _buildQuizQuestions(text: string): QuizQuestion[] {
    const sentences = this._splitSentences(text).filter(
      (sentence) => sentence.length > 35 && sentence.length < 280
    );
    const stopWords = new Set(['about', 'after', 'before', 'could', 'every', 'first', 'other', 'should', 'their', 'there', 'these', 'those', 'which', 'while', 'would']);
    const frequency = new Map<string, number>();
    this._tokenize(text).forEach((word) => {
      if (word.length >= 5 && !stopWords.has(word)) frequency.set(word, (frequency.get(word) ?? 0) + 1);
    });
    const candidateWords = [...frequency.keys()].sort(
      (a, b) => (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0) || a.localeCompare(b)
    );

    const questions: QuizQuestion[] = [];
    for (const sentence of sentences) {
      if (questions.length >= 6) break;
      const wordsInSentence = this._tokenize(sentence).filter((word) => frequency.has(word));
      const answer = wordsInSentence.sort(
        (a, b) => (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0) || b.length - a.length
      )[0];
      if (!answer) continue;

      const distractors = candidateWords
        .filter((word) => word !== answer && !wordsInSentence.includes(word))
        .slice(0, 3);
      if (distractors.length < 3) continue;

      const blanked = sentence.replace(new RegExp(`\\b${answer}\\b`, 'i'), '_____');
      const choices = [answer, ...distractors];
      const offset = questions.length % choices.length;
      const options = [...choices.slice(offset), ...choices.slice(0, offset)];
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

  private _splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?।！？])\s+/u)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  private _tokenize(text: string): string[] {
    return text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
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
