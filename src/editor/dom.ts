export type Kid = Node | string | number | null | undefined | false | Kid[];
export type Attrs = Record<string, any> | null;

/** Tiny element builder. `on*` keys become listeners, `html` sets innerHTML, `value` sets the live value. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, ...kids: Kid[]): HTMLElementTagNameMap[K];
export function h(tag: string, attrs?: Attrs, ...kids: Kid[]): HTMLElement;
export function h(tag: string, attrs?: Attrs, ...kids: Kid[]): HTMLElement {
  const n = document.createElement(tag) as any;
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'value') n.value = v;
    else if (k in n && k !== 'list' && typeof v !== 'string') n[k] = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  append(n, kids);
  return n;
}
function append(n: Node, kids: Kid[]): void {
  for (const c of kids) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(n, c);
    else n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string): T[] => Array.from(document.querySelectorAll<T>(sel));

export const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function toast(msg: string): void {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

export function modal(title: string, body: (close: () => void) => Kid): () => void {
  const close = () => sc.remove();
  const sc = h('div', { class: 'scrim', onclick: (e: Event) => { if (e.target === sc) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-label': title },
      h('header', null, h('h2', null, title), h('button', { class: 'btn ghost', onclick: close }, 'Close')),
      h('div', { class: 'mb' }, body(close))));
  sc.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.body.appendChild(sc);
  sc.querySelector<HTMLElement>('button,input')?.focus();
  return close;
}

export const modalOpen = (): boolean => !!document.querySelector('.scrim');
