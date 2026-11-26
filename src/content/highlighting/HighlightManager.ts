import type { ContentHighlightItem, Highlight } from '../../shared/types';
import { HIGHLIGHT_COLORS } from '../../shared/constants/AppConstants';
import { HighlightRenderer } from './HighlightRenderer';

// Coordinates highlight operations in content script
export class HighlightManager {
  private readonly renderer: HighlightRenderer;
  private highlights: ContentHighlightItem[] = [];
  private savedHighlights: Highlight[] = [];
  private observer: MutationObserver | null = null;
  private reapplyTimer: ReturnType<typeof setTimeout> | null = null;
  private isApplying = false;

  constructor() {
    this.renderer = new HighlightRenderer();
  }

  init(): void {
    console.log('[HighlightManager] Ready');
  }

  highlightSelection(
    color: string = HIGHLIGHT_COLORS.YELLOW,
    fallbackText?: string
  ): ContentHighlightItem | null {
    const id = `hl-${Date.now()}`;
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? '';

    this.isApplying = true;
    try {
      if (selection && selection.rangeCount > 0 && selectedText) {
        const range = selection.getRangeAt(0);
        this.renderer.render(range, id, color);
        const item: ContentHighlightItem = { id, text: selectedText, color };
        this.highlights.push(item);
        selection.removeAllRanges();
        return item;
      }

      const textToFind = fallbackText?.trim() ?? '';
      if (textToFind && this.renderer.highlightTextInDocument(textToFind, id, color)) {
        const item: ContentHighlightItem = { id, text: textToFind, color };
        this.highlights.push(item);
        return item;
      }
    } finally {
      this.isApplying = false;
    }

    return null;
  }

  setSavedHighlights(items: Highlight[]): void {
    this.savedHighlights = items;
    this.restoreHighlights(this.savedHighlights);
  }

  restoreHighlights(savedHighlights: Highlight[] = this.savedHighlights): void {
    if (this.isApplying || savedHighlights.length === 0) return;
    this.isApplying = true;
    try {
      savedHighlights.forEach((hl) => {
        if (document.getElementById(hl.id)) return;
        this.renderer.highlightTextInDocument(hl.text, hl.id, hl.color);
      });
    } finally {
      this.isApplying = false;
    }
  }

  observeDOM(): void {
    if (this.observer || !document.body) return;

    this.observer = new MutationObserver(() => {
      if (this.isApplying || this.savedHighlights.length === 0) return;

      const missingAny = this.savedHighlights.some((hl) => !document.getElementById(hl.id));
      if (!missingAny) return;

      if (this.reapplyTimer !== null) {
        clearTimeout(this.reapplyTimer);
      }
      this.reapplyTimer = setTimeout(() => {
        this.restoreHighlights();
      }, 150);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  removeHighlight(id: string): void {
    this.isApplying = true;
    try {
      const el = document.getElementById(id);
      if (el && el.parentNode) {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      this.highlights = this.highlights.filter((h) => h.id !== id);
      this.savedHighlights = this.savedHighlights.filter((h) => h.id !== id);
    } finally {
      this.isApplying = false;
    }
  }
}
