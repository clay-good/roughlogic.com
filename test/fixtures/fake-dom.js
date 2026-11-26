// Minimal DOM stub, enough to drive every calculator renderer in Node: build
// elements, dispatch input/change/click, read select values, collect text.
// Used by render-text-sweep.js, which test/unit/render-text-guard.test.js runs
// in a child process so these globals never touch the test runner. Not a
// browser: layout, CSS, and accessibility stay with the Playwright suite.
// `installFetch` serves the repo's own files, so page code that loads a
// bundled shard can run here at all. query-fill.js's loadFields does
// `fetch("data/fields/<bucket>.json")`, integrity.js verifies it against the
// shard manifest, and tile-prefill.js gives up silently when either fails --
// so the whole query-prefill path (a reader arriving from a search with values
// in the question) was unreachable under this harness and its only coverage is
// two seed tiles in the nightly Playwright lane.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export function installFetch(root = REPO_ROOT) {
  globalThis.fetch = async (url) => {
    const rel = String(url).split("?")[0].split("#")[0].replace(/^\.?\//, "");
    let text = null;
    try { text = readFileSync(resolve(root, rel), "utf8"); } catch { text = null; }
    if (text === null) return { ok: false, status: 404, url: String(url), text: async () => "", json: async () => null };
    return { ok: true, status: 200, url: String(url), text: async () => text, json: async () => JSON.parse(text) };
  };
}

const timers = [];
let timerId = 1;
const cancelled = new Set();
export function installTimers() {
  globalThis.setTimeout = (fn, ms, ...a) => { const id = timerId++; timers.push({ id, fn: () => fn(...a) }); return id; };
  globalThis.clearTimeout = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  globalThis.requestAnimationFrame = (fn) => globalThis.setTimeout(fn, 0);
  globalThis.cancelAnimationFrame = (id) => globalThis.clearTimeout(id);
  // setInterval was NOT faked until 2026-11-26, so calc-field.js's 1 Hz
  // readout timer used Node's real one: a live wall-clock interval per
  // rendered tile, holding the event loop open after a sweep had finished and
  // firing on real seconds that a synchronous sweep never waits for. An
  // interval re-queues itself after each fire, so flushTimers drives it the
  // same way it drives a timeout, bounded by its own cap.
  globalThis.setInterval = (fn, ms, ...a) => {
    const id = timerId++;
    const run = () => { if (!cancelled.has(id)) { timers.push({ id, fn: run }); fn(...a); } };
    timers.push({ id, fn: run });
    return id;
  };
  globalThis.clearInterval = (id) => { cancelled.add(id); const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
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
    this._text = ""; this.disabled = false; this.type = ""; this.checked = false; this.selected = false;
    this._value = "";
  }
  get children() { return this.childNodes.filter((c) => c instanceof Node && !c.isText); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get firstElementChild() { return this.children[0] || null; }
  // ui-fields.js's steps panel keeps itself attached with
  // `if (parent.lastElementChild !== box) parent.appendChild(box)`. Undefined
  // here, that comparison never held and the panel was re-appended on every
  // update.
  get lastElementChild() { const c = this.children; return c[c.length - 1] || null; }
  get nextSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return p.childNodes[i + 1] || null; }
  get parentElement() { return this.parentNode; }
  appendChild(c) { if (c.isFragment) { [...c.childNodes].forEach((x) => this.appendChild(x)); return c; } if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === "string" ? this.ownerDocument.createTextNode(c) : c); }
  prepend(...cs) { for (const c of cs.reverse()) this.insertBefore(typeof c === "string" ? this.ownerDocument.createTextNode(c) : c, this.firstChild); }
  insertBefore(c, ref) { if (!ref) return this.appendChild(c); if (c.parentNode) c.parentNode.removeChild(c); const i = this.childNodes.indexOf(ref); c.parentNode = this; this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, c); return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; }
  // Detach what it removes. This emptied `childNodes` and left every removed
  // child still pointing at its old parent, so a node taken off the page went
  // on looking attached for ever -- and the sweeps clear a tile with exactly
  // this call. calc-field.js runs a 1 Hz interval that stops itself when its
  // input region is detached ("the view-region clears between tools"), so with
  // `isConnected` made faithful on top of this, every tile's interval lived
  // for ever: 2,288 of them firing on every later flush, which is why defining
  // isConnected took steps-panel-guard from 2.6s to over 200s.
  replaceChildren(...cs) { for (const c of this.childNodes) if (c && c.parentNode === this) c.parentNode = null; this.childNodes = []; this.append(...cs); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  replaceWith(n) { if (this.parentNode) { this.parentNode.insertBefore(n, this); this.remove(); } }
  insertAdjacentElement(pos, el) { if (pos === "afterend" && this.parentNode) this.parentNode.insertBefore(el, this.nextSibling); else if (pos === "beforebegin" && this.parentNode) this.parentNode.insertBefore(el, this); else if (pos === "afterbegin") this.insertBefore(el, this.firstChild); else this.appendChild(el); return el; }
  cloneNode() { const n = new Node(this.tagName, this.ownerDocument); n.textContent = this.textContent; return n; }
  get textContent() { if (this.isText) return this._text; return this.childNodes.length ? this.childNodes.map((c) => c.textContent).join("") : this._text; }
  set textContent(v) { this.childNodes = []; this._text = v == null ? "" : String(v); }
  // HTMLOptionElement.text -- the words a reader actually chose. steps-panel.js
  // domFields prints `el.options[el.selectedIndex].text` for a select, so with
  // this undefined it fell through to `el.value` and every sweep that read a
  // select off the page under this harness saw the raw code ("copper",
  // "single", "led_lighting") where a browser shows the label ("Copper",
  // "Single", "LED lighting"). That made 734 page-vs-door select values look
  // like drift in a 2026-11-26 sweep when the door had been right each time.
  // Only OPTION carries it, as in a browser.
  get text() { return this.tagName === "OPTION" ? this.textContent : undefined; }
  set text(v) { if (this.tagName === "OPTION") this.textContent = v; }
  get innerText() { return this.textContent; }
  set innerText(v) { this.textContent = v; }
  get innerHTML() { return this.textContent; }
  set innerHTML(v) { this.textContent = String(v).replace(/<[^>]*>/g, ""); }
  // A `value` attribute on a control IS its value until something dirties it,
  // which is how `makeNumber(label, id, { value: "45" })` prefills a box. The
  // fake DOM stored the attribute without reflecting it, so every sweep that
  // drives a renderer saw those boxes as blank -- which is how the phantom-
  // default sweep reported a prefilled NOCT of 45 as a number the reader
  // cannot see (2026-11-24). Mirrors the browser: the attribute sets the value
  // only while the control is still clean.
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === "id") this.id = String(v);
    if (k === "class") this.className = String(v);
    if (k === "value" && !this._valueSet && (this.tagName === "INPUT" || this.tagName === "TEXTAREA")) this.value = String(v);
  }
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
  // A browser REFLECTS htmlFor to the `for` attribute, and every label here is
  // built with `lab.htmlFor = id` (ui-fields.js). Without the reflection the
  // property was a plain field on the fake node, `getAttribute("for")` was
  // null, and `label[for="..."]` matched nothing -- so steps-panel.js's
  // domFields(), which pairs a control with its caption that way, returned NO
  // FIELDS under this harness. Any sweep driving the steps panel's DOM path saw
  // an empty panel and could only ever report a clean zero. Same class as the
  // `value` attribute this file failed to reflect until 2026-11-24.
  // min / max / step and hidden are REFLECTED IDL attributes: in a browser
  // `el.min = "0"` sets the attribute, and `getAttribute("min")` reads it back.
  // Most boxes here get theirs through makeNumber's `setAttribute` loop, but a
  // few are hand-built and assign the PROPERTY -- cost-output.js, which many
  // tiles share, does `input.step = "any"; input.min = "0"` -- and those were
  // invisible to anything reading the attribute, including this project's own
  // declared-minimum sweep. `hidden` matters for a different reason:
  // steps-panel.js skips a control with `closest("[hidden]")`, which can only
  // match an attribute.
  //
  // NOT reflected, correctly: `value`, `checked` and `selected`. A browser does
  // not write those back to the attribute either -- the attribute is the
  // DEFAULT and the property is the current state, which is the distinction
  // this file learned the hard way on 2026-11-24.
  get min() { return this.getAttribute("min") ?? ""; }
  set min(v) { this.setAttribute("min", v == null ? "" : String(v)); }
  get max() { return this.getAttribute("max") ?? ""; }
  set max(v) { this.setAttribute("max", v == null ? "" : String(v)); }
  get step() { return this.getAttribute("step") ?? ""; }
  set step(v) { this.setAttribute("step", v == null ? "" : String(v)); }
  get hidden() { return this.hasAttribute ? this.hasAttribute("hidden") : this.getAttribute("hidden") != null; }
  set hidden(v) { if (v) this.setAttribute("hidden", ""); else this.removeAttribute("hidden"); }

  // `<details>.open`, reflected like `hidden`.
  //
  // This is the OTHER half of the steps-panel reachability gap. ui-fields.js
  // makeStepsPanel guards its draw with `if (!box.open || !last) return;`, so
  // with `open` undefined -- falsy -- drawSteps was NEVER reached under this
  // harness, and the page's own end-to-end "Show the steps" path went
  // unexercised however many tiles a sweep rendered. (ea7cc46c fixed the half
  // where `label[for]` matched nothing; this is the half that stopped the
  // panel drawing at all.)
  get open() { return this.hasAttribute("open"); }
  set open(v) { if (v) this.setAttribute("open", ""); else this.removeAttribute("open"); }

  // Whether the node is still in the document. app.js guards several deferred
  // updates with it, and calc-field.js clears its 1 Hz timer on it, so with
  // this undefined -- falsy -- every one of those paths bailed out and the
  // harness never exercised them.
  //
  // It could not be defined until `replaceChildren` above detached what it
  // removed: on top of the old behaviour a tile's interval never saw itself
  // detached and ran for ever.
  get isConnected() {
    const doc = this.ownerDocument;
    for (let n = this; n; n = n.parentNode) {
      if (n === doc || (doc && n === doc.body) || n.tagName === "BODY" || n.tagName === "HTML") return true;
    }
    return false;
  }

  // Constraint validation, the minimum a caller can observe. length-entry.js
  // sets a custom message for a length outside the box's min/max, and it is
  // guarded by `typeof input.setCustomValidity === "function"` -- so under this
  // harness that whole layer was skipped and a sweep could not see that the
  // page had flagged the value at all.
  setCustomValidity(msg) { this._validity = msg == null ? "" : String(msg); }
  get validationMessage() { return this._validity || ""; }
  checkValidity() { return !(this._validity && this._validity.length); }
  get htmlFor() { return this.getAttribute("for") ?? ""; }
  set htmlFor(v) { this.setAttribute("for", v == null ? "" : String(v)); }
  get valueAsNumber() { return this._value === "" ? NaN : Number(this._value); }
  get selectedOptions() { return this.options.filter((o) => o.selected); }
  get labels() { return []; }
}
// One compound: a tag, any number of .class / #id / [attr] parts, :checked.
// No combinator -- matchSel below walks those itself.
function matchCompound(n, sel) {
  const m = sel.match(/^([a-zA-Z0-9]*)((?:[.#][\w-]+|\[[^\]]+\])*)(:checked)?$/);
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

// A selector is a chain of compounds joined by combinators, and the chain is
// the point: `tbody tr` means a row INSIDE a table body.
//
// This read only the last compound until 2026-11-26 -- `sel.split(/\s+/).pop()`
// -- so it answered `tbody tr` with every `tr` on the page, header rows
// included. v5-platform.js's csvFromTable asks exactly that to collect its
// data rows, so under this harness it emitted its own header a second time as
// data. Nothing drove that path here (its coverage is a real-browser test), so
// the harness was wrong without being caught, which is how a sweep built on it
// later reports a clean number that is not clean. Over-matching is the quiet
// failure: the selector finds MORE than a browser would and nothing throws.
function matchSel(n, sel) {
  if (!sel || !(n instanceof Node) || n.isText) return false;
  const parts = sel.trim().split(/\s+/);
  if (!matchCompound(n, parts.pop())) return false;
  let cur = n;
  while (parts.length) {
    const prev = parts.pop();
    if (prev === ">") {
      const comp = parts.pop();
      if (!comp) return false;
      cur = cur.parentNode;
      if (!(cur instanceof Node) || !matchCompound(cur, comp)) return false;
      continue;
    }
    // Descendant: any ancestor may satisfy it.
    let hit = null;
    for (let a = cur.parentNode; a instanceof Node; a = a.parentNode) {
      if (matchCompound(a, prev)) { hit = a; break; }
    }
    if (!hit) return false;
    cur = hit;
  }
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
