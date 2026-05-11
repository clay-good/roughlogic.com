// v3 meta-utilities (utilities 170, 172, and 180). These compose existing
// per-tool inputs and outputs from the current session bundle. They do
// not own their own compute. Pure UI over hash-stored state.
//
// Pre-v11 these utilities composed Recents (the auto-tracked ring of
// most recently opened tools). Recents was removed in spec-v11; the
// composition source is now the user-curated Pinned set.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeText, makeOutputLine,
  attachExampleButton, fmt,
} from "./ui-fields.js";

// Tools whose outputs roll up cleanly into a quantity-shopping list.
// Spec utility 172: aggregate quantities from the listed source utilities.
const QUANTITY_SOURCE_TOOLS = {
  // v1
  concrete: { unit: "yd^3", inputKey: "yards" },
  rebar: { unit: "lf", inputKey: "rebar_lf" },
  // v2 / v3
  "tile-count": { unit: "tiles", inputKey: "tiles" },
  "paint-coverage": { unit: "gal", inputKey: "gallons" },
  "masonry-count": { unit: "units", inputKey: "units" },
  excavation: { unit: "yd^3", inputKey: "yards" },
  drywall: { unit: "sheets", inputKey: "sheets" },
  "roofing-squares": { unit: "bundles", inputKey: "bundles" },
  "asphalt-tonnage": { unit: "tons", inputKey: "tons" },
  aggregate: { unit: "yd^3", inputKey: "yards" },
  "mortar-mix": { unit: "bags", inputKey: "bags" },
};

function collectSessionState() {
  // Read pinned and any inputs from the URL hash. The app keeps these in
  // memory; we read window.__roughlogicState if exposed, else fall back to
  // a minimal best-effort default.
  if (typeof window !== "undefined" && window.__roughlogicState) {
    return window.__roughlogicState;
  }
  return { pinned: [], inputs: {} };
}

// --- Utility 170: Job Estimate Roll-Up ---

export function renderJobEstimateRollup(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Composes the outputs of every pinned calculator into a single estimate sheet. Pure UI; no new physics.";

  const state = collectSessionState();
  const pinned = (state.pinned || []).slice();
  const inputs = state.inputs || {};

  if (pinned.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No pinned calculators. Pin a few tools from the home view, then return to this view to roll their outputs into one estimate sheet.";
    inputRegion.appendChild(p);
    return;
  }

  const headerNote = document.createElement("p");
  headerNote.textContent = "Pick which tools to include and add a unit price (optional). The estimate prints with the existing print view.";
  inputRegion.appendChild(headerNote);

  const crew = makeText("Crew", "jer-crew", { autocomplete: "off" });
  const date = makeText("Date", "jer-date", { autocomplete: "off" });
  const addr = makeText("Job address", "jer-addr", { autocomplete: "off" });
  for (const f of [crew, date, addr]) inputRegion.appendChild(f.wrap);

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  for (const h of ["Include", "Tool", "Stored input keys", "Unit price ($, opt)"]) {
    const th = document.createElement("th"); th.textContent = h; th.style.textAlign = "left"; trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  inputRegion.appendChild(table);

  const rows = [];
  for (const id of pinned) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const include = document.createElement("input"); include.type = "checkbox"; include.checked = true; td1.appendChild(include);
    tr.appendChild(td1);
    const td2 = document.createElement("td"); td2.textContent = id; tr.appendChild(td2);
    const td3 = document.createElement("td");
    const stored = inputs[id] || {};
    td3.textContent = Object.keys(stored).join(", ") || "(none)";
    tr.appendChild(td3);
    const td4 = document.createElement("td");
    const price = document.createElement("input"); price.type = "number"; price.step = "any"; price.min = "0"; td4.appendChild(price);
    tr.appendChild(td4);
    tbody.appendChild(tr);
    rows.push({ id, include, price });
    include.addEventListener("change", update);
    price.addEventListener("input", update);
  }

  const oCount = makeOutputLine(outputRegion, "Tools included", "jer-out-c");
  const oTotal = makeOutputLine(outputRegion, "Estimate total", "jer-out-t");

  function update() {
    const included = rows.filter((r) => r.include.checked);
    let total = 0;
    for (const r of included) total += Number(r.price.value) || 0;
    oCount.textContent = String(included.length);
    oTotal.textContent = total > 0 ? "$" + fmt(total, 2) : "(no unit prices set)";
  }
  update();
}

// --- Utility 172: Material Order List ---

export function renderMaterialOrderList(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Aggregates the quantity outputs of utilities 93, 94, 95, 96, 147, 148, 149, 150, 151 from your pinned set. No prices unless supplied.";

  const state = collectSessionState();
  const pinned = (state.pinned || []);
  const inputs = state.inputs || {};

  const note = document.createElement("p");
  note.textContent = "Material order list is built from quantities recorded by the listed source utilities when they are pinned.";
  inputRegion.appendChild(note);

  const found = [];
  for (const id of pinned) {
    if (!QUANTITY_SOURCE_TOOLS[id]) continue;
    const meta = QUANTITY_SOURCE_TOOLS[id];
    const stored = inputs[id] || {};
    // Look for any numeric value in the stored inputs; if absent, surface the tool.
    let value = null;
    for (const k of Object.keys(stored)) {
      const n = Number(stored[k]);
      if (Number.isFinite(n) && n > 0) { value = n; break; }
    }
    found.push({ id, unit: meta.unit, value });
  }

  if (found.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No quantity-producing utilities pinned yet. Pin Drywall, Roofing Squares, Concrete, or similar tools, then return here.";
    outputRegion.appendChild(p);
    return;
  }

  const ul = document.createElement("ul");
  for (const item of found) {
    const li = document.createElement("li");
    li.textContent = item.id + ": " + (item.value !== null ? Math.ceil(item.value) + " " + item.unit : "(no quantity recorded)");
    ul.appendChild(li);
  }
  outputRegion.appendChild(ul);
}

// --- Utility 180: Job Pack ---
//
// Bundle template. Combines selected calculator inputs and outputs into a
// single printable job sheet with header fields for crew, date, and
// address. Pure UI over utilities 121 (Project Bundle) and 122 (Print
// view); hash-stored, never written to disk.

export function renderJobPack(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: A bundle template that composes the user's Pinned set + Project Bundle into one printable job sheet. Pure UI; no new physics. Hash-stored only.";

  const state = collectSessionState();
  const pinned = (state.pinned || []).slice();
  const inputs = state.inputs || {};

  const lead = document.createElement("p");
  lead.textContent = "Fill the header, pick the calculators to include, then use the existing Print view to print or PDF this job sheet.";
  inputRegion.appendChild(lead);

  // Three header fields per spec.
  const crew = makeText("Crew", "jp-crew", { autocomplete: "off" });
  const date = makeText("Date", "jp-date", { autocomplete: "off" });
  const addr = makeText("Job address", "jp-addr", { autocomplete: "off" });
  for (const f of [crew, date, addr]) inputRegion.appendChild(f.wrap);

  if (pinned.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No pinned calculators. Pin a few tools from the home view, then return to compose a Job Pack.";
    outputRegion.appendChild(empty);
    return;
  }

  // Checkbox list of pinned tools.
  const list = document.createElement("ul");
  list.className = "jobpack-tools";
  const rows = [];
  for (const id of pinned) {
    const li = document.createElement("li");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = true; cb.id = "jp-" + id;
    const lbl = document.createElement("label"); lbl.htmlFor = cb.id; lbl.textContent = " " + id;
    li.appendChild(cb); li.appendChild(lbl);
    list.appendChild(li);
    rows.push({ id, cb });
    cb.addEventListener("change", render);
  }
  inputRegion.appendChild(list);

  // The job-sheet preview lives in outputRegion. Re-rendered on every
  // header-field or checkbox change.
  const sheet = document.createElement("div");
  sheet.className = "jobpack-sheet";
  outputRegion.appendChild(sheet);

  function render() {
    while (sheet.firstChild) sheet.removeChild(sheet.firstChild);
    const head = document.createElement("dl");
    head.className = "jobpack-head";
    const fields = [["Crew", crew.input.value], ["Date", date.input.value], ["Job address", addr.input.value]];
    for (const [k, v] of fields) {
      if (!v) continue;
      const dt = document.createElement("dt"); dt.textContent = k; head.appendChild(dt);
      const dd = document.createElement("dd"); dd.textContent = v; head.appendChild(dd);
    }
    sheet.appendChild(head);

    const included = rows.filter((r) => r.cb.checked).map((r) => r.id);
    const h2 = document.createElement("h2"); h2.textContent = "Calculators included (" + included.length + ")";
    sheet.appendChild(h2);

    if (included.length === 0) {
      const p = document.createElement("p"); p.textContent = "(none selected)";
      sheet.appendChild(p);
      return;
    }
    const ul = document.createElement("ul");
    for (const id of included) {
      const li = document.createElement("li");
      const stored = inputs[id] || {};
      const keys = Object.keys(stored);
      li.textContent = keys.length === 0
        ? id + " (no inputs captured)"
        : id + " - " + keys.map((k) => k + "=" + stored[k]).join(", ");
      ul.appendChild(li);
    }
    sheet.appendChild(ul);

    const footer = document.createElement("p");
    footer.className = "jobpack-footer";
    footer.textContent = "Use the existing Print this calculator button to render this Job Pack as a printable sheet.";
    sheet.appendChild(footer);
  }

  for (const f of [crew, date, addr]) {
    f.input.addEventListener("input", render);
  }
  render();
}

export const META_RENDERERS = {
  "job-estimate-rollup": renderJobEstimateRollup,
  "material-order-list": renderMaterialOrderList,
  "job-pack": renderJobPack,
};
