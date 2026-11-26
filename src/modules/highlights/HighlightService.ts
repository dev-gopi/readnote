import type { Highlight } from '../../shared/types';
import { HIGHLIGHT_COLORS } from '../../shared/constants/AppConstants';
import { HighlightRepository } from './HighlightRepository';

// Business logic for highlights
export class HighlightService {
  private readonly repo: HighlightRepository;

  constructor() {
    this.repo = new HighlightRepository();
  }

  async createHighlight(
    text: string,
    pageUrl: string,
    pageTitle: string,
    color: string = HIGHLIGHT_COLORS.YELLOW,
    id?: string
  ): Promise<Highlight> {
    const highlight: Highlight = {
      id: id ?? `hl-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      text,
      pageUrl,
      pageTitle,
      color,
      note: '',
      createdAt: new Date().toISOString(),
    };
    return this.repo.save(highlight);
  }

  async getByPage(url: string): Promise<Highlight[]> {
    return this.repo.findByUrl(url);
  }

  async getAll(): Promise<Highlight[]> {
    return this.repo.findAll();
  }

  async remove(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
