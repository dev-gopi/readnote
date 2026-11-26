import type { ViewId } from '../shared/types';

async function openSidePanelWithAction(action?: ViewId): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (action) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ readnote_pending_action: action }, resolve);
    });
  }
  if (tab?.id !== undefined) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
  window.close();
}

// Popup UI logic.
export function initializePopup(): void {
  document.getElementById('btn-open-panel')?.addEventListener('click', () => {
    void openSidePanelWithAction();
  });

  document.getElementById('btn-summary')?.addEventListener('click', () => {
    void openSidePanelWithAction('summary');
  });

  document.getElementById('btn-notes')?.addEventListener('click', () => {
    void openSidePanelWithAction('notes');
  });

  document.getElementById('btn-quiz')?.addEventListener('click', () => {
    void openSidePanelWithAction('quiz');
  });

  document.getElementById('btn-read')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-read') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id !== undefined) {
        await new Promise<void>((resolve) => {
          chrome.tabs.sendMessage(tab.id!, { type: 'START_READ_ALOUD' }, () => {
            // Ignore runtime.lastError on restricted pages (e.g. chrome://)
            void chrome.runtime.lastError;
            resolve();
          });
        });
      }
    } finally {
      if (btn) btn.disabled = false;
      window.close();
    }
  });

  document.getElementById('btn-stop-read')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, { type: 'STOP_READ_ALOUD' }, () => {
        void chrome.runtime.lastError;
      });
    }
    window.close();
  });

  document.getElementById('btn-pause-read')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_READ_ALOUD' }, () => {
        void chrome.runtime.lastError;
      });
    }
    window.close();
  });

  document.getElementById('btn-focus-mode')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FOCUS_MODE' }, () => {
        void chrome.runtime.lastError;
      });
    }
    window.close();
  });
}

initializePopup();
