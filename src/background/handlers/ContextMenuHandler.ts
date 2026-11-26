import { NoteManager } from '../../modules/notes/NoteManager';

// Manages right-click context menu items
export class ContextMenuHandler {
  private readonly noteManager = new NoteManager();

  register(): void {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      void this.onMenuClicked(info, tab);
    });
  }

  createMenus(): void {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'readnote-highlight',
        title: 'Highlight Selection',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: 'readnote-add-note',
        title: 'Add to Notes',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: 'readnote-highlight-and-note',
        title: 'Highlight & Take Note',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: 'readnote-summarize',
        title: 'Summarize with ReadNote',
        contexts: ['selection', 'page'],
      });
    });
  }

  async onMenuClicked(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<void> {
    if (tab?.id === undefined) return;
    const selectedText = info.selectionText?.trim() ?? '';

    switch (info.menuItemId) {
      case 'readnote-summarize': {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set(
            {
              readnote_pending_action: 'summary',
              readnote_pending_summary_text: selectedText,
            },
            resolve
          );
        });
        await chrome.sidePanel.open({ tabId: tab.id });
        break;
      }

      case 'readnote-add-note': {
        if (selectedText) {
          await this.noteManager.createNote(
            selectedText,
            tab.url ?? info.pageUrl ?? '',
            tab.title ?? 'Untitled Page'
          );
        }
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ readnote_pending_action: 'notes' }, resolve);
        });
        await chrome.sidePanel.open({ tabId: tab.id });
        break;
      }

      case 'readnote-highlight': {
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'HIGHLIGHT_SELECTION', payload: { text: selectedText } },
          () => {
            void chrome.runtime.lastError;
          }
        );
        break;
      }

      case 'readnote-highlight-and-note': {
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'HIGHLIGHT_SELECTION', payload: { text: selectedText } },
          () => {
            void chrome.runtime.lastError;
          }
        );
        if (selectedText) {
          await this.noteManager.createNote(
            selectedText,
            tab.url ?? info.pageUrl ?? '',
            tab.title ?? 'Untitled Page'
          );
        }
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ readnote_pending_action: 'notes' }, resolve);
        });
        await chrome.sidePanel.open({ tabId: tab.id });
        break;
      }
    }
  }
}
