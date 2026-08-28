// roughlogic application entry.
// Vanilla ES module. No dependencies. No innerHTML. No eval. No Function constructor.

// Calculator modules and their support libs are loaded on demand. Per
// spec section 11.1, the home view stays well under 100 KB by importing
// only what the home view needs (this module + integrity.js). Calculator
// renderers, hash-state, data-stamp, and pure-math come in dynamically
// when the user opens a tool.
import { verifyManifestIntegrity } from "./integrity.js";
import { parseHashRoute } from "./routing.js";
import { leadSentence, restOfDescription } from "./text-lead.js";

// Recents (utility 120) was removed in v11; see specs/spec-v11.md.

// The tile-id -> renderer-module registry lives in its own lazy-loaded
// shard (spec-v10 SS H.1 / H.2). It is 24.4 KB gzipped and the home view
// never reads it, so it is imported on the first tile open instead of at
// boot. loadRenderer() was already async, so nothing else had to change.
let toolModulesPromise = null;
function loadToolModules() {
  if (!toolModulesPromise) toolModulesPromise = import("./tool-modules.js").then((m) => m.TOOL_MODULES);
  return toolModulesPromise;
}

const moduleCache = new Map();
async function loadRenderer(toolId) {
  const meta = (await loadToolModules())[toolId];
  if (!meta) return null;
  let promise = moduleCache.get(meta.path);
  if (!promise) {
    promise = import(meta.path);
    moduleCache.set(meta.path, promise);
  }
  const mod = await promise;
  const set = mod[meta.exportName];
  return set ? set[toolId] || null : null;
}

let supportLibsPromise = null;
function loadSupportLibs() {
  if (!supportLibsPromise) {
    supportLibsPromise = Promise.all([
      import("./hash-state.js"),
      import("./data-stamp.js"),
      import("./clipboard.js"),
      import("./ui-validity.js"),
    ]).then(([hs, ds, cb, uv]) => ({ ...hs, ...ds, ...cb, ...uv }));
  }
  return supportLibsPromise;
}

// Reference-style tools that should display "Source: <dataset>, version X,
// fetched Y." per spec section 11.7. First-principles calculators cite
// physics inline and are not listed here.
const TOOL_DATA_SOURCES = {
  "motor-fla": { folder: "electrical", shard: "motor-fla.json", label: "Motor full-load amps (manufacturer-attributed)" },
  "conduit-fill": { folder: "electrical", shard: "conduit-fill-tables.json", label: "Conductor cross-sectional areas" },
  "egc-sizing": { folder: "electrical", shard: "ampacity-physics.json", label: "EGC reference (impedance considerations)" },
  "pipe-sizing": { folder: "plumbing", shard: "fixture-units.json", label: "Hunter's Curve fixture units" },
  "gas-pipe-sizing": { folder: "plumbing", shard: "gas-pipe-capacity.json", label: "Gas pipe capacity (Spitzglass)" },
  "refrigerant-pt": { folder: "hvac", shard: "refrigerants.json", label: "Refrigerant P-T tables" },
  "superheat-subcool": { folder: "hvac", shard: "refrigerants.json", label: "Refrigerant P-T tables" },
  "manual-j-cooling": { folder: "hvac", shard: "climate-data.json", label: "NOAA climate design temperatures" },
  "manual-j-heating": { folder: "hvac", shard: "climate-data.json", label: "NOAA climate design temperatures" },
  "water-classes": { folder: "restoration", shard: "water-classes.json", label: "Water classes and categories (original summaries)" },
  "drying-times": { folder: "restoration", shard: "drying-times.json", label: "Material drying times (original notes)" },
  "mold": { folder: "restoration", shard: "mold-conditions.json", label: "Mold growth conditions" },
  "ppe": { folder: "restoration", shard: "water-classes.json", label: "PPE selection (OSHA / IICRC referenced)" },
  "lumber-spans": { folder: "construction", shard: "lumber-properties.json", label: "Lumber material properties" },
  "fastener-pullout": { folder: "construction", shard: "lumber-properties.json", label: "Wood specific gravity" },
  "fire-friction": { folder: "fire", shard: "hose-friction.json", label: "Fire hose friction (NFA)" },
  "required-fire-flow": { folder: "fire", shard: "fire-flow-formulas.json", label: "ISO needed-fire-flow formulas" },
  "sales-tax": { folder: "crosswalks", shard: "state-tax-rates.json", label: "State sales tax rates" },
  "unit-converter": { folder: "crosswalks", shard: "unit-conversions.json", label: "NIST SP 811 unit factors" },
  "backflow": { folder: "summaries", shard: "summaries.json", label: "Backflow scenarios (original summaries)" },
  "smoke-reading": { folder: "summaries", shard: "summaries.json", label: "Smoke reading reference (original summaries)" },
  // v2
  "gfci-afci-reference": { folder: "summaries", shard: "v2-references.json", label: "GFCI/AFCI requirements (original summaries; NEC by section only)" },
  "lighting-density": { folder: "electrical", shard: "lighting-density.json", label: "Lighting power density benchmarks" },
  "water-hammer-arrestor": { folder: "summaries", shard: "v2-references.json", label: "Water hammer arrestor sizing (PDI WH-201 method)" },
  "trap-arm": { folder: "summaries", shard: "v2-references.json", label: "Trap arm length (engineering practice)" },
  "gas-leak-rate": { folder: "plumbing", shard: "gas-pipe-capacity.json", label: "Gas properties for orifice leak estimation" },
  "compare-refrigerants": { folder: "hvac", shard: "refrigerants.json", label: "Refrigerant P-T tables (manufacturer-attributed)" },
  "refrigerant-charge": { folder: "hvac", shard: "charge-per-foot.json", label: "Refrigerant charge per foot (manufacturer-attributed)" },
  "equivalent-length": { folder: "hvac", shard: "equivalent-lengths.json", label: "Fitting equivalent lengths" },
  "insulation-thickness": { folder: "hvac", shard: "insulation.json", label: "Insulation conductivity references" },
  "thermal-delta-t": { folder: "summaries", shard: "v2-references.json", label: "Thermal imager delta-T reference (original summaries)" },
  "footing-area": { folder: "construction", shard: "soil-bearing.json", label: "Soil bearing capacities (USGS-derived)" },
  "wind-pressure": { folder: "construction", shard: "wind-snow-zones.json", label: "Wind / snow design data (NOAA / public ASCE 7 formula)" },
  "snow-load": { folder: "construction", shard: "wind-snow-zones.json", label: "Wind / snow design data (NOAA / public ASCE 7 formula)" },
  "mileage-cost": { folder: "crosswalks", shard: "irs-mileage.json", label: "IRS standard mileage rate" },
  "per-diem": { folder: "crosswalks", shard: "gsa-perdiem.json", label: "GSA per-diem rates" },
  "color-codes": { folder: "summaries", shard: "v2-references.json", label: "Color codes reference (original summaries)" },
  "knot-reference": { folder: "summaries", shard: "v2-references.json", label: "Knot reference (original summaries; NFA training)" },
  "inspection-checklist": { folder: "summaries", shard: "v2-references.json", label: "Inspection prep checklist (original summaries)" },
  "emergency-contacts": { folder: "summaries", shard: "v2-references.json", label: "Utility locator and emergency contacts (US)" },
  "tool-maintenance": { folder: "summaries", shard: "v2-references.json", label: "Tool maintenance intervals (original summaries)" },
  // v3
  "cable-bend-radius": { folder: "electrical", shard: "cable-bend-radius.json", label: "Cable bend radius (manufacturer-attributed)" },
  "poe-budget": { folder: "electrical", shard: "poe-classes.json", label: "PoE class budgets (IEEE 802.3, manufacturer cable resistance)" },
  "stormwater-rational": { folder: "plumbing", shard: "runoff-coefficients.json", label: "Runoff coefficients (public engineering practice)" },
  "manning-slope": { folder: "plumbing", shard: "manning-roughness.json", label: "Manning roughness coefficients" },
  "glycol-mix": { folder: "plumbing", shard: "glycol-curves.json", label: "Glycol freeze-point curves (manufacturer-attributed)" },
  "backflow-loss": { folder: "plumbing", shard: "backflow-curves.json", label: "Backflow preventer pressure-loss curves (manufacturer-attributed)" },
  "geothermal-loop": { folder: "hvac", shard: "geothermal-soil.json", label: "Geothermal loop BTU per linear foot (DOE technical reports)" },
  "baseboard-output": { folder: "hvac", shard: "baseboard-output.json", label: "Hydronic baseboard BTU/ft (manufacturer-attributed)" },
  "concrete-mix-design": { folder: "construction", shard: "aci-211-curves.json", label: "ACI 211 mix-design curve points (cited by name only)" },
  "bolt-torque": { folder: "construction", shard: "bolt-grades.json", label: "Bolt grade proof loads (ASTM/SAE benchmarks; cited by name only)" },
  "speeds-feeds": { folder: "construction", shard: "sfm-table.json", label: "SFM and chipload table (engineering practice)" },
  "weld-usage": { folder: "construction", shard: "aws-deposition.json", label: "AWS deposition efficiencies (cited by name only)" },
  "trench-slope": { folder: "crosswalks", shard: "osha-trench.json", label: "OSHA trench sloping (29 CFR 1926 Subpart P)" },
  "niosh-lifting": { folder: "crosswalks", shard: "niosh-coupling.json", label: "NIOSH 1991 Lifting Equation" },
  "heat-stress": { folder: "crosswalks", shard: "heat-cold-stress.json", label: "Heat / cold stress (NWS / OSHA)" },
  "wind-chill": { folder: "crosswalks", shard: "heat-cold-stress.json", label: "Heat / cold stress (NWS / OSHA)" },
  // v4 trucking
  "dim-weight": { folder: "trucking", shard: "dim-divisors.json", label: "Carrier DIM divisors (cited by carrier name only)" },
  "reefer-burn": { folder: "trucking", shard: "reefer-burn.json", label: "Reefer GPH benchmarks (manufacturer-attributed)" },
  // v3 references (data-driven from v3-references shard)
  "hand-signals": { folder: "summaries", shard: "v3-references.json", label: "Hand signal reference (original summaries)" },
  "osha-top10": { folder: "summaries", shard: "v3-references.json", label: "OSHA top-10 most-cited standards" },
  "loto-steps": { folder: "summaries", shard: "v3-references.json", label: "Lockout/tagout procedure (original summaries; 29 CFR 1910.147 by section)" },
  "defensible-space": { folder: "summaries", shard: "v3-references.json", label: "Defensible space reference (CALFIRE/NFPA by name only)" },
  "storm-shelter": { folder: "summaries", shard: "v3-references.json", label: "FEMA P-320 storm shelter reference (by name only)" },
  "triage-quickread": { folder: "summaries", shard: "v3-references.json", label: "Field first aid triage quick-read (original summaries)" },
  // v7 Group A extensions (utilities 234-237).
  "short-circuit-pp": { folder: "electrical", shard: "conductor-c-values.json", label: "Conductor C-values for the Bussmann point-to-point method" },
  "generator-motor-starting": { folder: "electrical", shard: "nema-mg1-code-letters.json", label: "NEMA MG-1 starting kVA per HP by code letter" },
  "service-load-standard": { folder: "electrical", shard: "dwelling-demand.json", label: "Dwelling demand-factor parameters (NEC 220.42 / 220.53 / 220.54 / 220.55)" },
  // v7 Group B extensions (utilities 238-241).
  "water-hammer-surge": { folder: "plumbing", shard: "pipe-elastic-properties.json", label: "Pipe elastic properties for the Joukowsky water-hammer formula" },
  "pump-operating-point": { folder: "plumbing", shard: "pump-curves.json", label: "Pump curves (manufacturer-attributed where redistributable)" },
  "pipe-expansion-loop": { folder: "plumbing", shard: "thermal-expansion-coefficients.json", label: "Pipe thermal-expansion coefficients and guided-cantilever stress allowables" },
  // v7 Group C extensions (utilities 242-245).
  "duct-friction-static": { folder: "hvac", shard: "duct-roughness.json", label: "Duct absolute roughness and fitting C_o values (ASHRAE Fundamentals duct-design)" },
  "refrigerant-charging": { folder: "hvac", shard: "refrigerant-pt-tables.json", label: "Manufacturer-attributed P-T tables (R-410A / R-32 / R-454B / R-22 / R-134a)" },
  "insulation-heat-loss": { folder: "hvac", shard: "insulation-k-values.json", label: "Insulation thermal conductivity (manufacturer-attributed)" },
  // v7 Group E extensions (utilities 246-251).
  "rebar-schedule": { folder: "construction", shard: "rebar-unit-weights.json", label: "Rebar unit weights and bar diameters (ACI/CRSI by name only)" },
  "plywood-span": { folder: "construction", shard: "apa-span-ratings.json", label: "APA span-rating tables (cited by APA name only)" },
  "helical-pile": { folder: "construction", shard: "helical-pile-kt.json", label: "Helical-pile Kt benchmarks (manufacturer-attributed)" },
  // v7 Group F + G extensions (utilities 252-253).
  "iso-nff": { folder: "fire", shard: "iso-nff.json", label: "ISO Public Protection Classification F factors and Oi multipliers" },
  "fall-protection-clearance": { folder: "crosswalks", shard: "fall-protection-benchmarks.json", label: "Connector free-fall and decel benchmarks (manufacturer-attributed)" },
  // v4 Group Q: historical pricing context. The runtime-loaded per-commodity
  // shard rewrites this label with the commodity-specific source line; the
  // manifest folder reference stamps the bundled-on date for the dataset as
  // a whole.
  "historical-pricing": { folder: "historical", shard: "manifest.json", label: "Historical commodity pricing (BLS PPI / EIA / USDA NASS / FRED)" },
  // v12 Group X: real-estate data shards (FHFA / HUD / VA, FY2026 cycle).
  "loan-limits": { folder: "realestate", shard: "loan-limits.json", label: "FHFA + HUD FHA loan limits, 2026 cycle (federal-published)" },
  "hud-fmr": { folder: "realestate", shard: "hud-fmr.json", label: "HUD Fair Market Rents, FY2026 (federal-published)" },
};

const TRADES = ["electrical", "plumbing", "hvac", "restoration", "carpentry", "fire", "trucking", "mechanic", "agriculture", "water", "stage", "kitchen", "field", "reference", "accounting", "small-business", "tax", "legal", "lab", "compliance"];
// spec-v107: groups S (Legal), U (Veterinary), V (EMS), W (Aviation) retired.
// Gaps in the letter sequence are expected and allowed (spec-v106 §5).
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "T", "X", "Y", "Z"];

// Display names for each group used as section headers on the home page.
const GROUP_NAMES = {
  A: "Electrical",
  B: "Plumbing and Gas",
  C: "HVAC",
  D: "Water Damage and Mold Restoration",
  E: "Carpentry and Construction",
  F: "Fire-Ground Engineering",
  G: "Cross-Trade Utilities",
  H: "Knowledge References",
  J: "Trucking and Logistics",
  K: "Mechanic - Auto, Marine, Aviation",
  L: "Agriculture and Forestry",
  M: "Water and Wastewater Operations",
  N: "Stage and Live Production",
  O: "Kitchen and Food Service",
  P: "Field, Backcountry, and SAR",
  Q: "Historical Reference Data",
  R: "Accounting, Tax, and Small-Business",
  T: "Bench Science and Laboratory Math",
  X: "Real Estate",
  Y: "Educators and K-12",
  Z: "Rigging and Heavy Lift",
};

// Tool registry. Order matches spec.md section 12.
// Each entry: id (kebab-case route), name, group, trades, desc.
// spec-v17 §H.2: the TOOLS metadata registry (~30 KB gzipped) lives in
// tools-data.js and is lazy-loaded so the bare home view excludes it.
// The home #tools view is static HTML; TOOLS is needed only to route a
// tile hash, render a tool view, or power search -- all on interaction
// or a deep-link, never at home first paint. ensureTools() mirrors the
// ensureAliases() lazy pattern used by the search dropdown.
let TOOLS = null;
let _toolsPromise = null;
function ensureTools() {
  if (TOOLS) return Promise.resolve(TOOLS);
  if (!_toolsPromise) {
    _toolsPromise = import("./tools-data.js").then((m) => { TOOLS = m.TOOLS; return TOOLS; });
  }
  return _toolsPromise;
}
const EMPTY_IDS = [];

const FIRE_GROUND_TRADE = "fire";
// Trades a tile carries when it is for everybody, not for a fireground. The
// notice says who is in charge of the answer, so "incident command governs the
// fireground" on a sales-tax or unit-conversion tile names the wrong authority
// -- and those tiles reached it only because `fire` is one of the six trades
// they list to mean "every trade". A tile tagged for electrical AND plumbing
// AND HVAC is a general-purpose tool; the AHJ default is the honest notice.
const GENERAL_PURPOSE_TRADES = ["electrical", "plumbing", "hvac"];
function isFireGroundTile(tool) {
  if (tool.group === "F") return true;
  if (!tool.trades.includes(FIRE_GROUND_TRADE)) return false;
  return !GENERAL_PURPOSE_TRADES.every((t) => tool.trades.includes(t));
}

// Inline notices. One short line each: who governs the real decision.
// The static shells already carry this as a quiet footer line
// (build-shells.mjs shellFooter), so the live view matches that weight --
// the notice sits above the inputs but must never outrank the calculator.
const NOTICE_DEFAULT = "Math aid only. Local code, manufacturer specs, and the AHJ govern the work.";
const NOTICE_FIRE = "Math aid only. Department SOPs and incident command govern the fireground.";
const NOTICE_HISTORICAL = "Reference only. Prices change; ask your supplier for a current quote.";
const NOTICE_TAX_LAW = "Estimate only. Confirm with the current IRS publication or a CPA before filing.";
const NOTICE_LEGAL = "Legal information, not legal advice. Verify with current state code and an attorney.";
const NOTICE_LAB = "Check your lab's SOP before pipetting. A bad dilution ruins the run.";
const NOTICE_REAL_ESTATE = "Estimate only. The lender governs underwriting; the appraiser governs value.";
const NOTICE_EDUCATION = "Estimate only. The classroom teacher governs placement and assessment calls.";

// Leader-key shortcut targets.
const SHORTCUTS = {
  h: { type: "home" },
  s: { type: "focus", target: "#search-input" },
  u: { type: "route", id: "unit-converter" },
  o: { type: "route", id: "ohms-law" },
  w: { type: "route", id: "wire-ampacity" },
  v: { type: "route", id: "voltage-drop" },
  f: { type: "route", id: "friction-loss" },
  d: { type: "route", id: "duct-sizing" },
  r: { type: "route", id: "refrigerant-pt" },
  l: { type: "route", id: "lumber-spans" },
  c: { type: "route", id: "concrete" },
  t: { type: "route", id: "static-pressure-hvac" },
};

// State.
//
// The home view is a static hero (elevator pitch + one search combobox);
// there is no live-filtered grid, so the only state is the route.
const state = {
  route: { view: "home", id: null, params: {} },
};

// spec-v1341: which fields the reader's own words filled, for the one
// navigation that is about to happen.
//
// This is deliberately NOT read off the hash. A deep link someone was sent and
// a query someone just typed produce an identical hash, so reading provenance
// from the URL would make a shared link claim its recipient typed it. It lives
// in memory, is consumed by the very next renderToolView, and is cleared
// there whether it was used or not.
let pendingProvenance = null;

// The words the reader typed, for the one navigation that is about to happen.
let pendingQuery = null;

const PROVENANCE_TEXT = "from your question";

// Boot.
document.addEventListener("DOMContentLoaded", boot);

// A printed page has no disclosure to click, so expand the proof block
// before the print snapshot is taken. The @media print rules cover the
// browsers that print without firing this event.
window.addEventListener("beforeprint", () => {
  for (const d of document.querySelectorAll("details.proof")) d.open = true;
});

function boot() {
  bindSearch();
  bindShortcuts();
  bindBrand();
  window.addEventListener("hashchange", route);
  route();
  registerServiceWorker();
  verifyManifestIntegrity();
}

// The brand link in the header has `href="#"` so right-click + "Open in
// new tab" still works. The default click behavior (scroll to top, then
// route home via hashchange) is not what the user wants; intercept and
// route home directly.
function bindBrand() {
  const brand = document.querySelector(".brand");
  if (!brand) return;
  brand.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    navigateTo("");
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const proto = window.location.protocol;
  const host = window.location.hostname;
  const ok = proto === "https:" || host === "localhost" || host === "127.0.0.1";
  if (!ok) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// --- Routing ---

// Single routing entry for boot, hashchange, and navigateTo. A home /
// empty / legacy-bundle hash routes synchronously without the TOOLS list
// (the #tools view is static HTML). A tile hash lazy-loads TOOLS first,
// then parses and applies the route so renderToolView / updateHeadForTool
// have the registry available.
function route() {
  const hash = window.location.hash || "";
  const raw = hash.replace(/^#/, "");
  if (!raw || raw === "home" || raw.startsWith("b=")) {
    state.route = parseHashRoute(hash, EMPTY_IDS).route;
    applyRoute();
    return;
  }
  ensureTools().then(() => {
    state.route = parseHashRoute(hash, TOOLS.map((t) => t.id)).route;
    applyRoute();
  });
}

function applyRoute() {
  // A navigation dismisses the keyboard-shortcut modal. The overlay is a
  // role="dialog" aria-modal="true" with a focus trap; it must not persist
  // over a view it no longer matches. Every navigation path (G-leader
  // shortcut, hashchange/back-forward, navigateTo) funnels through here, so
  // this is the single point that covers them all. No-op when none is open.
  closeShortcutOverlay(false);
  const home = document.getElementById("tools");
  const view = document.getElementById("view-region");
  if (state.route.view === "tool") {
    home.hidden = true;
    view.hidden = false;
    renderToolView(state.route.id, state.route.params);
    updateHeadForTool(state.route.id);
  } else {
    home.hidden = false;
    view.hidden = true;
    clearChildren(view);
    updateHeadForHome();
  }
}

// spec-v13 §5.5: SPA sets <title>, meta description, and
// <link rel="canonical"> to match the per-tile shell at /tools/<id>/
// when a tile opens; reverts to home values on return.
const HOME_DESC = "Rough Logic";
const HOME_TITLE = "Rough Logic";
// Production origin for the canonical link. The SPA must emit an ABSOLUTE
// canonical (matching the prerendered /tools/<id>/ and /groups/<slug>/
// shells) or Lighthouse SEO flags it ("Is not an absolute URL"); a relative
// "/tools/<id>/" scored the home + SPA tile URLs at SEO 0.92.
const SITE_ORIGIN = "https://roughlogic.com";

function setHeadLink(rel, href) {
  let el = document.querySelector('link[rel="' + rel + '"]');
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}
function setHeadMeta(name, content) {
  let el = document.querySelector('meta[name="' + name + '"]');
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function updateHeadForTool(id) {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) return updateHeadForHome();
  document.title = tool.name + " - Rough Logic";
  setHeadMeta("description", tool.desc);
  setHeadLink("canonical", SITE_ORIGIN + "/tools/" + id + "/");
}
function updateHeadForHome() {
  document.title = HOME_TITLE;
  setHeadMeta("description", HOME_DESC);
  setHeadLink("canonical", SITE_ORIGIN + "/");
}

function navigateTo(hash) {
  if (window.location.hash !== "#" + hash) {
    window.history.replaceState(null, "", "#" + hash);
    route();
  }
}

// --- Tool view shell ---

// spec-v1338: hide the answer card until the tile actually has an answer.
//
// `:empty` in CSS is not enough. Most renderers build their output ROWS at
// mount and leave the value spans blank, so the region has children from the
// first paint -- ohms-law opens as "V: Copy  I: Copy  R: Copy  P: Copy". Below
// the inputs that was merely untidy; hoisted above them it is the first thing
// on the page. Since every tile now opens blank, this is the common case, not
// an edge one.
//
// A region whose structure this cannot read (no .out-value spans, no <dd>) is
// left visible. Hiding something we do not understand is worse than showing it.
function syncAnswerVisibility(outputRegion) {
  if (!outputRegion) return;
  // Rich output -- a schedule table, a list, a chart -- IS the answer for
  // tiles like loan-amortization and macrs-depreciation, and their summary
  // spans can stay empty while the table carries everything. Reading only the
  // value spans hid a fully populated region, which took the schedule table,
  // the CSV export button and Copy-all down with it.
  if (outputRegion.querySelector("table, ul, ol, canvas, svg, img")) {
    outputRegion.classList.remove("output-blank");
    return;
  }
  const cells = outputRegion.querySelectorAll(".out-value, dd");
  if (!cells.length) return;
  let hasValue = false;
  for (const cell of cells) {
    if (String(cell.textContent || "").trim() !== "") { hasValue = true; break; }
  }
  outputRegion.classList.toggle("output-blank", !hasValue);
}

// spec-v1341/v1342: the tile-side prefill, provenance captions and ask card
// live in tile-prefill.js, lazily imported. None of it is reachable from the
// home view, and app.js is loaded there against a hard 49 KB JS sub-budget
// (spec-v10 section H.2), so code that only runs on a tile does not belong in
// the file the home page pays for.
function applyQueryPrefill(region, id, params) {
  const pending = pendingQuery;
  pendingQuery = null;
  if (!pending || pending.id !== id || !region) return;
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) return;
  import("./tile-prefill.js").then((mod) => mod.applyQueryPrefill({
    region, tool, params: params || {}, query: pending.text, provenanceText: PROVENANCE_TEXT,
  })).catch(() => { /* prefill is an enhancement; the form is always there */ });
}

// A "Note" that reads the same for every set of inputs is not part of the
// answer -- it is reference prose that happens to come back alongside it.
// Left in the answer region it renders as a second disclosure, a median 565
// characters of explanation wedged between the number the reader came for and
// the one block that holds the formula and the sources. On 976 tiles.
//
// So move it into that block, right under the scope prose, and leave the
// answer region holding only the answer. The renderer keeps its reference to
// the span and keeps writing to it; only the span's place on the page changes.
//
// `run_calculator` still returns the note untouched. An agent reading a result
// has no disclosure to open, and the note is the only prose it gets.
//
// scripts/extract-constant-notes.mjs measures which tiles these are by running
// each compute twice on different inputs; the list is lazy-loaded, so a tile
// with no note row never pays for it.
function relocateConstantNote(id, outputRegion, proof, citation) {
  const row = outputRegion.querySelector("details.note-row");
  if (!row) return;
  // Never empty the answer region. A handful of tiles answer ONLY in prose,
  // and for those the note IS the result -- moving it would leave the reader
  // looking at a blank card and would trip the "example paints something"
  // gate. Those keep their note where it is.
  if (!outputRegion.querySelector(".out-value:not(.note-value)")) return;
  import("./constant-notes.js").then((mod) => {
    if (!mod.CONSTANT_NOTE_TILES.has(id) || !row.isConnected) return;
    const value = row.querySelector(".note-value");
    if (!value) return;
    const para = document.createElement("p");
    para.className = "view-detail view-detail-note";
    // Move the live element, do not copy its text: the renderer holds this
    // node and writes the note into it on every recompute.
    para.appendChild(value);
    row.remove();
    // Under the scope prose, above the formula -- prose first, then receipts.
    proof.insertBefore(para, citation);
  }).catch(() => { /* placement is cosmetic; never break a calculator for it */ });
}

function renderToolView(id, params) {
  const tool = TOOLS.find((t) => t.id === id);
  const view = document.getElementById("view-region");
  clearChildren(view);
  if (!tool) {
    const p = document.createElement("p");
    p.textContent = "Tool not found.";
    view.appendChild(p);
    return;
  }

  const headerRow = document.createElement("div");
  headerRow.className = "view-header-row";

  const back = document.createElement("a");
  back.className = "back-link";
  back.href = "#";
  back.textContent = "Back to tools";
  // Prevent the default browser scroll-to-top jump that `href="#"`
  // triggers before the hashchange handler routes home.
  back.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo("");
  });
  headerRow.appendChild(back);

  view.appendChild(headerRow);

  const h1 = document.createElement("h1");
  h1.className = "view-title";
  h1.textContent = tool.name;
  view.appendChild(h1);

  // Lead with the opening sentence only, the same one the static shell prints.
  // Descriptions run to 1,457 characters; rendering one whole above the fields
  // buries the calculator under prose the reader has not asked for yet. The
  // remainder goes below the answer, as `detail`.
  const lead = document.createElement("p");
  lead.className = "view-desc";
  lead.textContent = leadSentence(tool.desc);
  view.appendChild(lead);

  const notice = document.createElement("div");
  notice.className = "view-notice";
  notice.setAttribute("role", "note");
  // v5 Step 61 per-id overrides for Group H references that span trades.
  if (tool.id === "sales-tax-nexus") notice.textContent = NOTICE_LEGAL;
  else if (tool.id === "irs-form-index") notice.textContent = NOTICE_TAX_LAW;
  else if (tool.group === "Q") notice.textContent = NOTICE_HISTORICAL;
  else if (tool.group === "R") notice.textContent = NOTICE_TAX_LAW;
  else if (tool.group === "T") notice.textContent = NOTICE_LAB;
  else if (tool.group === "X") notice.textContent = NOTICE_REAL_ESTATE;
  else if (tool.group === "Y") notice.textContent = NOTICE_EDUCATION;
  else if (isFireGroundTile(tool)) notice.textContent = NOTICE_FIRE;
  else notice.textContent = NOTICE_DEFAULT;
  // Appended below the answer, not above the fields. It is standing boilerplate
  // -- what governs, not what to do -- and it reads the same on every tile.

  // The inline citation is written by every renderer. It is long-form
  // reference prose, so it lives inside the collapsed proof block below the
  // answer rather than above the inputs, where it used to push the
  // calculator off the first screen.
  const citation = document.createElement("p");
  citation.className = "citation";

  const inputRegion = document.createElement("section");
  inputRegion.className = "input-region";
  inputRegion.setAttribute("aria-label", "Inputs");

  const outputRegion = document.createElement("section");
  outputRegion.className = "output-region";
  outputRegion.setAttribute("aria-live", "polite");
  outputRegion.setAttribute("aria-label", "Output");

  // spec-v1348: one shared report control covers the whole catalog and every
  // future tile that enters through renderToolView. The reporting client and
  // Turnstile are loaded only after an intentional click, so normal calculator
  // use stays local, offline-capable, and free of reporting network work.
  const report = document.createElement("button");
  report.type = "button";
  report.className = "report-trigger";
  report.textContent = "Report a problem";
  report.addEventListener("click", () => {
    report.disabled = true;
    import("./report-feedback.js").then((mod) => {
      if (!report.isConnected) return;
      report.disabled = false;
      return mod.openReportDialog({ tool, inputRegion, outputRegion, trigger: report, host: view });
    }).catch(() => {
      if (!report.isConnected) return;
      report.disabled = false;
      report.textContent = "Reporting unavailable";
    });
  });
  headerRow.appendChild(report);

  // spec-v1338: the answer goes ABOVE the inputs.
  //
  // The order the reader needs is the reverse of the order the page is built
  // in. The number is what they came for; the inputs are what let them check
  // it in one glance, and that glance is the whole reason a card beats a chat
  // bubble. On a 16-field tile the answer used to be off the bottom of the
  // screen, and after spec-v1341 a reader arriving with their own values
  // already filled in landed on a form whose answer they had to scroll for.
  //
  // Appended in this order rather than moved afterwards, deliberately.
  // `.output-region` is aria-live, and relocating a POPULATED live region
  // re-announces its contents; at creation time it is empty, so there is
  // nothing to re-announce and no timing to get wrong. The `:empty` rule in
  // styles.css keeps it invisible until the tile actually has something to
  // say -- which, since every tile now opens blank, is the common case.
  view.appendChild(outputRegion);
  view.appendChild(inputRegion);

  view.appendChild(notice);

  // ONE collapsed block holds everything behind the answer: the scope prose
  // (everything after the tile's opening sentence -- caveats, limits, what the
  // calculator does not cover), the inline citation, the structured reference
  // rows, and the data-source stamp. Closed by default so the page reads as
  // question -> answer; one click shows the receipts.
  //
  // This used to be TWO adjacent disclosures -- "More about this calculator"
  // and the proof -- so the same reference material sat behind two clicks in
  // two places and the reader had to guess which one held their sentence.
  // Same treatment, same order, as the static shell.
  const proof = document.createElement("details");
  proof.className = "proof";
  const proofSummary = document.createElement("summary");
  proofSummary.textContent = "Details, formula, and sources";
  proof.appendChild(proofSummary);
  const detailText = restOfDescription(tool.desc);
  if (detailText) {
    const detailBody = document.createElement("p");
    detailBody.className = "view-detail";
    detailBody.textContent = detailText;
    proof.appendChild(detailBody);
  }
  proof.appendChild(citation);

  const sources = document.createElement("section");
  sources.className = "sources-region";
  sources.setAttribute("aria-label", "Sources");
  proof.appendChild(sources);
  view.appendChild(proof);

  // v6 §3 / §7: lazy-load the structured citation map. When the tile id has
  // a structured CITATIONS entry, mount the six-line reference block under
  // the sources region and add a "Copy answer with full reference block"
  // button that emits the §3 plain-text format. Tiles not yet audited
  // continue to render the legacy inline citation only.
  import("./citations.js").then((cit) => {
    const block = cit.renderCitationBlock(sources, id);
    if (block) {
      // The structured block states the formula, the edition, the free-access
      // pointer and what governs, in six labelled rows. The renderer's own
      // one-line `Citation: ...` says the same thing again, a few lines above
      // it, inside the same disclosure -- so voltage-drop printed its formula
      // twice, once as "V_drop = 2*K*I*D / cmils" and once as "VD = 2 * I * R
      // * L", and a reader had to work out that those are one equation.
      //
      // The comment below has always described the inline line as the
      // fallback for "tiles not yet audited"; showing BOTH was the gap
      // between that intent and the code. The static shell has never printed
      // it -- check-shells has passed for 1,709 pages without it -- so this
      // makes the live view agree with the page it mirrors.
      //
      // Hidden rather than removed: every renderer is handed this element and
      // writes into it, and `hidden` takes it out of the a11y tree and the
      // printed page while keeping that contract intact.
      citation.hidden = true;
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "view-copy-reference";
      copyBtn.textContent = "Copy answer with full reference block";
      copyBtn.addEventListener("click", async () => {
        try {
          const cb = await import("./clipboard.js");
          // Build the answer from the structured (label, value) rows -- the
          // same extraction the "Copy all" button uses -- NOT
          // outputRegion.textContent, which fuses each value with its per-line
          // "Copy" button label ("Needed final score: 88CopyMax / min ...").
          const answerSummary = cb.collectOutputs(outputRegion)
            .map((r) => r.label + ": " + r.value).join("\n");
          const text = cit.buildAnswerWithReference(tool.name, answerSummary, id);
          cb.copyText(text, copyBtn);
        } catch {
          // Fallback: leave the text on the page in a focusable element.
        }
      });
      block.appendChild(copyBtn);
    }
  }).catch(() => { /* citation block is opt-in per tile; missing map is fine */ });

  const ds = TOOL_DATA_SOURCES[id];

  // Lazy-load the calculator module + support libs.
  loadRenderer(id).then(async (renderer) => {
    if (!renderer) {
      const placeholder = document.createElement("p");
      placeholder.textContent = "This calculator is not available.";
      inputRegion.appendChild(placeholder);
      return;
    }
    const libs = await loadSupportLibs();
    // Crash-Safe Resume (v3 utility 187). Wrap each renderer body in a
    // try/catch boundary. On uncaught error, log the tool id + input
    // snapshot and render a small recovery panel without clearing the URL
    // hash so the user can reload or paste the URL into a new tab.
    try {
      renderer(inputRegion, outputRegion, citation, params || {});
      relocateConstantNote(id, outputRegion, proof, citation);
      libs.applyHashState(inputRegion, params || {});
      libs.wireHashState(inputRegion, id);
      // spec-v1341: caption the fields the reader's own words filled. Consumed
      // once, and cleared whether or not it was used, so the next navigation
      // starts clean.
      applyQueryPrefill(inputRegion, id, params || {});
      // spec-v1338: the answer sits above the inputs now, so it must not show
      // a column of empty labels before anything is typed. Renderers compute
      // on a debounce, so re-check after their timer rather than inline.
      syncAnswerVisibility(outputRegion);
      // Watch the OUTPUT, not the input events. "Test with example" fills the
      // fields through the renderer's own update path without necessarily
      // dispatching an input event the region would hear, so listening on the
      // inputs left a populated answer hidden -- which is how this hid the
      // loan-amortization schedule, its CSV export button, and Copy-all.
      // A MutationObserver sees the answer change however it was produced.
      try {
        const watcher = new MutationObserver(() => syncAnswerVisibility(outputRegion));
        watcher.observe(outputRegion, { childList: true, subtree: true, characterData: true });
      } catch { /* visibility is cosmetic; never block the calculator for it */ }
      if (params && params.example === "1") {
        const exBtn = inputRegion.querySelector("button");
        if (exBtn && /example/i.test(exBtn.textContent || "")) exBtn.click();
      }
      if (ds) libs.stampDataSource(sources, ds);
      libs.addCopyAllButton(outputRegion, { title: tool.name });
      libs.wireValidity(inputRegion, outputRegion);
    } catch (err) {
      console.error("[crash-safe] calculator threw", { tool: id, params, error: err });
      mountCrashPanel(view, id);
    }
  }).catch((err) => {
    const placeholder = document.createElement("p");
    placeholder.textContent = "Failed to load calculator: " + (err && err.message ? err.message : "unknown error");
    inputRegion.appendChild(placeholder);
  });

  // Apply any preloaded params (visible to calculator implementations later).
  view.dataset.params = JSON.stringify(params || {});

  // Move focus for screen reader and keyboard users.
  h1.tabIndex = -1;
  h1.focus({ preventScroll: false });
}

// --- Home search (combobox) ---
//
// One search bar. Type free text to filter the catalog, or focus the empty
// field to browse every tool. Matches render in a results dropdown that
// routes to the tile on click / Enter / arrow-select. Industry-term and
// question aliases (the per-group data/search/aliases-<letter>.json shards,
// spec-v590 split) lazy-load on first focus so a free-text term resolves to
// its target tile; the SW pre-caches the shards so the fetch is local after
// first install.

function bindSearch() {
  const input = document.getElementById("search-input");
  const list = document.getElementById("search-results");
  if (!input || !list) return;

  // The TOOLS registry is lazy-loaded; these indexes are built on first
  // interaction (focus / keystroke), behind ensureTools(), so the bare
  // home view never pulls tools-data.js.
  let nameToId = new Map();
  let ALL = [];
  let searchReady = false;
  function initSearchData() {
    if (searchReady) return;
    nameToId = new Map(TOOLS.map((t) => [t.name.toLowerCase(), t.id]));
    ALL = TOOLS.slice().sort((a, b) => a.name.localeCompare(b.name));
    searchReady = true;
  }
  let matches = [];
  let activeIndex = -1;
  // spec-v1343: did the READER choose this row, or did the list merely
  // highlight the first one for them? render() calls setActive(0), so
  // activeIndex is 0 the moment anything is typed and every Enter looks like a
  // deliberate pick. Without this flag the ambiguity check below never runs and
  // the whole feature ships silently dead -- which is exactly what happened on
  // sophiewell before its own v756 was debugged.
  let userPicked = false;

  // Alias terms map a free-text phrase to a tile id; loaded lazily.
  // Row shape matches the shard ({ term, target }) so the rows feed
  // rankTools directly. Reassigned (not mutated) on load so the ranker's
  // per-array caches never go stale. The corpus is split per tile group
  // (data/search/aliases-<letter>.json, spec-v590 remediation, generated
  // by scripts/build-alias-shards.mjs); all group shards fetch in
  // parallel and each folds in as it arrives, so alias search becomes
  // usable progressively instead of waiting on one monolithic shard.
  let aliasRows = [];
  let aliasLoaded = false;
  async function ensureAliases() {
    if (aliasLoaded) return;
    aliasLoaded = true;
    const merged = [];
    const groups = [...new Set(TOOLS.map((t) => t.group))];
    await Promise.all(groups.map(async (g) => {
      try {
        const r = await fetch("data/search/aliases-" + String(g).toLowerCase() + ".json", { credentials: "omit" });
        if (!r.ok) return;
        const json = await r.json();
        if (!json || !Array.isArray(json.aliases)) return;
        const rows = [];
        for (const row of json.aliases) {
          if (!row || typeof row.term !== "string" || typeof row.target !== "string") continue;
          if (!nameToId.has(row.target) && !TOOLS.some((t) => t.id === row.target)) continue;
          rows.push({ term: row.term.toLowerCase(), target: row.target });
        }
        merged.push(...rows);
        aliasRows = merged.slice();
        // Refresh the open dropdown so just-loaded aliases become searchable.
        if (document.activeElement === input) render(input.value);
      } catch { /* one group failing leaves the rest searchable */ }
    }));
    // A transient failure must not cost the session its aliases. Without them
    // the ranking is visibly worse -- "asphalt tonnage 2400 sq ft" leads with a
    // carpet takeoff -- and the only recovery was a full reload, because
    // `aliasLoaded` was already latched. `ensureDiscovery` has always released
    // its flag on failure so the next keystroke retries; this does the same
    // when NOTHING loaded. Partial success keeps what arrived rather than
    // re-fetching every group on each keystroke.
    if (!aliasRows.length) aliasLoaded = false;
  }

  // The spec-v589 pure ranking layer (normalizeQuery / rankTools) loads
  // lazily alongside ensureTools so the bare home view never pulls it.
  let discovery = null;
  let discoveryLoading = false;
  function ensureDiscovery() {
    if (discovery || discoveryLoading) return;
    discoveryLoading = true;
    import("./search-discovery.js").then((mod) => {
      discovery = mod;
      if (document.activeElement === input) render(input.value);
    }).catch(() => { discoveryLoading = false; });
  }

  // spec-v591 slot tables: tile id -> { slots: [{ param, units }] }.
  // Lazy-loaded with the aliases on first search interaction; failure is
  // a no-op (picks navigate to the bare tile hash, exactly as before).
  let slotsByTile = null;
  let slotsLoading = false;
  function ensureSlots() {
    if (slotsByTile || slotsLoading) return;
    slotsLoading = true;
    fetch("data/search/slots.json", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json || !Array.isArray(json.tiles)) return;
        slotsByTile = new Map();
        for (const row of json.tiles) {
          if (row && typeof row.tile === "string" && Array.isArray(row.slots)) {
            slotsByTile.set(row.tile, row);
          }
        }
        // Landing late must not cost the reader the feature. schedulePreview()
        // needs discovery AND slots AND the preview map, and it bails silently
        // when one is missing, so a dependency that arrives after the last
        // render leaves the dropdown permanently without its answer -- nothing
        // re-runs until the next keystroke, and a reader who has finished
        // typing never sends one. ensureDiscovery() has always re-rendered for
        // exactly this reason; slots and the preview map now do the same.
        if (document.activeElement === input) render(input.value);
      })
      // Release the latch so the next keystroke retries, as ensureDiscovery
      // does; a blip on the first search otherwise disables prefill until reload.
      .catch(() => { slotsLoading = false; });
  }

  // Prefill hash for a picked tile: numbers-with-units in the typed query
  // map onto the tile's hash-state params (spec-v591). Keys come only
  // from the static shard; values are parser-canonical decimal strings.
  function prefillHash(tool, typed) {
    if (!discovery || !slotsByTile || !typed) return tool.id;
    const row = slotsByTile.get(tool.id);
    if (!row) return tool.id;
    const params = discovery.mapSlots(discovery.extractQuantities(typed), row);
    if (!params) return tool.id;
    return tool.id + "?v=1&" + new URLSearchParams(params).toString();
  }


  // spec-v592 live answer preview. The map is a lazy shard; the compute
  // is the same lazily-imported module export the tile itself calls. Any
  // failure renders nothing: the preview only ever adds to a result row.
  let previewMap = null;
  let previewLoading = false;
  function ensurePreview() {
    if (previewMap || previewLoading) return;
    previewLoading = true;
    fetch("data/search/preview-map.json", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json || !json.tiles) return;
        previewMap = json.tiles;
        // Same late-arrival re-render as ensureSlots(); see the note there.
        if (document.activeElement === input) render(input.value);
      })
      // Same latch release: a blip otherwise costs the session its answer
      // previews entirely, with no retry but a reload.
      .catch(() => { previewLoading = false; });
  }
  let previewTimer = 0;
  let previewSeq = 0;
  function schedulePreview(topTool, typed, rowEl) {
    if (!previewMap || !discovery || !slotsByTile) return;
    const entry = previewMap[topTool.id];
    const slotRow = slotsByTile.get(topTool.id);
    if (!entry || !slotRow) return;
    const mapped = discovery.mapSlots(discovery.extractQuantities(typed), slotRow);
    if (!mapped) return;
    const seq = ++previewSeq;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      import(entry.module).then((mod) => {
        if (seq !== previewSeq || !rowEl.isConnected) return;
        const fn = mod[entry.fn];
        if (typeof fn !== "function") return;
        const args = { ...entry.defaults };
        for (const [param, argName] of Object.entries(entry.args)) {
          if (param in mapped) args[argName] = Number(mapped[param]);
        }
        let result;
        try { result = fn(args); } catch { return; }
        if (!result || typeof result !== "object" || result.error) return;
        const parts = [];
        for (const h of entry.headline) {
          const v = Number(result[h.key]);
          if (!Number.isFinite(v)) return;
          parts.push(h.label + " " + v.toFixed(h.decimals) + (h.unit ? " " + h.unit : ""));
        }
        const span = document.createElement("span");
        span.className = "sr-preview";
        span.textContent = parts.join(" / ");
        rowEl.appendChild(span);
      }).catch(() => { /* preview only ever adds */ });
    }, 150);
  }

  // Rank tiles for a query. Preferred path (spec-v589): stopword-stripped
  // token ranking via search-discovery.js rankTools. Fallback (module not
  // yet loaded, or the query normalizes to nothing, e.g. a bare "how"):
  // the original substring pass over name, then description, then alias
  // terms. Empty query lists the catalog A-Z.
  // Ranked-result metadata for the most recent searchTools call that went
  // through rankTools; null when the substring fallback answered. Feeds
  // the spec-v592 did-you-mean row and the answer preview.
  let lastRanked = null;
  function searchTools(query) {
    if (!searchReady) return [];
    lastRanked = null;
    const q = (query || "").trim().toLowerCase();
    if (!q) return ALL;
    if (discovery) {
      const { tokens } = discovery.normalizeQuery(q);
      if (tokens.length) {
        const ranked = discovery.rankTools(tokens, TOOLS, aliasRows, { limit: 12 });
        if (ranked.length) {
          lastRanked = { rows: ranked, tokens };
          return ranked.map((r) => r.tool);
        }
      }
    }
    const seen = new Set();
    const out = [];
    const add = (t) => { if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); } };
    const named = ALL.filter((t) => t.name.toLowerCase().includes(q));
    named.sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return ap - bp || a.name.localeCompare(b.name);
    });
    named.forEach(add);
    ALL.filter((t) => t.desc.toLowerCase().includes(q)).forEach(add);
    for (const al of aliasRows) {
      if (al.term.includes(q)) add(TOOLS.find((t) => t.id === al.target));
    }
    return out.slice(0, 12);
  }

  function setExpanded(open) {
    input.setAttribute("aria-expanded", open ? "true" : "false");
    list.hidden = !open;
  }

  function setActive(idx) {
    const items = list.querySelectorAll(".search-result");
    items.forEach((node, i) => {
      const on = i === idx;
      node.classList.toggle("is-active", on);
      node.setAttribute("aria-selected", on ? "true" : "false");
      if (on) { input.setAttribute("aria-activedescendant", node.id); node.scrollIntoView({ block: "nearest" }); }
    });
    if (idx === -1) input.removeAttribute("aria-activedescendant");
    activeIndex = idx;
  }

  function pick(tool) {
    if (!tool) return;
    const typed = input.value;
    input.value = "";
    matches = [];
    clearChildren(list);
    setExpanded(false);
    setActive(-1);
    input.blur();
    // spec-v1341: the generic fill runs AFTER the tile renders, against the
    // live DOM -- see applyQueryPrefill. The hand-written slot template still
    // builds the hash where it fires, because it carries unit spellings
    // verified against the tile's own renderer.
    pendingQuery = typed ? { id: tool.id, group: tool.group, text: typed } : null;
    navigateTo(prefillHash(tool, typed));
  }

  // spec-v1343: is the ranker's top pick actually a pick?
  //
  // Measured over 36 realistic probes, 17 come back with the runner-up scoring
  // at least 95% of the leader -- "pressure drop", "heat loss", "payment",
  // "grounding". Those are not variants of one calculator; they answer
  // different questions. A query carrying VALUES almost always separates
  // cleanly, so this fires on the vague ones and stays out of the way of the
  // specific ones, which is the right split.
  //
  // Runs on Enter only. A second ranking pass per keystroke would be wasted
  // work for a decision only Enter makes.
  const AMBIGUITY_RATIO = 0.95;
  function ambiguousMatches() {
    if (!lastRanked || !Array.isArray(lastRanked.rows) || lastRanked.rows.length < 2) return null;
    const rows = lastRanked.rows;
    const leader = rows[0].score;
    if (!leader) return null;
    // A curated alias is a deliberate routing decision, not a coincidence of
    // token scores. If one fired, respect it.
    const typed = (input.value || "").trim().toLowerCase();
    if (aliasRows.some((a) => a.term === typed)) return null;
    // A slots.json template fired means the query was specific enough to
    // prefill; that is not ambiguity either.
    if (slotsByTile && slotsByTile.has(rows[0].tool.id) && discovery
        && discovery.mapSlots(discovery.extractQuantities(input.value), slotsByTile.get(rows[0].tool.id))) return null;
    const close = rows.filter((r) => r.score / leader >= AMBIGUITY_RATIO);
    if (close.length < 2) return null;
    // Two where the top pair separates from the rest; three at the outside.
    return close.slice(0, 3).map((r) => r.tool);
  }

  function clearPickCard() {
    for (const el of document.querySelectorAll(".pick-card")) el.remove();
  }

  // The card itself is a lazy import: the home view carries a hard 49 KB JS
  // sub-budget and this only matters once someone has searched.
  function renderPickCard(tools, typed) {
    setExpanded(false);
    import("./pick-card.js").then((mod) => {
      mod.renderPickCard({
        tools,
        host: document.getElementById("tools"),
        lead: leadSentence,
        onPick: (tool) => { input.value = typed; pick(tool); },
      });
    }).catch(() => {
      // The card is an enhancement. Fall back to routing at the top match,
      // which is what happened before this spec existed.
      if (tools[0]) pick(tools[0]);
    });
  }

  // A new search replaces any open question.
  input.addEventListener("input", clearPickCard);

  // spec-v1337: the example chips. Each sets the box and runs the SAME code
  // path as typing -- no new routing logic -- so what a reader sees
  // demonstrated is exactly what their own typing does.
  for (const chip of document.querySelectorAll(".hero-chip")) {
    chip.addEventListener("click", () => {
      const q = chip.getAttribute("data-q") || chip.textContent.trim();
      input.value = q;
      input.focus();
      loadAndRender();
    });
  }

  function render(query) {
    clearChildren(list);
    matches = searchTools(query);
    if (matches.length === 0) {
      const empty = document.createElement("li");
      empty.className = "search-empty";
      empty.setAttribute("role", "presentation");
      empty.textContent = "No match yet. Try a trade, a unit, or a tool name (e.g. \"voltage drop\", \"duct\", \"mileage\").";
      list.appendChild(empty);
      // spec-v592 no-match fallback: a dead end becomes a fork in the road.
      // It used to route home and scroll to the browse-by-trade strip under
      // the hero; that strip is gone, so the fork is now the catalog page the
      // footer points at -- a real navigation, not a scroll, and the same
      // destination from every page on the site.
      const browse = document.createElement("li");
      browse.className = "search-empty search-browse";
      browse.setAttribute("role", "presentation");
      const link = document.createElement("a");
      link.href = "tools/";
      link.textContent = "Browse all " + GROUPS.length + " trades";
      browse.appendChild(link);
      list.appendChild(browse);
      setExpanded(true);
      setActive(-1);
      return;
    }
    // spec-v592 did-you-mean: when the top match needed the typo pass,
    // say what the results actually match so the vocabulary is learned.
    // (Top-result, not all-results: a generic token like "fill" always
    // matches some tile exactly, so an every-match condition never fires.)
    if (lastRanked && lastRanked.rows[0].viaTypo) {
      const fixes = lastRanked.rows[0].typoFixes || {};
      const corrected = lastRanked.tokens.map((t) => fixes[t] || t).join(" ");
      const note = document.createElement("li");
      note.className = "search-empty search-didyoumean";
      note.setAttribute("role", "presentation");
      note.textContent = "showing matches for \"" + corrected + "\"";
      list.appendChild(note);
    }
    matches.forEach((tool, i) => {
      const item = document.createElement("li");
      item.className = "search-result";
      item.setAttribute("role", "option");
      item.id = "search-result-" + i;
      item.setAttribute("aria-selected", "false");
      const name = document.createElement("span");
      name.className = "sr-name";
      name.textContent = tool.name;
      const group = document.createElement("span");
      group.className = "sr-group";
      group.textContent = GROUP_NAMES[tool.group] || tool.group;
      item.appendChild(name);
      item.appendChild(group);
      // mousedown so the route fires before the input-blur close handler.
      item.addEventListener("mousedown", (e) => { e.preventDefault(); pick(tool); });
      item.addEventListener("mouseenter", () => { userPicked = true; setActive(i); });
      list.appendChild(item);
      // spec-v592: computed answer preview on the top-ranked row when the
      // typed numbers map onto the tile's slots.
      if (i === 0 && lastRanked) schedulePreview(tool, query, item);
    });
    setExpanded(true);
    userPicked = false;
    setActive(0);
  }

  function loadAndRender() {
    ensureDiscovery();
    ensureSlots();
    ensurePreview();
    ensureTools().then(() => { initSearchData(); ensureAliases(); render(input.value); });
  }
  input.addEventListener("focus", loadAndRender);
  input.addEventListener("input", loadAndRender);

  // spec-v592 placeholder rotation: one example QUESTION per day of month
  // (deterministic, no timers, nothing for prefers-reduced-motion to
  // object to). The shipped index.html placeholder is the static
  // fallback; the .hero-label accessible name is unchanged.
  // spec-v1337: every rotation carries NUMBERS. Since spec-v1341 the box does
  // something with them -- it fills the calculator in -- so a placeholder
  // without values teaches half the feature.
  //
  // Every entry must also FIT THE BOX AT 320 px, which the longer questions
  // did not: six of the previous eight clipped at 375 px and all eight clipped
  // at 320 px, so the first thing a phone reader saw was a sentence chopped
  // mid-word ("what gauge wire for a 30 ar"). The four example chips below the
  // box carry the long, conversational forms -- they wrap -- and the
  // placeholder carries a short one that fits on one line.
  //
  // Each entry is verified four ways: it fits the box at 320 px on both
  // Chromium and WebKit (a gate measures it -- the widest entry is 181 px in
  // a 228 px box, and the margin is not slack: CI's Linux fallback font runs
  // ~15% wider than macOS system-ui and clipped three of these before the box
  // was given the room), the ranker puts the intended calculator first,
  // query-fill recovers real values from it, and what the tile then
  // shows is either an answer or a question -- never a number resting on a
  // dropdown the question never spoke to. That last one ruled out two
  // otherwise-good examples: `hose 150 gpm 200 ft` answers 108 psi off
  // whichever hose diameter sits first in the list, and a voltage drop with no
  // gauge in it answers off 18 AWG. Both now name the size. Two of the eight
  // entries this replaces recovered no values at all and one matched no
  // calculator.
  const QUESTION_PLACEHOLDERS = [
    "ohms law 120v 10a",              // answers outright: 12 ohms, 1200 W
    "volt drop 12awg 150ft",          // fills 3, then asks for the current
    "asphalt 2400 sq ft 3 in",        // fills 2, then asks for the mix density
    "wire 50a 120 ft copper",         // two calculators fit: it offers both
    "friction loss 150 gpm",          // fills 1, then asks for pipe and method
    "pipe volume 1 in 100 ft",        // answers outright: 4.49 gal
  ];
  input.placeholder = QUESTION_PLACEHOLDERS[(new Date().getDate() - 1) % QUESTION_PLACEHOLDERS.length];

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      if (!matches.length) return;
      userPicked = true;
      setActive((activeIndex + 1) % matches.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      if (!matches.length) return;
      userPicked = true;
      setActive((activeIndex - 1 + matches.length) % matches.length);
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (userPicked && activeIndex >= 0 && matches[activeIndex]) { e.preventDefault(); pick(matches[activeIndex]); return; }
      // spec-v1343: the reader did not choose a row -- they just pressed
      // Enter. If the ranker cannot separate its top two, say so instead of
      // guessing: "pressure drop" is compressed-air and filter, "heat loss" is
      // duct and pipe, and picking wrong on a job is not a small error.
      const ambiguous = ambiguousMatches();
      if (ambiguous) { e.preventDefault(); renderPickCard(ambiguous, input.value); return; }
      if (activeIndex >= 0 && matches[activeIndex]) { e.preventDefault(); pick(matches[activeIndex]); return; }
      if (matches[0]) { e.preventDefault(); pick(matches[0]); return; }
      // No rendered matches: fall back to an exact tool-name match (once
      // the lazy registry has loaded; ensureTools fires on focus).
      if (searchReady) {
        const id = nameToId.get((input.value || "").trim().toLowerCase());
        if (id) { e.preventDefault(); pick(TOOLS.find((t) => t.id === id)); }
      }
    } else if (e.key === "Escape") {
      if (input.value || !list.hidden) {
        input.value = "";
        matches = [];
        clearChildren(list);
        setExpanded(false);
        setActive(-1);
        e.preventDefault();
      }
    }
  });

  // Close the dropdown when a click lands outside the search.
  document.addEventListener("click", (e) => {
    if (e.target === input || list.contains(e.target)) return;
    // spec-v1337: a chip is part of the search UI, not a click outside it.
    // Without this the chip fills the box and instantly closes the results it
    // has just opened -- the exact bug sophiewell's v751 hit.
    if (e.target.closest && e.target.closest(".hero-chip")) return;
    setExpanded(false);
    setActive(-1);
  });
}

// Full-catalog picker. Fills the home-view <select> with one <optgroup> per
// trade (GROUP_NAMES order) and routes to the chosen tile on `change`,
// mirroring the hero search's navigateTo routing. The browse-by-list
// companion to free-text search.
// --- Keyboard: leader-key shortcuts ---

function bindShortcuts() {
  let leaderArmed = false;
  let leaderTimer = 0;

  document.addEventListener("keydown", (e) => {
    // ? overlay.
    if (e.key === "?" && !isTextInputTarget(e.target)) {
      e.preventDefault();
      toggleShortcutOverlay();
      return;
    }
    // Esc closes overlay or returns home.
    if (e.key === "Escape") {
      const overlay = document.getElementById("shortcut-overlay");
      if (overlay) {
        e.preventDefault();
        closeShortcutOverlay();
        return;
      }
    }
    if (isTextInputTarget(e.target)) return;

    // Leader key: G, then a single letter within 1.5 seconds.
    if (!leaderArmed && (e.key === "g" || e.key === "G")) {
      leaderArmed = true;
      window.clearTimeout(leaderTimer);
      leaderTimer = window.setTimeout(() => { leaderArmed = false; }, 1500);
      return;
    }
    if (leaderArmed) {
      leaderArmed = false;
      window.clearTimeout(leaderTimer);
      const k = e.key.toLowerCase();
      const action = SHORTCUTS[k];
      if (!action) return;
      e.preventDefault();
      runShortcut(action);
    }
  });
}

function runShortcut(action) {
  if (action.type === "home") {
    navigateTo("");
  } else if (action.type === "route") {
    navigateTo(action.id);
  } else if (action.type === "focus") {
    const el = document.querySelector(action.target);
    if (el) el.focus();
  }
}

// The element focus came from when the overlay opened, restored on close.
let shortcutTrigger = null;

function toggleShortcutOverlay() {
  const existing = document.getElementById("shortcut-overlay");
  if (existing) {
    closeShortcutOverlay();
    return;
  }
  // Remember what had focus so it can be restored on close (WCAG 2.4.3).
  shortcutTrigger = document.activeElement;
  const overlay = document.createElement("div");
  overlay.id = "shortcut-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Keyboard shortcuts");
  // Focus trap: a modal dialog must keep Tab within itself (ARIA APG); the
  // previous overlay let Tab fall through to the page behind it.
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const focusables = overlay.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  // Scrim is a theme-neutral dim; the panel carries the theme colors so the
  // overlay is legible in both dark (default) and light. The prior inline
  // light-only colors (white bg, no text color) rendered white-on-white and
  // unreadable in the dark theme.
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);padding:24px;overflow:auto;z-index:50;";

  const inner = document.createElement("div");
  inner.style.cssText = "max-width:640px;margin:0 auto;background:var(--bg-secondary);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:24px;";
  const h = document.createElement("h2");
  h.textContent = "Keyboard shortcuts";
  inner.appendChild(h);

  const list = document.createElement("ul");
  const entries = [
    ["G H", "Home"],
    ["G S", "Search"],
    ["G U", "Unit Converter"],
    ["G O", "Ohm's Law"],
    ["G W", "Wire Ampacity"],
    ["G V", "Voltage Drop"],
    ["G F", "Friction Loss"],
    ["G D", "Duct Sizing"],
    ["G R", "Refrigerant P-T"],
    ["G L", "Lumber Spans"],
    ["G C", "Concrete Volume"],
    ["G T", "Static Pressure"],
    ["?", "Toggle this overlay"],
    ["Esc", "Close overlay"],
  ];
  for (const [k, v] of entries) {
    const li = document.createElement("li");
    const code = document.createElement("code");
    code.textContent = k;
    li.appendChild(code);
    li.appendChild(document.createTextNode("  " + v));
    list.appendChild(li);
  }
  inner.appendChild(list);

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close";
  close.addEventListener("click", closeShortcutOverlay);
  inner.appendChild(close);

  overlay.appendChild(inner);
  document.body.appendChild(overlay);
  close.focus();
}

function closeShortcutOverlay(restoreFocus = true) {
  const overlay = document.getElementById("shortcut-overlay");
  if (overlay) overlay.remove();
  // Restore focus to whatever opened the overlay (WCAG 2.4.3 Focus Order);
  // the previous version dropped focus to <body> on close. A close caused by
  // a navigation (a G-leader shortcut or back/forward, via applyRoute) passes
  // restoreFocus=false: the pre-overlay element belongs to the view we just
  // left, so the new view should receive focus naturally instead.
  if (restoreFocus && shortcutTrigger && typeof shortcutTrigger.focus === "function") {
    shortcutTrigger.focus();
  }
  shortcutTrigger = null;
}

function isTextInputTarget(el) {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

// --- Helpers ---

function clearChildren(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild);
}

// ============================================================
// v3 utility 187: Crash-Safe Resume.
// Renders a small recovery panel after a renderer throws. Does NOT
// clear the URL hash so the user can reload or paste the URL into a
// new tab to recover state.
// ============================================================
function mountCrashPanel(view, toolId) {
  const panel = document.createElement("div");
  panel.className = "inline-notice crash-panel";
  panel.setAttribute("role", "alert");
  const h = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = "This calculator crashed.";
  h.appendChild(strong);
  panel.appendChild(h);
  const body = document.createElement("p");
  body.textContent = "Reload to retry, or paste your URL into a new tab to recover state. The URL is preserved.";
  panel.appendChild(body);
  // Insert near the top of the view, just above the inputs.
  const inputs = view.querySelector(".input-region");
  if (inputs) view.insertBefore(panel, inputs);
  else view.appendChild(panel);
}
