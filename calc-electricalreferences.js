// Group A: NEC field-reference calculators.
//
// Split intact from calc-references.js by spec-v1872. Calculator IDs,
// formulas, fields, outputs, citations, examples, and Group A assignments
// are unchanged.

import { makeNumber, makeSelect, makeOutputLine, attachExampleButton, fmt } from "./ui-fields.js";

// =====================================================================
// spec-v177 - Group A: NEC Table 300.5 minimum cover-depth reference.
// =====================================================================

// Minimum cover (in) by wiring method (rows) and location (cols), the
// <= 1000 V columns of NEC Table 300.5. "Cover" is measured to the top of
// the raceway/cable. Table footnotes modify specific cells; the AHJ governs.
const _BURIAL_METHODS = [
  "direct burial cable/conductors",
  "RMC or IMC",
  "nonmetallic raceway (PVC etc.)",
  "residential 120V/20A GFCI branch",
  "low-voltage <=30V (irrigation/landscape)",
];
const _BURIAL_LOCATIONS = [
  "general earth",
  "under a building",
  "in trench below 2in concrete",
  "under 4in exterior slab (no vehicles)",
  "under streets/roads/driveways(public)",
  "one/two-family driveway/parking",
];
// [direct, RMC/IMC, PVC, residential-GFCI, low-voltage] cover in inches.
const _BURIAL_COVER = {
  "general earth": [24, 6, 18, 12, 6],
  "under a building": [0, 0, 0, 0, 0],
  // Table 300.5 has two concrete rows. Until 2026-09-19 one option was
  // labeled "under 4in concrete in trench" but carried the 4 in exterior-slab
  // row; the 2 in trench-concrete row (18 / 6 / 12 / 6 / 6) was missing.
  "in trench below 2in concrete": [18, 6, 12, 6, 6],
  "under 4in exterior slab (no vehicles)": [18, 4, 4, 6, 6],
  // Earlier callers' value, kept so a saved request still resolves.
  "under 4in concrete in trench": [18, 4, 4, 6, 6],
  "under streets/roads/driveways(public)": [24, 24, 24, 24, 24],
  "one/two-family driveway/parking": [18, 18, 18, 12, 18],
};

// dims: in { wiring_method: dimensionless, location: dimensionless } out: { min_cover_in: L }
export function computeBurialDepth3005({ wiring_method = "direct burial cable/conductors", location = "general earth" } = {}) {
  const mi = _BURIAL_METHODS.indexOf(wiring_method);
  if (mi < 0) return { error: "Wiring method not recognized." };
  const row = _BURIAL_COVER[location];
  if (!row) return { error: "Location not recognized." };
  const min_cover_in = row[mi];
  return {
    min_cover_in,
    wiring_method,
    location,
    note: "NEC Table 300.5 (0-1000 V): cover is measured to the top of the raceway or cable. Under a building, wiring in a raceway is permitted at 0 in cover. The table footnotes (raceways under buildings, in/under concrete, supplemental protection for the residential GFCI branch) modify specific cells; the AHJ governs.",
  };
}
export const burialDepth3005Example = { inputs: { wiring_method: "nonmetallic raceway (PVC etc.)", location: "general earth" } };

function renderBurialDepth3005(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Table 300.5 (minimum cover requirements, 0 to 1000 volts), by name. Cover is measured to the top of the raceway/cable; the footnotes modify specific cells. The AHJ governs. Free at nfpa.org/freeaccess.";
  const method = makeSelect("Wiring method", "bd-method", _BURIAL_METHODS.map((m) => ({ value: m, label: m })));
  const loc = makeSelect("Location", "bd-loc", _BURIAL_LOCATIONS.map((l) => ({ value: l, label: l })));
  for (const f of [method, loc]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { method.select.value = "nonmetallic raceway (PVC etc.)"; loc.select.value = "general earth"; refresh(); });
  const oCover = makeOutputLine(outputRegion, "Minimum cover", "bd-out-cover");
  const oNote = makeOutputLine(outputRegion, "Note", "bd-out-note");
  function refresh() {
    const r = computeBurialDepth3005({ wiring_method: method.select.value, location: loc.select.value });
    if (r.error) { oCover.textContent = r.error; oNote.textContent = ""; return; }
    oCover.textContent = fmt(r.min_cover_in, 0) + " in";
    oNote.textContent = r.note;
  }
  method.select.addEventListener("change", refresh);
  loc.select.addEventListener("change", refresh);
  refresh();
}

// =====================================================================
// spec-v178 - Group A: NEC Chapter 3 raceway/cable support-spacing reference.
// =====================================================================

// Per-method securing rule: box-proximity distance (in) and the maximum
// support interval (ft). RMC and PVC intervals vary by trade size; the
// returned interval is computed from the trade size when given.
const _SUPPORT_METHODS = ["EMT", "RMC/IMC", "PVC (rigid nonmetallic)", "NM cable (Romex)", "MC cable", "AC cable (BX)"];
// RMC Table 344.30(B)(2): max support interval (ft) by trade size (in).
function _rmcInterval(size) {
  if (size <= 0) return 10;            // conservative default when size unknown
  if (size <= 0.75) return 10;
  if (size <= 1) return 12;
  if (size <= 1.5) return 14;
  if (size <= 2.5) return 16;
  return 20;                            // 3 in and larger
}
// PVC Table 352.30: max support interval (ft) by trade size (in).
function _pvcInterval(size) {
  if (size <= 0) return 3;             // conservative default when size unknown
  if (size <= 1) return 3;
  if (size <= 2) return 5;
  if (size <= 3) return 6;
  if (size <= 5) return 7;
  return 8;                            // 6 in and larger
}

// dims: in { wiring_method: dimensionless, trade_size_in: L } out: { secure_within_in: L, max_interval_ft: L }
export function computeSupportSpacing({ wiring_method = "EMT", trade_size_in = 0 } = {}) {
  if (!_SUPPORT_METHODS.includes(wiring_method)) return { error: "Wiring method not recognized." };
  const size = Number(trade_size_in) || 0;
  let secure_within_in, max_interval_ft, size_dependent = false, code;
  switch (wiring_method) {
    case "EMT": secure_within_in = 36; max_interval_ft = 10; code = "358.30"; break;
    case "RMC/IMC": secure_within_in = 36; max_interval_ft = _rmcInterval(size); size_dependent = true; code = "344.30"; break;
    case "PVC (rigid nonmetallic)": secure_within_in = 36; max_interval_ft = _pvcInterval(size); size_dependent = true; code = "352.30"; break;
    case "NM cable (Romex)": secure_within_in = 12; max_interval_ft = 4.5; code = "334.30"; break;
    case "MC cable": secure_within_in = 12; max_interval_ft = 6; code = "330.30"; break;
    case "AC cable (BX)": secure_within_in = 12; max_interval_ft = 4.5; code = "320.30"; break;
  }
  return {
    secure_within_in,
    max_interval_ft,
    size_dependent,
    code,
    note: "NEC " + code + ": secure within " + secure_within_in + " in of each box/fitting and support at least every " + max_interval_ft + " ft." + (size_dependent ? " RMC and PVC intervals vary with trade size (larger conduit spans farther; the size-specific tables govern)." : "") + " Some methods have securing exceptions (EMT/NM fishing in finished walls, MC at terminations). The AHJ governs.",
  };
}
export const supportSpacingExample = { inputs: { wiring_method: "EMT", trade_size_in: 0 } };

function renderSupportSpacing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 Chapter 3 securing-and-supporting sections (320.30, 330.30, 334.30, 344.30, 352.30, 358.30), by name. RMC/PVC maximum intervals vary with trade size (the size-specific tables govern). The AHJ governs. Free at nfpa.org/freeaccess.";
  const method = makeSelect("Wiring method", "ss-method", _SUPPORT_METHODS.map((m) => ({ value: m, label: m })));
  const size = makeNumber("Trade size (in, for RMC/PVC)", "ss-size", { step: "any", min: "0" });
  for (const f of [method, size]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => { method.select.value = "EMT"; size.input.value = ""; refresh(); });
  const oSecure = makeOutputLine(outputRegion, "Secure within (of each box)", "ss-out-secure");
  const oInterval = makeOutputLine(outputRegion, "Maximum support interval", "ss-out-interval");
  const oNote = makeOutputLine(outputRegion, "Note", "ss-out-note");
  function refresh() {
    const r = computeSupportSpacing({ wiring_method: method.select.value, trade_size_in: Number(size.input.value) || 0 });
    if (r.error) { oSecure.textContent = r.error; oInterval.textContent = ""; oNote.textContent = ""; return; }
    oSecure.textContent = fmt(r.secure_within_in, 0) + " in";
    oInterval.textContent = fmt(r.max_interval_ft, 1) + " ft" + (r.size_dependent ? " (at this trade size)" : "");
    oNote.textContent = r.note;
  }
  method.select.addEventListener("change", refresh);
  size.input.addEventListener("input", refresh);
  refresh();
}

// =====================================================================
// spec-v187 - Group A: NEC 680.26 swimming-pool equipotential-bonding
// checklist reference.
// =====================================================================

// The 680.26(B) bonded-component list, each with its citation. A permanent
// pool/spa bonds the full grid; a permanently installed spa/hot tub follows
// the same way for its conductive parts; a storable pool narrows the list.
const _POOL_TYPES = [
  "permanent pool/spa",
  "permanently installed spa/hot tub",
  "storable pool (limited)",
];
const _POOL_BOND_ITEMS = [
  "Conductive pool shell / structural reinforcing steel (or a listed equivalent) -- 680.26(B)(1)",
  "Perimeter surfaces within 3 ft horizontally, paved and unpaved -- 680.26(B)(2)",
  "Metallic components of the pool structure -- 680.26(B)(3)",
  "Underwater metal forming shells, luminaire, niche -- 680.26(B)(4)",
  "Metal fittings within or attached to the pool structure (ladders, handrails, diving stands); parts no more than 4 in in any dimension that penetrate the structure no more than 1 in are exempt -- 680.26(B)(5)",
  "Electrical equipment: pump motor and others (double-insulated note) -- 680.26(B)(6)",
  "Metal piping and metal awnings/fences within 5 ft -- 680.26(B)(7)",
  "Pool water via a listed water-bond fitting (>= 9 sq in) -- 680.26(C)",
];

// dims: in { pool_type: dimensionless } out: { items: dimensionless }
export function computePoolBonding68026({ pool_type = "permanent pool/spa" } = {}) {
  if (!_POOL_TYPES.includes(pool_type)) return { error: "Pool type not recognized." };
  let items;
  if (pool_type === "storable pool (limited)") {
    items = [
      "Storable pools are not built with an equipotential bonding grid; bonding narrows to listed cord-and-plug equipment and any required GFCI protection -- 680.31/680.32.",
      "No 680.26(B) grid is required for a storable pool; the AHJ governs.",
    ];
  } else {
    items = _POOL_BOND_ITEMS.slice();
  }
  return {
    pool_type,
    items,
    item_count: items.length,
    conductor: "Solid copper, #8 AWG minimum; connections listed and irreversible (exothermic, listed pressure connectors, or listed clamps).",
    note: "NEC 680.26: the equipotential bonding grid ties the listed conductive parts together so they sit at the same potential; the grid is equipotential and need not run to a remote grounding electrode. A permanently installed spa/hot tub follows 680.26 for its conductive parts (a listed self-contained spa carries the manufacturer's bonding provisions). The AHJ governs the final inspection.",
  };
}
export const poolBonding68026Example = { inputs: { pool_type: "permanent pool/spa" } };

function renderPoolBonding68026(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: NEC 2023 680.26 (equipotential bonding) - the 680.26(B) bonded-component list, the 3 ft perimeter, the listed water bond (680.26(C)), and the #8 AWG solid copper minimum. The grid is equipotential; the AHJ governs the inspection. Free at nfpa.org/freeaccess.";
  const type = makeSelect("Pool / spa type", "pb-type", _POOL_TYPES.map((t) => ({ value: t, label: t })));
  inputRegion.appendChild(type.wrap);
  attachExampleButton(inputRegion, () => { type.select.value = "permanent pool/spa"; refresh(); });
  const oItems = makeOutputLine(outputRegion, "Bond these components", "pb-out-items");
  const oCond = makeOutputLine(outputRegion, "Bonding conductor", "pb-out-cond");
  const oNote = makeOutputLine(outputRegion, "Note", "pb-out-note");
  function refresh() {
    const r = computePoolBonding68026({ pool_type: type.select.value });
    if (r.error) { oItems.textContent = r.error; oCond.textContent = "-"; oNote.textContent = ""; return; }
    oItems.textContent = r.items.join("  •  ");
    oCond.textContent = r.conductor;
    oNote.textContent = r.note;
  }
  type.select.addEventListener("change", refresh);
  refresh();
}

export const ELECTRICALREFERENCE_RENDERERS = {
  "burial-depth-300-5": renderBurialDepth3005,
  "support-spacing": renderSupportSpacing,
  "pool-bonding-680-26": renderPoolBonding68026,
};
