// Shared form-field helpers used by every calculator module.
//
// Centralizes the input/select/checkbox/output line builders so each
// calc-*.js does not redeclare them. Copy buttons emit "Copied"
// announcements through clipboard.js for consistent screen-reader
// behavior. textContent / createElement only - never innerHTML.

import { copyText } from "./clipboard.js";

export const DEBOUNCE_MS = 50;

export function debounce(fn, ms = DEBOUNCE_MS) {
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function fmt(n, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "-";
  return Number(n).toFixed(digits);
}

export function makeNumber(label, id, attrs = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.id = id;
  input.inputMode = "decimal";
  input.autocomplete = "off";
  for (const [k, v] of Object.entries(attrs)) input.setAttribute(k, String(v));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return { wrap, input };
}

export function makeText(label, id, attrs = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.autocomplete = "off";
  for (const [k, v] of Object.entries(attrs)) input.setAttribute(k, String(v));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return { wrap, input };
}

export function makeTextarea(label, id, attrs = {}) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const input = document.createElement("textarea");
  input.id = id;
  input.autocomplete = "off";
  for (const [k, v] of Object.entries(attrs)) input.setAttribute(k, String(v));
  wrap.appendChild(lab);
  wrap.appendChild(input);
  return { wrap, input };
}

export function makeSelect(label, id, options) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = label;
  const sel = document.createElement("select");
  sel.id = id;
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.selected) opt.selected = true;
    sel.appendChild(opt);
  }
  wrap.appendChild(lab);
  wrap.appendChild(sel);
  return { wrap, select: sel };
}

export function makeCheckbox(label, id, checked = false) {
  const wrap = document.createElement("div");
  wrap.className = "field field-check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  const lab = document.createElement("label");
  lab.htmlFor = id;
  lab.textContent = " " + label;
  wrap.appendChild(input);
  wrap.appendChild(lab);
  return { wrap, input };
}

// Labels whose value is prose, not an answer. Around a thousand tiles end
// their output list with a "Note" that restates the tile's scope in a full
// paragraph -- useful, but not something to print between the numbers with a
// Copy button beside it. Give it its own collapsed row instead, so the answer
// area stays short and the note is one click away.
const PROSE_LABELS = new Set(["Note", "Notes"]);

export function makeOutputLine(parent, label, valueId) {
  if (PROSE_LABELS.has(label)) return makeNoteLine(parent, label, valueId);
  const row = document.createElement("p");
  const lab = document.createElement("strong");
  lab.textContent = label + ": ";
  row.appendChild(lab);
  const span = document.createElement("span");
  span.id = valueId;
  span.className = "out-value";
  row.appendChild(span);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.style.marginLeft = "8px";
  btn.textContent = "Copy";
  btn.addEventListener("click", () => copyText(span.textContent || "", btn));
  row.appendChild(btn);
  parent.appendChild(row);
  return span;
}

// Same contract as makeOutputLine -- returns the element the caller writes the
// value into -- but rendered as a collapsed disclosure and left out of
// clipboard.collectOutputs (which reads <p><strong> rows), so "Copy all"
// copies the answer rather than a page of prose.
function makeNoteLine(parent, label, valueId) {
  const row = document.createElement("details");
  row.className = "note-row";
  const sum = document.createElement("summary");
  sum.textContent = label;
  row.appendChild(sum);
  const span = document.createElement("span");
  span.id = valueId;
  span.className = "out-value note-value";
  row.appendChild(span);
  parent.appendChild(row);
  return span;
}

export function attachExampleButton(host, fillFn) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "example-btn";
  btn.textContent = "Test with example";
  btn.addEventListener("click", fillFn);
  host.insertBefore(btn, host.firstChild);
  // Deferred: many tiles attach the button before they build their fields,
  // and the view applies deep-linked values right after the renderer returns.
  // A microtask runs after both, still before the first paint.
  queueMicrotask(() => primeExamplePlaceholders(host, fillFn));
  return btn;
}

// Show the tile's worked-example value as the placeholder of every empty
// field, so a user sees the expected magnitude and format before typing
// anything ("e.g. 150"). Rather than hand-writing a placeholder for each of
// the ~1,700 tiles, run the tile's own example filler once against the freshly
// rendered fields, copy what it wrote into placeholders, and put every field
// back exactly as it was. Fields that already hold a value -- a tile default or
// a deep-linked one -- keep it and get no placeholder.
function primeExamplePlaceholders(host, fillFn) {
  // The view can already be gone by the time the microtask runs -- a fast
  // hash change, or a catalog-wide sweep. Priming a detached region is pure
  // cost, so skip it.
  if (host.isConnected === false) return;
  const els = Array.from(host.querySelectorAll("input, select, textarea"));
  if (!els.length) return;
  const before = els.map((el) => ({ el, value: el.value, checked: el.checked }));
  // A tile opened blank must still read blank once priming is done. A tile
  // opened with deep-linked or default values is meant to show its answer, so
  // leave that answer alone.
  const startedBlank = before.every((snap) => !isTextish(snap.el) || !snap.value);
  const restoreOutputs = startedBlank ? snapshotOutputs(host) : () => {};
  try {
    fillFn();
  } catch {
    // A filler that throws against empty fields leaves nothing to copy;
    // the restore below still runs so the tile renders as it always did.
  }
  const touched = [];
  for (const snap of before) {
    const el = snap.el;
    if (isTextish(el) && !snap.value && el.value && !el.getAttribute("placeholder")) {
      el.setAttribute("placeholder", "e.g. " + el.value);
    }
    if (el.value !== snap.value || el.checked !== snap.checked) {
      el.value = snap.value;
      el.checked = snap.checked;
      touched.push(el);
    }
  }
  // Re-fire the events the tile listens on so any mode-driven field
  // visibility and the output region return to their pre-fill state. These do
  // not bubble: the tile's own per-field listeners see them, but the delegated
  // hash-state writer on the region does not, so opening a tile still leaves
  // the URL as a bare `#tool-id`.
  for (const el of touched) {
    el.dispatchEvent(new Event("input", { bubbles: false }));
    el.dispatchEvent(new Event("change", { bubbles: false }));
  }
  // The filler's compute is debounced, so it lands well after the restore
  // above. Watch the answer region and undo any write until it settles: a tile
  // opened blank has to stay blank, and reverting inside the observer callback
  // means no intermediate frame is ever painted or observable.
  const stillBlank = () => before.every((snap) => !isTextish(snap.el) || !snap.el.value);
  restoreOutputs(stillBlank);
  const out = outputRegionFor(host);
  if (startedBlank && out && typeof MutationObserver === "function") {
    const obs = new MutationObserver(() => restoreOutputs(stillBlank));
    obs.observe(out, { childList: true, subtree: true, characterData: true });
    setTimeout(() => { restoreOutputs(stillBlank); obs.disconnect(); }, DEBOUNCE_MS * 4);
  }
}

function isTextish(el) {
  return el.tagName === "TEXTAREA"
    || (el.tagName === "INPUT" && (el.type === "number" || el.type === "text"));
}

function outputRegionFor(host) {
  return (host.parentElement && host.parentElement.querySelector(".output-region")) || null;
}

// Capture the answer region's current text so priming can put it back. The
// returned restore takes a predicate: once the reader has typed something, the
// answer on screen is theirs and must be left alone. Returns a no-op when the
// tile has no sibling output region.
function snapshotOutputs(host) {
  const out = outputRegionFor(host);
  if (!out) return () => {};
  const leaves = Array.from(out.querySelectorAll("*"))
    .filter((el) => !el.firstElementChild)
    .map((el) => ({ el, text: el.textContent }));
  return (stillBlank) => {
    if (stillBlank && !stillBlank()) return;
    for (const leaf of leaves) {
      if (leaf.el.textContent !== leaf.text) leaf.el.textContent = leaf.text;
    }
  };
}
