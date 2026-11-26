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
        <img src="${chrome.runtime.getURL('assets/icons/icon32.png')}" alt="Logo" class="logo" />
        <h1>ReadNote</h1>
      </header>
    `;
  }
}
