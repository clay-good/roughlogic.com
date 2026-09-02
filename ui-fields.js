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

// A repeated row -- a timesheet day, a catch can, a panel circuit -- builds
// its inputs by hand and leans on the placeholder to say what each box is.
// The placeholder disappears the instant a value lands, and "Test with
// example" fills every box at once, so the first thing a user does is erase
// every label on the screen and leave a column of bare numbers. This is
// makeNumber's layout at a smaller weight: a caption that stays put.
export function makeRowField(label, id, attrs = {}) {
  const wrap = document.createElement("div");
  wrap.className = "row-field";
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
  // Only when there is one. `span.id = undefined` stamps the string
  // "undefined" into the attribute, which is how pool-calcium-hardness-dose
  // shipped three elements sharing id="undefined": its spec-driven renderer
  // passes `o.id`, and that tile's outputs were written without one. Invalid
  // HTML, a duplicate id, and an output nothing can address by id -- and the
  // page still looked right, so nothing noticed. render-no-nan now sweeps
  // every tile for it.
  if (valueId) span.id = valueId;
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
  if (valueId) span.id = valueId;   // see makeOutputLine: never stamp "undefined"
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
  host.insertBefore(btn, host.firstChild);
  // Whether an answer was already on its way in before priming started. A
  // deep-linked tile gets real input events from applyHashState, and the
  // ?example=1 path clicks this button -- both are meant to show a result.
  // Anything else opens without one. Capture phase, so a renderer that fires
  // non-bubbling events is still seen.
  let seeded = false;
  const mark = () => { seeded = true; };
  btn.addEventListener("click", () => { mark(); fillFn(); });
  host.addEventListener("input", mark, true);
  host.addEventListener("change", mark, true);
  // Deferred: many tiles attach the button before they build their fields,
  // and the view applies deep-linked values right after the renderer returns.
  // A microtask runs after both, still before the first paint.
  queueMicrotask(() => {
    host.removeEventListener("input", mark, true);
    host.removeEventListener("change", mark, true);
    primeExamplePlaceholders(host, fillFn, seeded);
  });
  return btn;
}

// Show the tile's worked-example value as the placeholder of every empty
// field, so a user sees the expected magnitude and format before typing
// anything ("e.g. 150"). Rather than hand-writing a placeholder for each of
// the ~1,700 tiles, run the tile's own example filler once against the freshly
// rendered fields, copy what it wrote into placeholders, and put every field
// back exactly as it was. Fields that already hold a value -- a tile default or
// a deep-linked one -- keep it and get no placeholder.
function primeExamplePlaceholders(host, fillFn, seeded) {
  // The view can already be gone by the time the microtask runs -- a fast
  // hash change, or a catalog-wide sweep. Priming a detached region is pure
  // cost, so skip it.
  if (host.isConnected === false) return;
  const els = Array.from(host.querySelectorAll("input, select, textarea"));
  if (!els.length) return;
  const before = els.map((el) => ({ el, value: el.value, checked: el.checked }));
  // A tile that was not going to show an answer must not start showing one.
  // That includes tiles whose fields carry defaults: computing off a default
  // nobody chose would put a confident verdict on screen before the reader has
  // typed anything.
  const restoreOutputs = seeded ? () => {} : snapshotOutputs(host);
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
  // Some tiles rebuild their own fields inside the filler: the shape select on
  // an area tile, the fixture list on a DFU tile, the per-bend rows on a
  // conduit tile all tear down and re-create the boxes below them. Those boxes
  // are not in the snapshot above -- they did not exist when it was taken -- so
  // the restore never reaches them and the example's numbers stay on screen,
  // looking like a job somebody else typed in, with no placeholder and no
  // answer. Anything the fill created is example output by definition: read it
  // into the placeholder and hand back an empty box.
  // Not when the fill was asked for: the ?example=1 link and a deep link both
  // mean "show me this filled in", and blanking the boxes there would leave an
  // answer standing over empty fields.
  const seen = new Set(before.map((snap) => snap.el));
  if (!seeded) {
    for (const el of host.querySelectorAll("input, select, textarea")) {
      if (seen.has(el)) continue;
      if (isTextish(el) && el.value && !el.getAttribute("placeholder")) {
        el.setAttribute("placeholder", "e.g. " + el.value);
        el.value = "";
      }
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
  // above. Watch the answer region and undo any write until it settles;
  // reverting inside the observer callback means no intermediate frame is ever
  // painted or observable. Once a field differs from what priming put back,
  // the reader has typed and the answer on screen is theirs.
  const untouched = () => before.every((snap) => snap.el.value === snap.value && snap.el.checked === snap.checked);
  restoreOutputs(untouched);
  const out = outputRegionFor(host);
  if (!seeded && out && typeof MutationObserver === "function") {
    const obs = new MutationObserver(() => restoreOutputs(untouched));
    obs.observe(out, { childList: true, subtree: true, characterData: true });
    // Stop watching when the READER acts, not when a timer expires.
    //
    // This used to disconnect after DEBOUNCE_MS * 4 -- 200 ms -- which is
    // ample for a debounced synchronous compute and far too short for a
    // WORKER. manual-j-cooling posts to manual-j-worker.js, so its answer
    // landed after the observer had gone and stood there: the tile opened
    // showing "Total cooling load: 460 BTU/hr" computed from the
    // trade-convention design temps alone, before the reader had entered a
    // single area. Deterministic, 8 opens out of 8. The catalog-wide gate
    // that asserts a tile "answers nothing until asked" reads the region on
    // its own schedule, so it caught this only intermittently.
    //
    // Waiting for a real input event is both correct and safe: `untouched()`
    // already stops the restore the moment a field differs from what priming
    // put back, so a longer watch can never overwrite the reader's own answer.
    let timer = 0;
    const stop = () => {
      restoreOutputs(untouched);
      obs.disconnect();
      host.removeEventListener("input", stop, true);
      host.removeEventListener("change", stop, true);
      clearTimeout(timer);
    };
    // Capture phase: the tile's restore events do not bubble, and neither do
    // some renderers' own. Capture sees them either way. These listeners are
    // attached AFTER the restore above has already fired its events, so the
    // guard never trips on its own writes.
    host.addEventListener("input", stop, true);
    host.addEventListener("change", stop, true);
    // A backstop so the observer cannot outlive a view the reader abandoned.
    timer = setTimeout(stop, 8000);
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
// returned restore takes a predicate: once the reader has changed a field, the
// answer on screen is theirs and must be left alone. Returns a no-op when the
// tile has no sibling output region.
function snapshotOutputs(host) {
  const out = outputRegionFor(host);
  if (!out) return () => {};
  const leaves = Array.from(out.querySelectorAll("*"))
    .filter((el) => !el.firstElementChild)
    .map((el) => ({ el, text: el.textContent }));
  return (untouched) => {
    if (untouched && !untouched()) return;
    for (const leaf of leaves) {
      if (leaf.el.textContent !== leaf.text) leaf.el.textContent = leaf.text;
    }
  };
}
