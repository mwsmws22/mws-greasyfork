const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

export function svgIcon(className: string, shapes: string): SVGSVGElement {
  const node = document.createElementNS(SVG_NAMESPACE, 'svg');
  node.setAttribute('viewBox', '0 0 24 24');
  node.setAttribute('class', className);
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = shapes;
  return node;
}
