// "Show the steps" (spec-v1964, spec-v106 roadmap pillar 3): the inputs as the
// compute received them and every intermediate number it returned, so a result
// can be defended to an inspector without redoing it. Loaded on first open of
// the panel ui-fields.js makeStepsPanel builds. stepRows is pure so the whole
// declarative catalog is tested without a DOM (test/unit/steps-panel-guard).
// textContent / createElement only - never innerHTML.

import { fmt } from "./ui-fields.js";

// Enough digits to check by hand, no float noise: 0.0104, 3.142, 12.5, 26,180.4.
export function stepNum(v) {
  if (Number.isInteger(v)) return fmt(v, 0);
  const a = Math.abs(v);
  const s = fmt(v, a >= 1000 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

// Rows for the panel. Left out on purpose: booleans and text (the verdict and
// note are already printed), non-finite numbers, input echoes, and any key
// `humanize` (key-labels.js humanizeKey) cannot caption -- a guessed label is
// worse than none.
export function stepRows(fields, params, r, humanize) {
  const rows = [];
  if (!r || typeof r !== "object" || r.error) return rows;
  const inputKeys = new Set();
  for (const f of fields || []) {
    inputKeys.add(f.key);
    const v = params ? params[f.key] : undefined;
    if (v === undefined || v === null || v === "") continue;
    const shown = typeof v === "number" ? (Number.isFinite(v) ? stepNum(v) : null) : String(v);
    if (shown !== null) rows.push({ section: "in", label: String(f.label), value: shown });
  }
  for (const [k, v] of Object.entries(r)) {
    if (inputKeys.has(k) || typeof v !== "number" || !Number.isFinite(v)) continue;
    const label = humanize(k);
    if (label) rows.push({ section: "out", label, value: stepNum(v) });
  }
  return rows;
}

function section(body, title, rows) {
  if (!rows.length) return;
  const h = document.createElement("p");
  const b = document.createElement("strong");
  b.textContent = title;
  h.appendChild(b);
  const dl = document.createElement("dl");
  for (const row of rows) {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.value;
    dl.append(dt, dd);
  }
  body.append(h, dl);
}

export function drawSteps(body, { fields, params, r }, humanize) {
  const rows = stepRows(fields, params, r, humanize);
  body.textContent = "";
  section(body, "Inputs used", rows.filter((x) => x.section === "in"));
  section(body, "Worked values", rows.filter((x) => x.section === "out"));
}
