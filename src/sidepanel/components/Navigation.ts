import type { ViewId } from '../../shared/types';

interface NavTab {
  id: ViewId;
  icon: string;
  label: string;
}

export type NavigateCallback = (viewId: ViewId) => void;

// Tab navigation component
export class Navigation {
  private readonly root: HTMLElement | null;
  private readonly listeners: NavigateCallback[] = [];
  private readonly tabs: readonly NavTab[] = [
    { id: 'summary', icon: '📝', label: 'Summary' },
    { id: 'notes', icon: '🗒️', label: 'Notes' },
    { id: 'highlights', icon: '🖊️', label: 'Highlights' },
    { id: 'quiz', icon: '❓', label: 'Quiz' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  constructor(root: HTMLElement | null) {
    this.root = root;
  }

  render(): void {
    if (!this.root) return;
    this.root.innerHTML = `
      <nav class="panel-nav">
        ${this.tabs
          .map(
            (t, i) => `
          <button class="nav-btn ${i === 0 ? 'active' : ''}" data-view="${t.id}">
            <span class="nav-icon">${t.icon}</span>
            <span>${t.label}</span>
          </button>
        `
          )
          .join('')}
      </nav>
    `;

    this.root.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset['view'] as ViewId | undefined;
        if (view) {
          this.setActiveView(view);
        }
      });
    });
  }

  setActiveView(viewId: ViewId): void {
    if (!this.root) return;
    this.root.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset['view'] === viewId);
    });
    this.listeners.forEach((cb) => cb(viewId));
  }

  onNavigate(callback: NavigateCallback): void {
    this.listeners.push(callback);
  }
}
