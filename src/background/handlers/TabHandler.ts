// Manages tab lifecycle events
export class TabHandler {
  register(): void {
    chrome.tabs.onActivated.addListener((activeInfo) => this.onTabActivated(activeInfo));
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) =>
      this.onTabUpdated(tabId, changeInfo, tab)
    );
    chrome.tabs.onRemoved.addListener((tabId) => this.onTabRemoved(tabId));
  }

  onTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    console.log('[TabHandler] Tab activated:', activeInfo.tabId);
  }

  onTabUpdated(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): void {
    if (changeInfo.status === 'complete' && tab.url) {
      console.log('[TabHandler] Tab updated:', tabId, tab.url);
    }
  }

  onTabRemoved(tabId: number): void {
    console.log('[TabHandler] Tab removed:', tabId);
  }
}
