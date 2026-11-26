import { HIGHLIGHT_COLORS } from '../../shared/constants/AppConstants';

// Wraps DOM ranges with highlight spans
export class HighlightRenderer {
  render(range: Range, id: string, color: string = HIGHLIGHT_COLORS.YELLOW): void {
    const mark = this._createMark(id, color);

    try {
      range.surroundContents(mark);
    } catch {
      // Fallback when selection spans across multiple element boundaries
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }
  }

  highlightTextInDocument(
    text: string,
    id: string,
    color: string = HIGHLIGHT_COLORS.YELLOW
  ): boolean {
    const query = text.trim();
    if (!query || !document.body) return false;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    while (node) {
      const parentEl = node.parentElement;
      const nodeText = node.textContent ?? '';
      if (
        parentEl &&
        !parentEl.closest('.readnote-highlight') &&
        parentEl.tagName !== 'SCRIPT' &&
        parentEl.tagName !== 'STYLE'
      ) {
        const index = nodeText.indexOf(query);
        if (index !== -1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + query.length);
          this.render(range, id, color);
          return true;
        }
      }
      node = walker.nextNode();
    }
    return false;
  }

  private _createMark(id: string, color: string): HTMLElement {
    const mark = document.createElement('mark');
    mark.id = id;
    mark.style.backgroundColor = color;
    mark.style.color = '#212529';
    mark.style.padding = '0 2px';
    mark.style.borderRadius = '2px';
    mark.className = 'readnote-highlight';
    mark.dataset['readnoteHighlight'] = id;
    return mark;
  }
}
