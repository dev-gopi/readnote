import type { ExtensionMessage, ExtensionResponse, Highlight } from '../shared/types';
import { HIGHLIGHT_COLORS } from '../shared/constants/AppConstants';
import { StorageKeys } from '../shared/constants/StorageKeys';
import { ReaderManager } from '../modules/reader/ReaderManager';
import { PageExtractor } from './extraction/PageExtractor';
import { SelectionManager } from './selection/SelectionManager';
import { HighlightManager } from './highlighting/HighlightManager';

// Coordinates content script modules
export class ContentManager {
  private readonly extractor: PageExtractor;
  private readonly selection: SelectionManager;
  private readonly highlighter: HighlightManager;
  private readonly reader: ReaderManager;
  private toolbarEl: HTMLElement | null = null;

  constructor() {
    this.extractor = new PageExtractor();
    this.selection = new SelectionManager();
    this.highlighter = new HighlightManager();
    this.reader = new ReaderManager();
  }

  init(): void {
    this.selection.init();
    this.highlighter.init();
    this.registerMessageListener();
    this.registerStorageListener();
    this.registerSelectionToolbar();
    this.highlighter.observeDOM();
    this.restorePageHighlights();
    console.log('[ContentManager] Initialized on', window.location.href);
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
      top: `${Math.max(8, rect.top - 44)}px`,
      left: `${Math.min(window.innerWidth - 260, Math.max(8, rect.left))}px`,
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 10px',
      background: '#ffffff',
      border: '1px solid #dee2e6',
      borderRadius: '20px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.16)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
    });

    Object.values(HIGHLIGHT_COLORS).forEach((color) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.title = 'Highlight';
      Object.assign(dot.style, {
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: color,
        border: '1px solid rgba(0,0,0,0.2)',
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
      background: '#f0f3ff',
      color: '#4361ee',
      fontWeight: '600',
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '10px',
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

      default:
        sendResponse({ success: false, error: `Unhandled content message: ${message.type}` });
    }
  }
}
