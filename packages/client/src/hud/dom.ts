/**
 * Small DOM helpers for the HUD. The HUD is built once and then updated
 * in place every frame, so the writers here touch the DOM only when a
 * value has changed: rewriting identical text or attributes sixty times
 * a second costs layout work for nothing.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An HTML element with a class and optional text. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** An SVG element with attributes. */
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** Set text only when it differs. */
export function setText(node: Node, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

/** Set an attribute only when it differs. */
export function setAttr(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

/** Show or hide with the shared `hidden` class. */
export function show(node: Element, visible: boolean): void {
  node.classList.toggle('hidden', !visible);
}
