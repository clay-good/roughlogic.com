// Group Q: Historical Reference Data (utility 233 - Historical Pricing Context).
// See spec-v4.md section 2.8 / Step 56.
//
// Deterministic reference: bundled monthly history per commodity from public
// BLS PPI / EIA / USDA NASS / FRED series. No runtime fetch of upstream data.
// Each commodity is a same-origin static JSON shard that lazy-loads when the
// user picks the commodity. Percentile bands (p25 / p50 / p75 / p90) over the
// user-selected lookback window let the user see whether a current quote is
// high, low, or normal relative to recent history.
//
// Strict no-alerts, no-subscriptions. Source and series ID are stamped on
// every datapoint via the bundled shard.

import { DEBOUNCE_MS, debounce, makeSelect, makeNumber, fmt } from "./ui-fields.js";

// Catalog of bundled commodity series. The `file` is the same-origin shard
// under data/historical/commodities/. Each entry repeats the federal series
// ID and citing agency so the citation line on the tool view names them
// without depending on the shard fetch completing first.
export const COMMODITIES = [
  { id: "copper",         label: "Copper",                     agency: "BLS PPI",  series_id: "WPU10250115", units: "Index 1982=100",   file: "copper.json" },
  { id: "aluminum",       label: "Aluminum",                   agency: "BLS PPI",  series_id: "WPU102301",   units: "Index 1982=100",   file: "aluminum.json" },
  { id: "structural-steel", label: "Structural steel",         agency: "BLS PPI",  series_id: "WPU101707",   units: "Index 1982=100",   file: "structural-steel.json" },
  { id: "rebar",          label: "Rebar (concrete reinforcing)", agency: "BLS PPI", series_id: "WPU101706",   units: "Index 1982=100",   file: "rebar.json" },
  { id: "framing-lumber", label: "Framing lumber",             agency: "BLS PPI",  series_id: "WPU081",      units: "Index 1982=100",   file: "framing-lumber.json" },
  { id: "osb",            label: "OSB / structural panels",    agency: "BLS PPI",  series_id: "WPU0832",     units: "Index 1982=100",   file: "osb.json" },
  { id: "drywall",        label: "Drywall (gypsum products)",  agency: "BLS PPI",  series_id: "WPU1322",     units: "Index 1982=100",   file: "drywall.json" },
  { id: "asphalt",        label: "Asphalt paving / roofing",   agency: "BLS PPI",  series_id: "WPU0581",     units: "Index 1982=100",   file: "asphalt.json" },
  { id: "diesel",         label: "Diesel #2 (retail)",         agency: "EIA",      series_id: "PET.EMD_EPD2D_PTE_NUS_DPG.M", units: "USD/gal", file: "diesel.json" },
  { id: "gasoline",       label: "Gasoline E10 (retail)",      agency: "EIA",      series_id: "PET.EMM_EPMR_PTE_NUS_DPG.M",  units: "USD/gal", file: "gasoline.json" },
  { id: "natural-gas",    label: "Natural gas (city gate)",    agency: "EIA",      series_id: "NG.N3050US3.M", units: "USD/Mcf",       file: "natural-gas.json" },
  { id: "wheat",          label: "Wheat",                      agency: "USDA NASS",series_id: "PWHEAMTUSDM",units: "USD/bushel",      file: "wheat.json" },
  { id: "corn",           label: "Corn",                       agency: "USDA NASS",series_id: "PMAIZMTUSDM",units: "USD/bushel",      file: "corn.json" },
  { id: "soybeans",       label: "Soybeans",                   agency: "USDA NASS",series_id: "PSOYBUSDM",  units: "USD/bushel",      file: "soybeans.json" },
];

const COMMODITY_BY_ID = Object.fromEntries(COMMODITIES.map((c) => [c.id, c]));

// Quantile by linear interpolation between order statistics. p in [0, 1].
// Returns null for empty input.
// dims: in { values: dimensionless, p: dimensionless } out: q: dimensionless
//   (generic statistical primitive; the unit of `values` is inherited from
//    the caller's data shard - dollars, dollars-per-pound, gallons, etc.
//    The annotation is conservative per spec-v14 §7.1 for caller-typed
//    array inputs.)
export function quantile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (!(p >= 0 && p <= 1)) return null;
  const sorted = values.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

// Compute percentile bands and recent-quote placement over the trailing
// `lookback_months` window of monthly points. `points` shape: [{date, value}].
//
// Returns { window: [...], p25, p50, p75, p90, latest, latest_date,
// placement } where `placement` is one of "low", "normal", "elevated", "high"
// based on which band the latest value falls into.
// dims: in { points: dimensionless, lookback_months: dimensionless }
//        out: { p25: dimensionless, p50: dimensionless, p75: dimensionless, p90: dimensionless, latest: dimensionless, points_in_window: dimensionless }
export function computePercentileBands({ points = [], lookback_months = 12 } = {}) {
  if (!Array.isArray(points) || points.length === 0) return { error: "No data points provided." };
  if (!(lookback_months >= 2)) return { error: "Lookback must be at least 2 months." };
  const sorted = points.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const window = sorted.slice(-lookback_months);
  if (window.length < 2) return { error: "Window has too few points; widen the lookback." };
  const values = window.map((p) => Number(p.value)).filter((x) => Number.isFinite(x));
  const p25 = quantile(values, 0.25);
  const p50 = quantile(values, 0.50);
  const p75 = quantile(values, 0.75);
  const p90 = quantile(values, 0.90);
  const latest = window[window.length - 1];
  const v = Number(latest.value);
  // DR-25 (D-1/C-1): the quantile set is filtered to finite values, but the
  // latest point is not re-checked. A malformed final value makes v = NaN, so
  // every v <= pXX is false and placement silently becomes "high" with
  // latest: NaN. Reject a non-finite latest instead of mislabeling it.
  if (!Number.isFinite(v)) return { error: "Latest data point is non-numeric." };
  let placement;
  if (v <= p25) placement = "low";
  else if (v <= p50) placement = "normal-low";
  else if (v <= p75) placement = "normal-high";
  else if (v <= p90) placement = "elevated";
  else placement = "high";
  return {
    window, points_in_window: window.length, p25, p50, p75, p90,
    latest: v, latest_date: latest.date, placement,
  };
}

// Convenience for tests: drive the pipeline end-to-end using a bundled-shape
// shard. Returns the same fields plus the commodity catalog entry.
// dims: in { commodity: dimensionless, lookback_months: dimensionless, shard: dimensionless }
//        out: { p25: dimensionless, p50: dimensionless, p75: dimensionless, p90: dimensionless, latest: dimensionless }
export function computeHistorical({ commodity, lookback_months = 12, shard }) {
  const cat = COMMODITY_BY_ID[commodity];
  if (!cat) return { error: "Unknown commodity." };
  if (!shard || !Array.isArray(shard.points)) return { error: "Shard not loaded." };
  const r = computePercentileBands({ points: shard.points, lookback_months });
  if (r.error) return r;
  return { ...r, commodity: cat, source: shard.source, series_id: shard.series_id, units: shard.units, fetched: shard.fetched };
}

export const historicalExample = { inputs: { commodity: "copper", lookback_months: 12 } };

// --- Renderer ---

const shardCache = new Map();
async function loadCommodityShard(file) {
  if (shardCache.has(file)) return shardCache.get(file);
  const promise = (async () => {
    try {
      const r = await fetch("data/historical/commodities/" + file, { cache: "default" });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  })();
  shardCache.set(file, promise);
  return promise;
}

function renderHistoricalPricing(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: monthly history bundled from public BLS PPI / EIA / USDA NASS / FRED series. Each datapoint carries its source and series ID. Reference only; current quotes vary by region and supplier.";

  const sel = makeSelect("Commodity", "hp-commodity",
    [{ value: "", label: "Select commodity..." }].concat(COMMODITIES.map((c) => ({ value: c.id, label: c.label + " (" + c.agency + " " + c.series_id + ")" }))));
  inputRegion.appendChild(sel.wrap);

  const lookback = makeNumber("Lookback (months, 2-120)", "hp-lookback", { step: "1", min: "2", max: "120" });
  lookback.input.value = "12";
  inputRegion.appendChild(lookback.wrap);

  // Output skeleton.
  const summary = document.createElement("p");
  summary.id = "hp-summary";
  summary.textContent = "Pick a commodity to load its monthly history.";
  outputRegion.appendChild(summary);

  const bandsRegion = document.createElement("div");
  bandsRegion.className = "hp-bands";
  outputRegion.appendChild(bandsRegion);

  const tableWrap = document.createElement("div");
  tableWrap.className = "hp-table-wrap";
  outputRegion.appendChild(tableWrap);

  const sourceLine = document.createElement("p");
  sourceLine.className = "data-source-stamp";
  sourceLine.id = "hp-source";
  outputRegion.appendChild(sourceLine);

  function clear() {
    while (bandsRegion.firstChild) bandsRegion.removeChild(bandsRegion.firstChild);
    while (tableWrap.firstChild) tableWrap.removeChild(tableWrap.firstChild);
    sourceLine.textContent = "";
  }

  function renderBands(r) {
    const dl = document.createElement("dl");
    dl.className = "hp-bands-list";
    const rows = [
      ["Latest (" + r.latest_date + ")", fmt(r.latest, 2) + " " + r.units],
      ["25th percentile", fmt(r.p25, 2) + " " + r.units],
      ["50th percentile (median)", fmt(r.p50, 2) + " " + r.units],
      ["75th percentile", fmt(r.p75, 2) + " " + r.units],
      ["90th percentile", fmt(r.p90, 2) + " " + r.units],
      ["Placement", r.placement],
      ["Window", r.points_in_window + " months"],
    ];
    for (const [k, v] of rows) {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dl.appendChild(dt); dl.appendChild(dd);
    }
    bandsRegion.appendChild(dl);
  }

  function renderTable(r, units) {
    const table = document.createElement("table");
    table.className = "hp-history-table";
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    for (const h of ["Month", "Value (" + units + ")"]) {
      const th = document.createElement("th"); th.textContent = h; trh.appendChild(th);
    }
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const p of r.window) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td"); td1.textContent = p.date;
      const td2 = document.createElement("td"); td2.textContent = fmt(Number(p.value), 2);
      tr.appendChild(td1); tr.appendChild(td2); tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  const update = debounce(async () => {
    const id = sel.select.value;
    const lb = Math.max(2, Math.min(120, Number(lookback.input.value) || 12));
    if (!id) { clear(); summary.textContent = "Pick a commodity to load its monthly history."; return; }
    const cat = COMMODITY_BY_ID[id];
    summary.textContent = "Loading " + cat.label + "...";
    const shard = await loadCommodityShard(cat.file);
    if (!shard || !Array.isArray(shard.points)) {
      clear();
      summary.textContent = "Could not load history for " + cat.label + ".";
      return;
    }
    const r = computeHistorical({ commodity: id, lookback_months: lb, shard });
    clear();
    if (r.error) { summary.textContent = r.error; return; }
    summary.textContent = cat.label + " - latest " + r.latest_date + ": " + fmt(r.latest, 2) + " " + r.units + " (" + r.placement + ")";
    renderBands(r);
    renderTable(r, r.units);
    sourceLine.textContent = "Source: " + cat.agency + " series " + cat.series_id + ", " + cat.units + ". Bundled at build time on " + (shard.fetched || "unknown") + ". Reference only; ask your supplier for a current quote.";
  }, DEBOUNCE_MS);

  sel.select.addEventListener("input", update);
  lookback.input.addEventListener("input", update);
}

export const HISTORICAL_RENDERERS = {
  "historical-pricing": renderHistoricalPricing,
};
