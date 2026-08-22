// spec-v1341 / spec-v1342: the tile-side half of the one-box program.
//
// Resolving field-index rows to a tile's real inputs, writing the reader's own
// values into them, captioning what came from their question, and asking for
// the first value the tile cannot answer without.
//
// A separate module because none of it is reachable from the home view, and
// app.js is loaded there against a hard 49 KB JS sub-budget (spec-v10 §H.2).
// Lazily imported by app.js when a tile renders with a pending query.

// spec-v1341: resolve the field index's rows to this tile's actual inputs.
//
// The index is keyed by the RENDERER's field key, and that is not reliably the
// DOM id. Hand-written renderers name their inputs for the page (`vd-src`,
// `vd-len`) while their schema is keyed by the compute's parameters
// (`source_voltage_V`, `length_ft`), and the declarative factory uses
// `f.id || f.key`, so a tile that declares an explicit id diverges too.
// Assuming the two are the same -- which spec-v1339 originally recorded as
// fact -- puts values into the wrong boxes or into no box at all.
//
// So nothing is assumed: each row is resolved against the LIVE DOM, first by
// id, then by the rendered <label> text, which the index already carries and
// which is the string a human reads beside that input. A row that resolves to
// neither is skipped. Silence is the correct failure here.
function resolveFields(region, rows) {
  const out = new Map();
  if (!region || !Array.isArray(rows)) return out;
  const byLabel = new Map();
  for (const label of region.querySelectorAll("label[for]")) {
    const key = String(label.textContent || "")
      .replace(/\s*\([^()]*\)\s*$/, "").trim().toLowerCase();
    if (key && !byLabel.has(key)) byLabel.set(key, label.getAttribute("for"));
  }
  const taken = new Set();
  for (const row of rows) {
    let el = null;
    try { el = region.querySelector("#" + CSS.escape(row.d)); } catch { el = null; }
    if (!el) {
      const domId = byLabel.get(String(row.l || "").trim().toLowerCase());
      if (domId && !taken.has(domId)) {
        try { el = region.querySelector("#" + CSS.escape(domId)); } catch { el = null; }
      }
    }
    if (!el || taken.has(el.id)) continue;
    taken.add(el.id);
    out.set(row.d, el);
  }
  return out;
}

// The entry point. `provenanceText` is passed in rather than duplicated so the
// caption string lives in exactly one place.
export function applyQueryPrefill({ region, tool, params, query, provenanceText }) {
  PROVENANCE_TEXT = provenanceText;
  import("./query-fill.js").then(async (mod) => {
    const rows = await mod.loadFields(tool.id, tool.group);
    if (!rows || !region.isConnected) return;
    // The tile's own name goes in so the words the reader typed to FIND this
    // calculator are not mistaken for the names of its fields.
    const { filled } = mod.queryFill(query, rows, { name: tool.name });
    const resolved = resolveFields(region, rows);
    const marked = new Set();
    for (const [key, value] of Object.entries(filled)) {
      const el = resolved.get(key);
      if (!el || !el.id) continue;
      // A deep link's values are the reader's, not ours to revise.
      if (Object.prototype.hasOwnProperty.call(params, el.id)) continue;
      if (el.type === "checkbox") el.checked = value === "1" || value === "true";
      else el.value = String(value);
      // Renderers are split on which event they listen to; dispatch both,
      // exactly as applyHashState does.
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      marked.add(el.id);
    }
    // Fields the hash filled from the same typed question are the reader's
    // words too, so they are captioned alongside.
    for (const key of Object.keys(params)) if (key !== "v") marked.add(key);
    markProvenance(region, marked);
    askCard(region, rows, resolved, marked);
  }).catch(() => { /* prefill is an enhancement; the form is always there */ });
}

let PROVENANCE_TEXT = "from your question";

// spec-v1342: ask for the first value the tile cannot answer without.
//
// A query that carries three of four values lands on a form with one empty box
// and no sign which one is holding everything up. One question, in words, at
// the top of the page, is the difference between an assistant and a form.
//
// It renders only when the reader's own words filled something AND a required
// field is still empty. If nothing was filled they typed a tool name, not a
// sentence, and the tile's own form is the right answer.
//
// The question text comes from the RENDERED <label>, never from the registry:
// registry labels are written for machines, and rendering one at a person has
// misfired before. Where no label is found, no card. Fail quiet.
function askCard(region, rows, resolved, filledIds) {
  if (!region || !filledIds || !filledIds.size) return;
  const view = region.parentElement;
  if (!view) return;
  clearAskCard(view);

  const isEmpty = (el) => {
    if (!el) return false;
    if (el.type === "checkbox") return false;         // a box says its own state
    return String(el.value || "").trim() === "";
  };

  // Declaration order, so the reader is asked in the order the tile reads.
  let target = null, targetRow = null;
  for (const row of rows) {
    if (!row.r) continue;
    const el = resolved.get(row.d);
    if (el && isEmpty(el)) { target = el; targetRow = row; break; }
  }
  if (!target || !targetRow) return;
  // A select or checkbox has no sensible one-line stand-in; the field itself is
  // the better control. Number and text only.
  if (target.tagName === "SELECT" || target.type === "checkbox") return;

  const label = view.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(target.id) : target.id) + '"]');
  const labelText = label ? String(label.textContent || "").trim() : "";
  if (!labelText) return;

  // Ask in the unit the field is CURRENTLY showing. "What is the length?" is
  // unanswerable beside a box measured in inches when the reader means feet.
  const unitMatch = labelText.match(/\(([^()]*)\)\s*$/);
  const name = labelText.replace(/\s*\([^()]*\)\s*$/, "").trim().toLowerCase();
  const unit = unitMatch ? unitMatch[1].split(/[,;]/)[0].trim() : "";

  const card = document.createElement("section");
  card.className = "ask-card";
  // NOT a live region, and not inside one: this is a question, not a result.
  card.setAttribute("aria-label", "One more value needed");

  const q = document.createElement("p");
  q.className = "ask-q";
  q.textContent = unit ? `What is the ${name} in ${unit}?` : `What is the ${name}?`;
  card.appendChild(q);

  // The receipt, so the work does not look lost.
  const have = [];
  for (const row of rows) {
    const el = resolved.get(row.d);
    if (!el || !filledIds.has(el.id) || el === target) continue;
    const shown = el.tagName === "SELECT" && el.selectedOptions && el.selectedOptions[0]
      ? el.selectedOptions[0].textContent.trim()
      : String(el.value || "").trim();
    if (shown) have.push(String(row.l).toLowerCase() + " " + shown);
  }
  if (have.length) {
    const receipt = document.createElement("p");
    receipt.className = "ask-receipt";
    // Commas and spaces, never slash-joined: this is the likeliest place on
    // the page to produce a long unbreakable token at 320px.
    receipt.textContent = "Everything else is in: " + have.join(", ") + ".";
    card.appendChild(receipt);
  }

  const form = document.createElement("form");
  form.className = "ask-form";
  const inputId = "ask-" + target.id;
  // A real <label for>, not an aria-label: scripts/check-field-accessors and
  // the a11y sweep hold every dynamically created input to one, and the
  // visible text and the accessible name become a single string that cannot
  // drift apart.
  const inputLabel = document.createElement("label");
  inputLabel.className = "visually-hidden";
  inputLabel.setAttribute("for", inputId);
  inputLabel.textContent = q.textContent;
  const field = document.createElement("input");
  field.id = inputId;
  field.className = "ask-input input";
  field.type = "number";
  field.step = "any";
  field.inputMode = "decimal";
  const go = document.createElement("button");
  go.type = "submit";
  go.className = "ask-go";
  go.textContent = "Use it";
  form.append(inputLabel, field, go);

  const dismiss = () => clearAskCard(view);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = String(field.value || "").trim();
    if (!value) return;
    target.value = value;
    // The renderers are split on which event they listen to.
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    dismiss();
  });
  // A shortcut, never a gate: filling the real field below dismisses it too.
  target.addEventListener("input", dismiss, { once: true });
  target.addEventListener("change", dismiss, { once: true });

  card.appendChild(form);
  // Above the ANSWER, not merely above the inputs: when the card is up there
  // is no answer yet, and a tile that reads a blank required field as zero
  // would otherwise render a confident "0.0" directly above the question
  // asking for the value it needed.
  view.insertBefore(card, view.querySelector(".output-region") || region);
  // Focus is NOT moved here. renderToolView already focuses the h1 for screen
  // reader users and a second focus call in the same microtask races it; the
  // card is the first thing in the body, so Tab reaches it anyway.
}

function clearAskCard(view) {
  if (!view) return;
  for (const el of view.querySelectorAll(".ask-card")) el.remove();
}

// spec-v1341: mark the inputs a typed question filled.
//
// This is the verification affordance -- the whole reason a card beats a chat
// bubble. A tradesperson who sees `120 V - 150 ft - 12 AWG - 20 A` captioned
// under the answer catches a mis-parse in about a second; without the caption
// a prefilled field is indistinguishable from one they typed themselves.
//
// The caption is a <span>, not a <p class="muted">: collapseLongNotes folds
// direct p.muted children of the tool body and would otherwise swallow these.
// It also stays OUT of the output region, which is aria-live -- a caption
// announced as part of the answer on every keystroke is noise.
function markProvenance(region, keys) {
  if (!region || !keys || !keys.size) return;
  for (const key of keys) {
    let el;
    try { el = region.querySelector("#" + CSS.escape(key)); } catch { el = null; }
    if (!el) continue;
    const field = el.closest(".field") || el.parentElement;
    if (!field || field.querySelector(".field-provenance")) continue;
    el.classList.add("is-autofilled");
    const note = document.createElement("span");
    note.className = "field-provenance";
    note.textContent = PROVENANCE_TEXT;
    field.appendChild(note);
    // The first edit makes it the reader's value, not ours. `once` so the
    // listener cannot pile up across re-renders of the same field.
    const clear = () => {
      el.classList.remove("is-autofilled");
      if (note.parentElement) note.remove();
    };
    el.addEventListener("input", clear, { once: true });
    el.addEventListener("change", clear, { once: true });
  }
}

