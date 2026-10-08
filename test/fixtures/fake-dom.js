// Minimal DOM stub, enough to drive every calculator renderer in Node: build
// elements, dispatch input/change/click, read select values, collect text.
// Used by render-text-sweep.js, which test/unit/render-text-guard.test.js runs
// in a child process so these globals never touch the test runner. Not a
// browser: layout, CSS, and accessibility stay with the Playwright suite.
const timers = [];
let timerId = 1;
export function installTimers() {
  globalThis.setTimeout = (fn, ms, ...a) => { const id = timerId++; timers.push({ id, fn: () => fn(...a) }); return id; };
  globalThis.clearTimeout = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  globalThis.requestAnimationFrame = (fn) => globalThis.setTimeout(fn, 0);
  globalThis.cancelAnimationFrame = (id) => globalThis.clearTimeout(id);
}
export function flushTimers(max = 200) {
  let n = 0;
  while (timers.length && n++ < max) { const t = timers.shift(); t.fn(); }
}

class ClassList {
  constructor(el) { this.el = el; }
  _get() { return (this.el.className || "").split(/\s+/).filter(Boolean); }
  add(...c) { const s = new Set(this._get()); c.forEach((x) => s.add(x)); this.el.className = [...s].join(" "); }
  remove(...c) { this.el.className = this._get().filter((x) => !c.includes(x)).join(" "); }
  contains(c) { return this._get().includes(c); }
  toggle(c, force) { const has = this.contains(c); const want = force === undefined ? !has : force; if (want) this.add(c); else this.remove(c); return want; }
}

export class Node {
  constructor(tag, doc) {
    this.tagName = (tag || "").toUpperCase(); this.nodeName = this.tagName; this.ownerDocument = doc;
    this.childNodes = []; this.parentNode = null; this.attributes = {}; this.listeners = [];
    this.style = new Proxy({}, { get: (o, k) => (k in o ? o[k] : ""), set: (o, k, v) => { o[k] = v; return true; } });
    this.dataset = {}; this.classList = new ClassList(this); this.className = ""; this.id = "";
    this._text = ""; this.hidden = false; this.disabled = false; this.type = ""; this.checked = false; this.selected = false;
    this._value = "";
  }
  get children() { return this.childNodes.filter((c) => c instanceof Node && !c.isText); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get firstElementChild() { return this.children[0] || null; }
  get nextSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return p.childNodes[i + 1] || null; }
  get parentElement() { return this.parentNode; }
  appendChild(c) { if (c.isFragment) { [...c.childNodes].forEach((x) => this.appendChild(x)); return c; } if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === "string" ? this.ownerDocument.createTextNode(c) : c); }
  prepend(...cs) { for (const c of cs.reverse()) this.insertBefore(typeof c === "string" ? this.ownerDocument.createTextNode(c) : c, this.firstChild); }
  insertBefore(c, ref) { if (!ref) return this.appendChild(c); if (c.parentNode) c.parentNode.removeChild(c); const i = this.childNodes.indexOf(ref); c.parentNode = this; this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, c); return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; }
  replaceChildren(...cs) { this.childNodes = []; this.append(...cs); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  replaceWith(n) { if (this.parentNode) { this.parentNode.insertBefore(n, this); this.remove(); } }
  insertAdjacentElement(pos, el) { if (pos === "afterend" && this.parentNode) this.parentNode.insertBefore(el, this.nextSibling); else if (pos === "beforebegin" && this.parentNode) this.parentNode.insertBefore(el, this); else if (pos === "afterbegin") this.insertBefore(el, this.firstChild); else this.appendChild(el); return el; }
  cloneNode() { const n = new Node(this.tagName, this.ownerDocument); n.textContent = this.textContent; return n; }
  get textContent() { if (this.isText) return this._text; return this.childNodes.length ? this.childNodes.map((c) => c.textContent).join("") : this._text; }
  set textContent(v) { this.childNodes = []; this._text = v == null ? "" : String(v); }
  get innerText() { return this.textContent; }
  set innerText(v) { this.textContent = v; }
  get innerHTML() { return this.textContent; }
  set innerHTML(v) { this.textContent = String(v).replace(/<[^>]*>/g, ""); }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === "id") this.id = String(v); if (k === "class") this.className = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : (k === "id" && this.id ? this.id : null); }
  hasAttribute(k) { return k in this.attributes; }
  removeAttribute(k) { delete this.attributes[k]; }
  toggleAttribute(k, f) { if (f === false || (f === undefined && k in this.attributes)) delete this.attributes[k]; else this.attributes[k] = ""; }
  addEventListener(t, fn, opt) { this.listeners.push({ t, fn, capture: opt === true || !!(opt && opt.capture) }); }
  removeEventListener(t, fn) { this.listeners = this.listeners.filter((l) => !(l.t === t && l.fn === fn)); }
  dispatchEvent(ev) {
    ev.target ??= this;
    const path = []; for (let n = this; n; n = n.parentNode) path.push(n);
    for (const n of [...path].reverse()) for (const l of n.listeners) if (l.t === ev.type && l.capture) l.fn.call(n, ev);
    for (const n of path) { for (const l of n.listeners) if (l.t === ev.type && !l.capture) l.fn.call(n, ev); if (!ev.bubbles) break; }
    return true;
  }
  click() { this.dispatchEvent(new Event("click", { bubbles: true })); }
  focus() {} blur() {} scrollIntoView() {}
  getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; }
  getContext() { return null; }
  matches(sel) { return matchSel(this, sel); }
  closest(sel) { for (let n = this; n; n = n.parentNode) if (n.matches && matchSel(n, sel)) return n; return null; }
  querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) { if (sel.split(",").some((s) => matchSel(c, s.trim()))) out.push(c); walk(c); } }; walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getElementsByTagName(t) { return this.querySelectorAll(t.toLowerCase()); }
  // form controls
  get options() { return this.querySelectorAll("option"); }
  get selectedIndex() { const o = this.options; const i = o.findIndex((x) => x.selected); return i >= 0 ? i : (o.length ? 0 : -1); }
  set selectedIndex(i) { this.options.forEach((o, j) => { o.selected = j === i; }); }
  get value() {
    if (this.tagName === "SELECT") { const o = this.options; const s = o.find((x) => x.selected) || o[0]; return s ? s.value : ""; }
    if (this.tagName === "OPTION") return this._valueSet || "value" in this.attributes ? (this.attributes.value ?? this._value) : this.textContent;
    return this._value;
  }
  set value(v) {
    v = v == null ? "" : String(v);
    if (this.tagName === "SELECT") { const o = this.options; const hit = o.find((x) => x.value === v); o.forEach((x) => { x.selected = x === hit; }); return; }
    this._value = v; this._valueSet = true;
  }
  get valueAsNumber() { return this._value === "" ? NaN : Number(this._value); }
  get selectedOptions() { return this.options.filter((o) => o.selected); }
  get labels() { return []; }
}
function matchSel(n, sel) {
  if (!sel || !(n instanceof Node) || n.isText) return false;
  const last = sel.trim().split(/\s+/).pop();
  const m = last.match(/^([a-zA-Z0-9]*)((?:[.#][\w-]+|\[[^\]]+\])*)(:checked)?$/);
  if (!m) return false;
  if (m[1] && n.tagName !== m[1].toUpperCase()) return false;
  for (const part of m[2].match(/[.#][\w-]+|\[[^\]]+\]/g) || []) {
    if (part[0] === ".") { if (!n.classList.contains(part.slice(1))) return false; }
    else if (part[0] === "#") { if (n.id !== part.slice(1)) return false; }
    else { const [k, v] = part.slice(1, -1).split("="); const val = k === "type" ? n.type : n.getAttribute(k); if (v === undefined ? val == null : String(val) !== v.replace(/["']/g, "")) return false; }
  }
  if (m[3] && !n.checked) return false;
  return true;
}
class Event { constructor(type, o = {}) { this.type = type; this.bubbles = !!o.bubbles; this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } stopPropagation() {} }

export function installDocument() {
  const doc = {
    createElement: (t) => new Node(t, doc),
    createElementNS: (_ns, t) => new Node(t, doc),
    createTextNode: (s) => { const n = new Node("#text", doc); n.isText = true; n._text = String(s); return n; },
    createDocumentFragment: () => { const n = new Node("#fragment", doc); n.isFragment = true; return n; },
    addEventListener() {}, removeEventListener() {},
    title: "", activeElement: null,
  };
  doc.body = new Node("body", doc);
  doc.documentElement = new Node("html", doc);
  doc.getElementById = (id) => doc.body.querySelectorAll("*").find((n) => n.id === id) || null;
  doc.querySelector = (s) => doc.body.querySelector(s);
  doc.querySelectorAll = (s) => doc.body.querySelectorAll(s);
  // "*" support
  const orig = Node.prototype.querySelectorAll;
  Node.prototype.querySelectorAll = function (sel) { if (sel === "*") { const out = []; const walk = (n) => { for (const c of n.children) { out.push(c); walk(c); } }; walk(this); return out; } return orig.call(this, sel); };
  globalThis.document = doc;
  globalThis.Event = Event; globalThis.CustomEvent = Event; globalThis.InputEvent = Event;
  globalThis.HTMLElement = Node; globalThis.Element = Node;
  globalThis.window ??= globalThis;
  globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  try { globalThis.navigator ??= { clipboard: { writeText: async () => {} } }; } catch {}
  globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.location ??= { hash: "", search: "", pathname: "/", href: "http://localhost/" };
  globalThis.history ??= { replaceState() {}, pushState() {} };
  return doc;
}
