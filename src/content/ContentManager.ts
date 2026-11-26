import type { ExtensionMessage, ExtensionResponse, Highlight } from '../shared/types';
import { HIGHLIGHT_COLORS } from '../shared/constants/AppConstants';
import { StorageKeys } from '../shared/constants/StorageKeys';
import { ReaderManager } from '../modules/reader/ReaderManager';
import { PageExtractor } from './extraction/PageExtractor';
import { SelectionManager } from './selection/SelectionManager';
import { HighlightManager } from './highlighting/HighlightManager';
import { HighlightRenderer } from './highlighting/HighlightRenderer';

// Coordinates content script modules
export class ContentManager {
  private readonly extractor: PageExtractor;
  private readonly selection: SelectionManager;
  private readonly highlighter: HighlightManager;
  private readonly readingRenderer: HighlightRenderer;
  private readonly reader: ReaderManager;
  private toolbarEl: HTMLElement | null = null;
  private activeReadingEl: HTMLElement | null = null;
  private gotoBtnEl: HTMLElement | null = null;
  private focusOverlayEl: HTMLElement | null = null;
  private isReadingActive = false;
  private isReadingPaused = false;

  constructor() {
    this.extractor = new PageExtractor();
    this.selection = new SelectionManager();
    this.highlighter = new HighlightManager();
    this.readingRenderer = new HighlightRenderer();
    this.reader = new ReaderManager();
  }

  init(): void {
    this.selection.init();
    this.highlighter.init();
    this.registerMessageListener();
    this.registerStorageListener();
    this.registerSelectionToolbar();
    this.registerReadingTracker();
    this.highlighter.observeDOM();
    this.restorePageHighlights();
    console.log('[ContentManager] Initialized on', window.location.href);
  }

  private registerReadingTracker(): void {
    this.reader.setCallbacks({
      onSentenceStart: (sourceSentence) => {
        this.isReadingActive = true;
        this.isReadingPaused = false;
        this.activeReadingEl = this.readingRenderer.highlightReadingSentence(sourceSentence);
        this._updateGoToButtonVisibility();
      },
      onFinish: () => {
        this.isReadingActive = false;
        this.isReadingPaused = false;
        this.readingRenderer.clearReadingHighlight();
        this.activeReadingEl = null;
        this._removeGoToButton();
      },
    });

    window.addEventListener(
      'scroll',
      () => {
        if (this.isReadingActive) {
          this._updateGoToButtonVisibility();
        }
      },
      { passive: true }
    );
  }

  private _updateGoToButtonVisibility(): void {
    if (!this.isReadingActive) {
      this._removeGoToButton();
      return;
    }

    const rect = this.activeReadingEl?.getBoundingClientRect();
    const isOffscreen = rect ? rect.bottom < 0 || rect.top > window.innerHeight : false;

    if (!this.gotoBtnEl) {
      const container = document.createElement('div');
      container.id = 'readnote-goto-reading';
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        background: '#0f172a',
        color: '#ffffff',
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 8px 24px rgba(15,23,42,0.28)',
        fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
        fontSize: '12px',
      });

      const gotoBtn = this._makeToolbarBtn('Go to reading', () => {
        this.activeReadingEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      gotoBtn.dataset['role'] = 'goto';

      const pauseBtn = this._makeToolbarBtn('Pause', () => {
        const state = this.reader.togglePause();
        this.isReadingPaused = state === 'paused';
        pauseBtn.textContent = this.isReadingPaused ? 'Resume' : 'Pause';
      });
      pauseBtn.dataset['role'] = 'pause';

      const stopBtn = this._makeToolbarBtn('Stop', () => {
        this.reader.stop();
      });
      stopBtn.style.background = 'rgba(225, 29, 72, 0.25)';
      stopBtn.style.color = '#fda4af';

      container.append(gotoBtn, pauseBtn, stopBtn);
      document.body.appendChild(container);
      this.gotoBtnEl = container;
    }

    const gotoBtn = this.gotoBtnEl.querySelector<HTMLButtonElement>('[data-role="goto"]');
    if (gotoBtn) {
      gotoBtn.style.display = isOffscreen && this.activeReadingEl ? 'inline-block' : 'none';
    }
    const pauseBtn = this.gotoBtnEl.querySelector<HTMLButtonElement>('[data-role="pause"]');
    if (pauseBtn) {
      pauseBtn.textContent = this.isReadingPaused ? 'Resume' : 'Pause';
    }
  }

  private _removeGoToButton(): void {
    if (this.gotoBtnEl) {
      this.gotoBtnEl.remove();
      this.gotoBtnEl = null;
    }
  }

  private registerSelectionToolbar(): void {
    this.selection.onSelect((text, selection) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }
      if (selection.rangeCount === 0) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      this._showToolbar(rect, text);
    });

    document.addEventListener('mousedown', (e) => {
      if (this.toolbarEl && !this.toolbarEl.contains(e.target as Node)) {
        this._hideToolbar();
      }
    });
  }

  private _showToolbar(rect: DOMRect, selectedText: string): void {
    this._hideToolbar();

    const bar = document.createElement('div');
    bar.id = 'readnote-floating-toolbar';
    Object.assign(bar.style, {
      position: 'fixed',
      top: `${Math.max(8, rect.top - 46)}px`,
      left: `${Math.min(window.innerWidth - 260, Math.max(8, rect.left))}px`,
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '999px',
      boxShadow: '0 8px 24px rgba(15,23,42,0.28)',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
      fontSize: '12px',
    });

    Object.values(HIGHLIGHT_COLORS).forEach((color) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.title = 'Highlight';
      Object.assign(dot.style, {
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        backgroundColor: color,
        border: '1.5px solid rgba(255,255,255,0.35)',
        cursor: 'pointer',
        padding: '0',
      });
      dot.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const item = this.highlighter.highlightSelection(color, selectedText);
        if (item) {
          chrome.runtime.sendMessage({
            type: 'SAVE_HIGHLIGHT',
            payload: {
              id: item.id,
              text: item.text,
              color: item.color,
              pageUrl: window.location.href,
              pageTitle: document.title,
            },
          });
        }
        this._hideToolbar();
      });
      bar.appendChild(dot);
    });

    const noteBtn = this._makeToolbarBtn('Note', () => {
      chrome.runtime.sendMessage({
        type: 'SAVE_NOTE',
        payload: {
          text: selectedText,
          pageUrl: window.location.href,
          pageTitle: document.title,
        },
      });
      this._hideToolbar();
    });

    const readBtn = this._makeToolbarBtn('Read', () => {
      this.reader.stop();
      void this.reader.start(selectedText);
      this._hideToolbar();
    });

    bar.append(noteBtn, readBtn);
    document.body.appendChild(bar);
    this.toolbarEl = bar;
  }

  private _makeToolbarBtn(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    Object.assign(btn.style, {
      border: 'none',
      background: 'rgba(255,255,255,0.12)',
      color: '#f8fafc',
      fontWeight: '600',
      fontSize: '11px',
      padding: '3px 9px',
      borderRadius: '999px',
      cursor: 'pointer',
    });
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onClick();
    });
    return btn;
  }

  private _hideToolbar(): void {
    if (this.toolbarEl) {
      this.toolbarEl.remove();
      this.toolbarEl = null;
    }
  }

  private restorePageHighlights(): void {
    chrome.runtime.sendMessage<ExtensionResponse<Highlight[]>>(
      { type: 'GET_HIGHLIGHTS' },
      (response) => {
        if (chrome.runtime.lastError || !response?.success || !response.data) return;
        const pageHighlights = response.data.filter(
          (h) => h.pageUrl === window.location.href
        );
        this.highlighter.setSavedHighlights(pageHighlights);
      }
    );
  }

  private registerStorageListener(): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      const change = changes[StorageKeys.HIGHLIGHTS];
      if (!change) return;

      const oldList = (change.oldValue as Highlight[] | undefined) ?? [];
      const newList = (change.newValue as Highlight[] | undefined) ?? [];
      const newIds = new Set(newList.map((h) => h.id));

      oldList.forEach((oldItem) => {
        if (!newIds.has(oldItem.id)) {
          this.highlighter.removeHighlight(oldItem.id);
        }
      });

      const pageHighlights = newList.filter((h) => h.pageUrl === window.location.href);
      this.highlighter.setSavedHighlights(pageHighlights);
    });
  }

  registerMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      void this.handleMessage(
        message as ExtensionMessage,
        sendResponse as (response: ExtensionResponse) => void
      );
      return true;
    });
  }

  async handleMessage(
    message: ExtensionMessage,
    sendResponse: (response: ExtensionResponse) => void
  ): Promise<void> {
    switch (message.type) {
      case 'GET_PAGE_CONTENT':
        sendResponse({
          success: true,
          content: {
            ...this.extractor.extract(),
            selectedText: this.selection.getSelectedText(),
          },
        });
        break;

      case 'HIGHLIGHT_SELECTION': {
        const payloadText =
          typeof message.payload?.['text'] === 'string'
            ? message.payload['text']
            : undefined;
        const payloadColor =
          typeof message.payload?.['color'] === 'string'
            ? message.payload['color']
            : undefined;
        const pageLeadText = this.extractor
          .extract()
          .text.split(/(?<=[.!?])\s+/)[0]
          ?.trim();
        const item = this.highlighter.highlightSelection(
          payloadColor,
          payloadText || pageLeadText
        );
        if (!item) {
          sendResponse({ success: false, error: 'No highlightable text found.' });
          return;
        }
        chrome.runtime.sendMessage({
          type: 'SAVE_HIGHLIGHT',
          payload: {
            id: item.id,
            text: item.text,
            color: item.color,
            pageUrl: window.location.href,
            pageTitle: document.title,
          },
        });
        sendResponse({ success: true, data: item });
        break;
      }

      case 'START_READ_ALOUD': {
        const selected = this.selection.getSelectedText();
        const textToRead = selected || this.extractor.extract().text;
        if (!textToRead) {
          sendResponse({ success: false, error: 'No readable text found.' });
          return;
        }
        this.reader.stop();
        await this.reader.start(textToRead);
        sendResponse({ success: true });
        break;
      }

      case 'STOP_READ_ALOUD':
        this.reader.stop();
        sendResponse({ success: true });
        break;

      case 'PAUSE_READ_ALOUD':
        this.reader.pause();
        sendResponse({ success: true });
        break;

      case 'RESUME_READ_ALOUD':
        this.reader.resume();
        sendResponse({ success: true });
        break;

      case 'TOGGLE_READ_ALOUD': {
        const state = this.reader.togglePause();
        this.isReadingPaused = state === 'paused';
        this._updateGoToButtonVisibility();
        sendResponse({ success: true, data: state });
        break;
      }

      case 'SCROLL_TO_HIGHLIGHT': {
        const id = typeof message.payload?.['id'] === 'string' ? message.payload['id'] : '';
        if (!id) {
          sendResponse({ success: false, error: 'Highlight ID is required.' });
          return;
        }
        const target = document.querySelector<HTMLElement>(
          `[data-readnote-highlight="${CSS.escape(id)}"]`
        );
        if (!target) {
          sendResponse({ success: false, error: 'Highlight not found on this page.' });
          return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const prevOutline = target.style.outline;
        target.style.outline = '3px solid #4f46e5';
        setTimeout(() => {
          target.style.outline = prevOutline;
        }, 1600);
        sendResponse({ success: true });
        break;
      }

      case 'TOGGLE_FOCUS_MODE': {
        const active = this._toggleFocusMode();
        sendResponse({ success: true, data: active });
        break;
      }

      default:
        sendResponse({ success: false, error: `Unhandled content message: ${message.type}` });
    }
  }

  private _toggleFocusMode(): boolean {
    if (this.focusOverlayEl) {
      this.focusOverlayEl.remove();
      this.focusOverlayEl = null;
      return false;
    }

    const page = this.extractor.extract();
    const selected = this.selection.getSelectedText().trim();
    const contentText = selected || page.text;
    const paragraphs = contentText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    let fontSize = 18;
    const themes = {
      light: { bg: '#f8fafc', card: '#ffffff', ink: '#0f172a', muted: '#64748b', border: '#e2e8f0' },
      sepia: { bg: '#f4ecd8', card: '#fbf6ea', ink: '#3b2f23', muted: '#7c6a55', border: '#e3d5ba' },
      dark: { bg: '#0b1120', card: '#111827', ink: '#e2e8f0', muted: '#94a3b8', border: '#1e293b' },
    } as const;
    let currentTheme: keyof typeof themes = 'light';

    const overlay = document.createElement('div');
    overlay.id = 'readnote-focus-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      overflowY: 'auto',
      padding: '32px 16px 64px',
      fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
      transition: 'background-color 0.2s ease, color 0.2s ease',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      maxWidth: '720px',
      margin: '0 auto',
      borderRadius: '16px',
      padding: '28px 34px',
      boxShadow: '0 20px 50px rgba(15, 23, 42, 0.16)',
    });

    const topBar = document.createElement('div');
    Object.assign(topBar.style, {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      paddingBottom: '14px',
      marginBottom: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
    });

    const meta = document.createElement('span');
    meta.textContent = `${page.wordCount ?? 0} words · ~${page.readingTimeMinutes ?? 1} min read`;
    meta.style.fontSize = '12px';

    const controls = document.createElement('div');
    Object.assign(controls.style, { display: 'flex', gap: '6px', flexWrap: 'wrap' });

    const bodyEl = document.createElement('div');
    Object.assign(bodyEl.style, { lineHeight: '1.75', fontSize: `${fontSize}px` });

    const applyTheme = (): void => {
      const t = themes[currentTheme];
      overlay.style.background = t.bg;
      overlay.style.color = t.ink;
      card.style.background = t.card;
      card.style.border = `1px solid ${t.border}`;
      topBar.style.borderBottom = `1px solid ${t.border}`;
      meta.style.color = t.muted;
    };

    const makeCtrlBtn = (label: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      Object.assign(btn.style, {
        border: '1px solid rgba(148,163,184,0.35)',
        background: 'rgba(79,70,229,0.1)',
        color: 'inherit',
        borderRadius: '8px',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
      });
      btn.addEventListener('click', onClick);
      return btn;
    };

    controls.append(
      makeCtrlBtn('A-', () => {
        fontSize = Math.max(14, fontSize - 2);
        bodyEl.style.fontSize = `${fontSize}px`;
      }),
      makeCtrlBtn('A+', () => {
        fontSize = Math.min(28, fontSize + 2);
        bodyEl.style.fontSize = `${fontSize}px`;
      }),
      makeCtrlBtn('Theme', () => {
        currentTheme = currentTheme === 'light' ? 'sepia' : currentTheme === 'sepia' ? 'dark' : 'light';
        applyTheme();
      }),
      makeCtrlBtn('Read Aloud', () => {
        this.reader.stop();
        void this.reader.start(contentText);
      }),
      makeCtrlBtn('Close', () => {
        overlay.remove();
        this.focusOverlayEl = null;
      })
    );

    topBar.append(meta, controls);

    const titleEl = document.createElement('h1');
    titleEl.textContent = page.title || 'Focus Reader';
    Object.assign(titleEl.style, {
      fontSize: '26px',
      lineHeight: '1.3',
      margin: '0 0 18px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
    });

    if (paragraphs.length === 0) {
      const p = document.createElement('p');
      p.textContent = contentText || 'No readable content found.';
      bodyEl.appendChild(p);
    } else {
      paragraphs.forEach((para) => {
        const p = document.createElement('p');
        p.textContent = para;
        p.style.margin = '0 0 16px';
        bodyEl.appendChild(p);
      });
    }

    card.append(topBar, titleEl, bodyEl);
    overlay.appendChild(card);
    applyTheme();

    const onKeyDown = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape' && this.focusOverlayEl) {
        this.focusOverlayEl.remove();
        this.focusOverlayEl = null;
        window.removeEventListener('keydown', onKeyDown);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlay);
    this.focusOverlayEl = overlay;
    return true;
  }
}
