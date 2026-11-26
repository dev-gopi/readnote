// Detects the main article element on the page
export class ArticleDetector {
  detect(): HTMLElement | null {
    const selectorBonus = new Map<string, number>([
      ['article', 420],
      ['[role="main"]', 340],
      ['main', 280],
      ['.post-content, .article-body, .entry-content, .article-content', 220],
      ['#content, #main-content', 160],
    ]);
    const candidates = new Set<HTMLElement>();

    selectorBonus.forEach((_bonus, selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => candidates.add(element));
    });
    let genericCandidates = 0;
    for (const element of document.querySelectorAll<HTMLElement>('section, div')) {
      // Restrict the fallback scan: measuring innerText on every node of a
      // complex application page is expensive and rarely improves extraction.
      if (element.querySelectorAll('p').length < 2) continue;
      candidates.add(element);
      genericCandidates += 1;
      if (genericCandidates >= 120) break;
    }

    let best: HTMLElement | null = null;
    let bestScore = 0;
    candidates.forEach((element) => {
      if (this._isBoilerplate(element)) return;
      const text = element.innerText.trim();
      if (text.length < 250) return;

      const paragraphs = element.querySelectorAll('p').length;
      const links = element.querySelectorAll('a').length;
      const linkedText = Array.from(element.querySelectorAll('a'))
        .reduce((count, link) => count + (link.textContent?.trim().length ?? 0), 0);
      const linkDensity = linkedText / Math.max(text.length, 1);
      const structuralBonus = Array.from(selectorBonus.entries()).reduce(
        (score, [selector, bonus]) => score + (element.matches(selector) ? bonus : 0),
        0
      );
      // Favor coherent prose, penalize navigation/link farms and giant wrapper divs.
      const score =
        Math.min(text.length, 12000) +
        paragraphs * 170 +
        structuralBonus -
        linkDensity * 4200 -
        Math.max(0, links - paragraphs * 3) * 24;
      if (score > bestScore) {
        best = element;
        bestScore = score;
      }
    });
    return best;
  }

  private _isBoilerplate(element: HTMLElement): boolean {
    const hint = `${element.id} ${element.className}`.toLowerCase();
    return /\b(nav|menu|footer|header|sidebar|comment|related|advert|cookie|modal)\b/.test(hint);
  }
}
