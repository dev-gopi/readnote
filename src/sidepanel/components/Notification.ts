// Toast notification component
export class Notification {
  private readonly root: HTMLElement | null;
  private el: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(root: HTMLElement | null) {
    this.root = root;
  }

  render(): void {
    if (!this.root) return;
    this.root.innerHTML = `<div class="notification" id="toast"></div>`;
    this.el = this.root.querySelector<HTMLElement>('#toast');
  }

  show(message: string, duration = 2500): void {
    if (!this.el) return;
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.el.textContent = message;
    this.el.classList.add('show');
    this.timer = setTimeout(() => this.el?.classList.remove('show'), duration);
  }
}
