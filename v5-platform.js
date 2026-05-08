// Group I extensions (v5 Step 62, utilities 269-271).
//
// 269 CSV export of tabular output, 270 print-table CSS (in styles.css),
// 271 inline glossary tooltip. All helpers are deterministic, hash-stated,
// and zero-network: no third-party CSV library, no analytics, no fetch
// beyond the same-origin glossary shard.

// --- 269: CSV builder ---
//
// Build a CSV string from a 2D array of header + rows. Quote any cell
// containing a comma, double-quote, CR, or LF. Double-quote escapes are
// doubled per RFC 4180.

export function buildCsv({ header = [], rows = [] }) {
  const all = [];
  if (header.length) all.push(header);
  for (const r of rows) all.push(r);
  return all.map(rowToCsv).join("\r\n");
}

function rowToCsv(row) {
  return row.map(cellToCsv).join(",");
}

function cellToCsv(cell) {
  const s = cell == null ? "" : String(cell);
  if (/[",\r\n]/.test(s)) {
    return "\"" + s.replace(/"/g, "\"\"") + "\"";
  }
  return s;
}

// Deterministic 32-bit FNV-1a hash, returned as 8-character lowercase hex.
// Used to stamp the CSV filename with a content-hash suffix so two
// downloads with different inputs do not collide in the user's downloads
// folder. No cryptographic security claim; FNV is sufficient.
export function inputHash(text) {
  const s = String(text || "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit and pad to 8 hex.
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

// Build a CSV from a rendered <table>. Pulls the first thead row as
// header (or, lacking thead, the first tbody row as header) and every
// remaining tbody row as data.
export function csvFromTable(tableEl) {
  if (!tableEl) return "";
  const headers = [];
  const thead = tableEl.querySelector("thead");
  if (thead) {
    const cells = thead.querySelectorAll("th, td");
    for (const c of cells) headers.push((c.textContent || "").trim());
  }
  const rows = [];
  const bodyRows = tableEl.querySelectorAll("tbody tr");
  for (const tr of bodyRows) {
    const r = [];
    for (const c of tr.querySelectorAll("th, td")) r.push((c.textContent || "").trim());
    rows.push(r);
  }
  // If no thead found, treat first row as header.
  if (!headers.length && rows.length) return buildCsv({ header: rows[0], rows: rows.slice(1) });
  return buildCsv({ header: headers, rows });
}

// Mount a "Copy CSV" button next to a table. The button builds the CSV
// in memory, creates a same-origin Blob URL, triggers a download with
// filename rl-<tool-id>-<inputhash>.csv, and revokes the URL.
//
// `inputProvider` is an optional () => string that returns the
// stringified inputs to mix into the filename hash.
export function attachCsvExport({ table, parent, toolId, inputProvider }) {
  if (!table || !parent) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-csv-btn";
  btn.textContent = "Copy CSV";
  btn.setAttribute("aria-label", "Download table as CSV");
  btn.addEventListener("click", () => {
    const csv = csvFromTable(table);
    const inputs = inputProvider ? String(inputProvider() || "") : "";
    const name = "rl-" + (toolId || "table") + "-" + inputHash(csv + "::" + inputs) + ".csv";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  parent.appendChild(btn);
  return btn;
}

// --- 271: Inline glossary tooltip ---
//
// Original plain-English definitions written by the project author.
// data/cross/glossary.json - inlined here for the v5 starter so the
// tooltip works without a fetch on first render.

export const GLOSSARY = {
  MACRS: "Modified Accelerated Cost Recovery System. The depreciation method most U.S. business assets use for tax. Bundled percentage tables (Pub 946) prescribe the deduction by class life and convention.",
  FICA: "Federal Insurance Contributions Act. The combined Social Security (6.2%) and Medicare (1.45%) tax. Self-employed pay both halves via Schedule SE; employees split it with the employer.",
  Section_179: "An election to expense the full cost of qualifying business property in the placed-in-service year, up to an annual cap that phases out above a property-cost threshold.",
  bonus_depreciation: "An additional first-year depreciation under IRC 168(k). The percentage phases down (80% in 2023 down to 20% in 2026 and 0% in 2027 unless Congress extends).",
  DSO: "Days Sales Outstanding. Average number of days between making a sale and collecting cash on it.",
  DIO: "Days Inventory Outstanding. Average number of days inventory sits before being sold.",
  DPO: "Days Payable Outstanding. Average number of days between receiving a supplier invoice and paying it.",
  contribution_margin: "Sale price per unit minus variable cost per unit. The dollars each unit contributes toward fixed costs and profit.",
  statute_of_limitations: "The deadline by which a lawsuit must be filed. After it runs, the claim is barred regardless of merit. Each state and claim type has its own period and accrual rule.",
  jurisdictional_maximum: "The largest dollar amount a court is allowed to award. Small-claims courts have low maxima ($6k - $25k by state).",
  ABC_test: "A worker is an independent contractor only if all three prongs are met: free from control, outside the usual course of business, engaged in an independently established trade.",
  FLSA: "Fair Labor Standards Act, 29 USC 201+. Sets the federal minimum wage, overtime (1.5x over 40 hr/wk), and tip-credit framework.",
  molarity: "Concentration in moles of solute per liter of solution. M = mol / L. The standard chemistry concentration unit.",
  RCF: "Relative Centrifugal Force, expressed as multiples of gravitational acceleration g. Also called g-force.",
  pKa: "The pH at which an acid is half-dissociated. Buffers work best within ~1 pH unit of their pKa.",
  hemocytometer: "A glass slide with a precisely etched grid (improved Neubauer) used to count cells under a microscope. Each large square holds exactly 0.1 microliter.",
  RPM: "Revolutions Per Minute. The rotational speed of a centrifuge rotor.",
  C1V1_C2V2: "The dilution identity: stock concentration times stock volume equals final concentration times final volume.",
  IUPAC: "International Union of Pure and Applied Chemistry. Maintains the standard atomic weights table cited per element in the bundled molecular-weight calculator.",
  GHS: "Globally Harmonized System of Classification and Labelling of Chemicals. Provides the pictograms and signal words used on chemical containers.",
  Wayfair_economic_nexus: "Post-South Dakota v. Wayfair (2018), states can require remote sellers to collect sales tax once they cross a sales or transactions threshold, even without physical presence.",
};

// Mount a tooltip on an existing element. Tooltip opens on mouseenter
// and on focus; closes on mouseleave, blur, and Escape. WCAG 2.2 AA
// behavior: keyboard accessible, visible focus, escape-dismissible.
export function attachGlossaryTooltip(el, glossaryKey) {
  if (!el) return null;
  const def = GLOSSARY[glossaryKey];
  if (!def) return null;
  el.setAttribute("aria-describedby", "glossary-" + glossaryKey);
  if (!el.hasAttribute("tabindex") && el.tagName !== "INPUT" && el.tagName !== "BUTTON" && el.tagName !== "SELECT" && el.tagName !== "TEXTAREA") {
    el.setAttribute("tabindex", "0");
  }
  const tip = document.createElement("span");
  tip.className = "glossary-tooltip";
  tip.id = "glossary-" + glossaryKey;
  tip.setAttribute("role", "tooltip");
  tip.textContent = def;
  tip.style.display = "none";
  // Insert tooltip after the element so styles can position it.
  if (el.parentNode) el.parentNode.insertBefore(tip, el.nextSibling);
  function show() { tip.style.display = ""; }
  function hide() { tip.style.display = "none"; }
  function onKey(e) { if (e.key === "Escape") { hide(); el.blur(); } }
  el.addEventListener("mouseenter", show);
  el.addEventListener("mouseleave", hide);
  el.addEventListener("focus", show);
  el.addEventListener("blur", hide);
  el.addEventListener("keydown", onKey);
  return tip;
}
