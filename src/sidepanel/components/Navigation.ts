import type { ViewId } from '../../shared/types';

interface NavTab {
  id: ViewId;
  iconSvg: string;
  label: string;
}

export type NavigateCallback = (viewId: ViewId) => void;

// Tab navigation component
export class Navigation {
  private readonly root: HTMLElement | null;
  private readonly listeners: NavigateCallback[] = [];
  private readonly tabs: readonly NavTab[] = [
    {
      id: 'summary',
      label: 'Summary',
      iconSvg:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    },
    {
      id: 'notes',
      label: 'Notes',
      iconSvg:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    },
    {
      id: 'highlights',
      label: 'Highlights',
      iconSvg:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
    },
    {
      id: 'quiz',
      label: 'Quiz',
      iconSvg:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    },
    {
      id: 'settings',
      label: 'Settings',
      iconSvg:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    },
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
          <button class="nav-btn ${i === 0 ? 'active' : ''}" data-view="${t.id}" title="${t.label}">
            <span class="nav-icon">${t.iconSvg}</span>
            <span class="nav-label">${t.label}</span>
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
