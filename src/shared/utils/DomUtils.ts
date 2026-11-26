// DOM manipulation helpers
export class DomUtils {
  static createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string> = {},
    children: Array<Node | string> = []
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'textContent') el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.forEach((child) =>
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
    );
    return el;
  }

  static query<T extends Element = Element>(
    selector: string,
    root: ParentNode = document
  ): T | null {
    return root.querySelector<T>(selector);
  }

  static queryAll<T extends Element = Element>(
    selector: string,
    root: ParentNode = document
  ): T[] {
    return Array.from(root.querySelectorAll<T>(selector));
  }

  static removeElement(el: Element | null | undefined): void {
    el?.parentNode?.removeChild(el);
  }

  static toggleClass(
    el: Element | null | undefined,
    className: string,
    force?: boolean
  ): void {
    el?.classList.toggle(className, force);
  }

  static setVisible(el: HTMLElement | null | undefined, visible: boolean): void {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  }
}
