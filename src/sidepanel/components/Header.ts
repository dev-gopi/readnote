// Side panel header component
export class Header {
  private readonly root: HTMLElement | null;

  constructor(root: HTMLElement | null) {
    this.root = root;
  }

  render(): void {
    if (!this.root) return;
    this.root.innerHTML = `
      <header class="panel-header">
        <div class="panel-brand">
          <img src="${chrome.runtime.getURL('assets/icons/icon32.png')}" alt="ReadNote" class="logo" />
          <h1>ReadNote</h1>
        </div>
        <span class="version-pill">v1.0</span>
      </header>
    `;
  }
}
