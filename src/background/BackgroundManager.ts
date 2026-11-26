// Orchestrates background service worker
import { TabHandler } from './handlers/TabHandler';
import { MessageHandler } from './handlers/MessageHandler';
import { ContextMenuHandler } from './handlers/ContextMenuHandler';

export class BackgroundManager {
  private readonly tabHandler: TabHandler;
  private readonly messageHandler: MessageHandler;
  private readonly contextMenuHandler: ContextMenuHandler;

  constructor() {
    this.tabHandler = new TabHandler();
    this.messageHandler = new MessageHandler();
    this.contextMenuHandler = new ContextMenuHandler();
  }

  init(): void {
    this.tabHandler.register();
    this.messageHandler.register();
    this.contextMenuHandler.register();

    chrome.runtime.onInstalled.addListener((details) => {
      this.onInstalled(details);
    });
  }

  onInstalled(details: chrome.runtime.InstalledDetails): void {
    this.contextMenuHandler.createMenus();
    if (details.reason === 'install') {
      console.log('[ReadNote] Extension installed.');
    } else if (details.reason === 'update') {
      console.log('[ReadNote] Extension updated to', chrome.runtime.getManifest().version);
    }
  }
}
