declare namespace chrome {
  namespace runtime {
    interface InstalledDetails {
      reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update';
      previousVersion?: string;
      id?: string;
    }

    interface MessageSender {
      tab?: tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      origin?: string;
    }

    interface LastError {
      message?: string;
    }

    interface Manifest {
      version: string;
      name: string;
      manifest_version: number;
    }

    const lastError: LastError | undefined;

    const onInstalled: {
      addListener(callback: (details: InstalledDetails) => void): void;
    };

    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    };

    function sendMessage<T = unknown>(
      message: unknown,
      callback?: (response: T) => void
    ): void;

    function getManifest(): Manifest;
    function getURL(path: string): string;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      active: boolean;
      url?: string;
      title?: string;
    }

    interface TabActiveInfo {
      tabId: number;
      windowId: number;
    }

    interface TabChangeInfo {
      status?: string;
      url?: string;
      title?: string;
    }

    interface QueryInfo {
      active?: boolean;
      currentWindow?: boolean;
    }

    const onActivated: {
      addListener(callback: (activeInfo: TabActiveInfo) => void): void;
    };

    const onUpdated: {
      addListener(
        callback: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void
      ): void;
    };

    const onRemoved: {
      addListener(callback: (tabId: number) => void): void;
    };

    function query(queryInfo: QueryInfo): Promise<Tab[]>;
    function create(createProperties: { url?: string; active?: boolean }): Promise<Tab>;

    function sendMessage<T = unknown>(
      tabId: number,
      message: unknown,
      callback?: (response: T) => void
    ): void;
  }

  namespace contextMenus {
    type ContextType =
      | 'all'
      | 'page'
      | 'frame'
      | 'selection'
      | 'link'
      | 'editable'
      | 'image'
      | 'video'
      | 'audio';

    interface CreateProperties {
      id?: string;
      title?: string;
      contexts?: ContextType[];
    }

    interface OnClickData {
      menuItemId: string | number;
      selectionText?: string;
      pageUrl?: string;
    }

    const onClicked: {
      addListener(callback: (info: OnClickData, tab?: tabs.Tab) => void): void;
    };

    function create(createProperties: CreateProperties, callback?: () => void): void;
    function removeAll(callback?: () => void): void;
  }

  namespace storage {
    interface StorageChange {
      oldValue?: unknown;
      newValue?: unknown;
    }

    interface StorageArea {
      get(
        keys?: string | string[] | Record<string, unknown> | null,
        callback?: (items: Record<string, unknown>) => void
      ): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }

    const onChanged: {
      addListener(
        callback: (changes: Record<string, StorageChange>, areaName: string) => void
      ): void;
    };

    const local: StorageArea;
  }

  namespace sidePanel {
    interface OpenOptions {
      tabId?: number;
      windowId?: number;
    }

    function open(options: OpenOptions): Promise<void>;
  }

  namespace identity {
    interface TokenDetails {
      interactive?: boolean;
      scopes?: string[];
    }

    interface InvalidTokenDetails {
      token: string;
    }

    function getAuthToken(
      details: TokenDetails,
      callback: (token?: string) => void
    ): void;

    function removeCachedAuthToken(
      details: InvalidTokenDetails,
      callback?: () => void
    ): void;
  }
}
