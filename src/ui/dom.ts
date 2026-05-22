type Child = Node | string;
type Props = Record<string, string | number | boolean | EventListener>;

export function h(tag: string, props: Props = {}, children: Child[] = []): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  for (const c of children) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}

export function clear(root: HTMLElement): void {
  root.replaceChildren();
}
