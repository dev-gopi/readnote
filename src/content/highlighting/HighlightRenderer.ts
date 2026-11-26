import { HIGHLIGHT_COLORS } from '../../shared/constants/AppConstants';

interface TextSegment {
  node: Text;
  normStart: number;
  normEnd: number;
  rawOffsets: number[]; // maps normalized char index (relative to segment) -> raw offset in node.data
}

// Wraps DOM ranges with highlight spans across single or multiple DOM nodes
export class HighlightRenderer {
  private static readonly READING_CLASS = 'readnote-reading-active';

  render(range: Range, id: string, color: string = HIGHLIGHT_COLORS.YELLOW): void {
    this._wrapRangeTextNodes(range, () => this._createMark(id, color));
  }

  highlightReadingSentence(sentence: string): HTMLElement | null {
    this.clearReadingHighlight();
    const clean = sentence.replace(/\s+/g, ' ').trim();
    if (!clean || !document.body) return null;

    const candidates = [clean, clean.slice(0, 70).trim(), clean.slice(0, 35).trim()].filter(
      (c) => c.length >= 4
    );

    for (const query of candidates) {
      const range = this._findRangeInDocument(query, HighlightRenderer.READING_CLASS);
      if (range) {
        let firstMark: HTMLElement | null = null;
        this._wrapRangeTextNodes(range, () => {
          const mark = document.createElement('mark');
          mark.className = HighlightRenderer.READING_CLASS;
          Object.assign(mark.style, {
            backgroundColor: '#dbeafe',
            color: '#0f172a',
            borderBottom: '2px solid #4f46e5',
            borderRadius: '3px',
            padding: '0 2px',
          });
          if (!firstMark) firstMark = mark;
          return mark;
        });
        if (firstMark) return firstMark;
      }
    }
    return null;
  }

  clearReadingHighlight(): void {
    document
      .querySelectorAll<HTMLElement>(`.${HighlightRenderer.READING_CLASS}`)
      .forEach((el) => {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        parent.normalize();
      });
  }

  highlightTextInDocument(
    text: string,
    id: string,
    color: string = HIGHLIGHT_COLORS.YELLOW
  ): boolean {
    const query = text.replace(/\s+/g, ' ').trim();
    if (!query || !document.body) return false;

    const range = this._findRangeInDocument(query, 'readnote-highlight');
    if (!range) return false;

    this.render(range, id, color);
    return true;
  }

  private _wrapRangeTextNodes(range: Range, createMark: () => HTMLElement): void {
    if (range.collapsed) return;

    // Fast path: single text node
    if (
      range.startContainer === range.endContainer &&
      range.startContainer.nodeType === Node.TEXT_NODE
    ) {
      const mark = createMark();
      try {
        range.surroundContents(mark);
        return;
      } catch {
        // Fall through to per-node wrapping
      }
    }

    const textNodes: Text[] = [];
    const root =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? (range.commonAncestorContainer.parentNode ?? document.body)
        : range.commonAncestorContainer;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let current: Node | null = walker.nextNode();
    while (current) {
      if (
        current.nodeType === Node.TEXT_NODE &&
        range.intersectsNode(current) &&
        (current as Text).data.trim().length > 0
      ) {
        textNodes.push(current as Text);
      }
      current = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const start = textNode === range.startContainer ? range.startOffset : 0;
      const end =
        textNode === range.endContainer ? range.endOffset : textNode.data.length;
      if (end <= start) return;

      const subRange = document.createRange();
      subRange.setStart(textNode, start);
      subRange.setEnd(textNode, end);

      const mark = createMark();
      try {
        subRange.surroundContents(mark);
      } catch {
        // Ignore non-wrappable edge nodes
      }
    });
  }

  private _findRangeInDocument(query: string, skipClass: string): Range | null {
    if (!document.body) return null;

    const segments: TextSegment[] = [];
    let normalizedFull = '';

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();

    while (node) {
      const textNode = node as Text;
      const parentEl = textNode.parentElement;
      if (
        parentEl &&
        parentEl.tagName !== 'SCRIPT' &&
        parentEl.tagName !== 'STYLE' &&
        parentEl.tagName !== 'NOSCRIPT' &&
        parentEl.tagName !== 'TEXTAREA' &&
        parentEl.tagName !== 'INPUT' &&
        !parentEl.closest(`.${skipClass}`) &&
        !parentEl.closest('#readnote-floating-toolbar') &&
        !parentEl.closest('#readnote-goto-reading')
      ) {
        const raw = textNode.data;
        const rawOffsets: number[] = [];
        let segNorm = '';
        let prevWasSpace = normalizedFull.endsWith(' ') || normalizedFull.length === 0;

        for (let i = 0; i < raw.length; i++) {
          const ch = raw[i] ?? '';
          if (/\s/.test(ch)) {
            if (!prevWasSpace) {
              segNorm += ' ';
              rawOffsets.push(i);
              prevWasSpace = true;
            }
          } else {
            segNorm += ch;
            rawOffsets.push(i);
            prevWasSpace = false;
          }
        }

        if (segNorm.length > 0) {
          const normStart = normalizedFull.length;
          normalizedFull += segNorm;
          const normEnd = normalizedFull.length;
          segments.push({ node: textNode, normStart, normEnd, rawOffsets });
        }
      }
      node = walker.nextNode();
    }

    if (segments.length === 0) return null;

    let matchIndex = normalizedFull.indexOf(query);
    if (matchIndex === -1) {
      matchIndex = normalizedFull.toLowerCase().indexOf(query.toLowerCase());
    }
    if (matchIndex === -1) return null;

    const matchEnd = matchIndex + query.length;
    const startPos = this._resolvePosition(segments, matchIndex, false);
    const endPos = this._resolvePosition(segments, matchEnd - 1, true);
    if (!startPos || !endPos) return null;

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    return range;
  }

  private _resolvePosition(
    segments: TextSegment[],
    normIndex: number,
    isEnd: boolean
  ): { node: Text; offset: number } | null {
    for (const seg of segments) {
      if (normIndex >= seg.normStart && normIndex < seg.normEnd) {
        const localIdx = normIndex - seg.normStart;
        const rawOffset = seg.rawOffsets[localIdx] ?? 0;
        return {
          node: seg.node,
          offset: isEnd ? Math.min(seg.node.data.length, rawOffset + 1) : rawOffset,
        };
      }
    }
    return null;
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
