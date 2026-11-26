export type SelectionCallback = (text: string, selection: Selection) => void;

// Manages text selection events
export class SelectionManager {
  private readonly onSelectCallbacks: SelectionCallback[] = [];

  init(): void {
    document.addEventListener('mouseup', () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (selection && text && text.length > 0) {
        this.onSelectCallbacks.forEach((cb) => cb(text, selection));
      }
    });
  }

  onSelect(callback: SelectionCallback): void {
    this.onSelectCallbacks.push(callback);
  }

  getSelectedText(): string {
    return window.getSelection()?.toString().trim() ?? '';
  }
}
