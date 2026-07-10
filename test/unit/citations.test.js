// Unit tests for citations.js (v6 structured citation data model).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CITATIONS, GOVERNANCE, renderCitationBlock, buildAnswerWithReference,
} from "../../citations.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// --- Schema invariants ---

test("GOVERNANCE map covers every spec-v6 §2.5 variant", () => {
  for (const k of [
    "general", "electrical", "plumbing", "structural", "mechanical",
    "fire", "pesticide", "trucking", "aviation", "marine", "food",
    "water", "rigging", "field", "reference",
  ]) assert.ok(typeof GOVERNANCE[k] === "string" && GOVERNANCE[k].length > 0, "missing " + k);
});

test("every CITATIONS entry has the six required §3 fields", () => {
  for (const id of Object.keys(CITATIONS)) {
    const c = CITATIONS[id];
    for (const f of ["formula", "edition", "freeAccess", "governance", "editionNote"]) {
      assert.ok(typeof c[f] === "string" && c[f].length > 0, id + " missing or empty " + f);
    }
    assert.ok(Array.isArray(c.assumptions), id + " assumptions must be an array");
  }
});

test("every CITATIONS governance value matches a GOVERNANCE variant verbatim", () => {
  const allowed = new Set(Object.values(GOVERNANCE));
  for (const id of Object.keys(CITATIONS)) {
    const c = CITATIONS[id];
    assert.ok(allowed.has(c.governance), id + " has off-script governance text");
  }
});

test("Group A audit coverage: every electrical tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  // Pull every Group A tile id from tools-data.js.
  const groupABlock = appText.split("// Group A: Electrical")[1].split("// Group B")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupABlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length > 20, "expected many Group A tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group A tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group B audit coverage: every plumbing/gas tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupBBlock = appText.split("// Group B: Plumbing")[1].split("// Group C: HVAC")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupBBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length > 20, "expected many Group B tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group B tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group B citations cite IPC / IFGC by section number and edition", () => {
  // Spot-check that the IPC / IFGC editions are named at least once where
  // expected (gas-pipe-sizing must name IFGC; pipe-sizing must name IPC).
  assert.match(CITATIONS["pipe-sizing"].edition, /IPC 2021/);
  assert.match(CITATIONS["gas-pipe-sizing"].edition, /IFGC 2021/);
  assert.match(CITATIONS["trap-arm"].edition, /IPC 2021.*Section 909/);
});

// Helper: pull tile ids from one of tools-data.js' "// Group X:" blocks.
async function _groupIds(blockMarker, nextMarker) {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const block = appText.split(blockMarker)[1].split(nextMarker)[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m; while ((m = re.exec(block)) !== null) ids.push(m[1]);
  return ids;
}

test("Group F audit coverage: every fire-ground tile has a CITATIONS entry", async () => {
  const ids = await _groupIds("// Group F: Fire-Ground", "// Group G");
  assert.ok(ids.length === 31, "expected 31 Group F tile ids, got " + ids.length);
  for (const id of ids) assert.ok(CITATIONS[id], "Group F tile '" + id + "' missing CITATIONS entry");
});

test("Group F citations cite NFA / NFPA / ISO / OSHA / ASME by name", () => {
  assert.match(CITATIONS["fire-friction"].edition, /National Fire Academy/);
  assert.match(CITATIONS["sprinkler-density"].edition, /NFPA 13/);
  assert.match(CITATIONS["standpipe-friction"].edition, /NFPA 14/);
  assert.match(CITATIONS["foam"].edition, /NFPA 11/);
  assert.match(CITATIONS["required-fire-flow"].edition, /ISO Public Protection Classification/);
  assert.match(CITATIONS["confined-space-purge"].edition, /29 CFR 1910\.146/);
  assert.match(CITATIONS["sling-angle"].edition, /ASME B30\.9/);
});

test("Group F all 18 tiles use the fire governance variant", () => {
  for (const id of [
    "fire-friction", "pdp", "hydrant-flow", "required-fire-flow", "master-stream",
    "aerial-ladder", "foam", "smoke-reading", "reverse-lay-friction",
    "sprinkler-density", "standpipe-friction", "ladder-pipe-reach", "braking-distance",
    "confined-space-purge", "rope-ma", "sling-angle",
    "standpipe-pdp", "smoke-ejector-cfm",
  ]) assert.equal(CITATIONS[id].governance, GOVERNANCE.fire, id + " should use fire governance");
});

test("Group G audit coverage: every cross-trade tile has a CITATIONS entry", async () => {
  const ids = await _groupIds("// Group G: Cross-Trade", "// Group H:");
  assert.ok(ids.length === 31, "expected 31 Group G tile ids, got " + ids.length);
  for (const id of ids) assert.ok(CITATIONS[id], "Group G tile '" + id + "' missing CITATIONS entry");
});

test("Group G compliance tiles cite OSHA / ADA / NIOSH / NWS by section", () => {
  assert.match(CITATIONS["trench-slope"].edition, /29 CFR 1926.*Subpart P/);
  assert.match(CITATIONS["niosh-lifting"].edition, /NIOSH/);
  assert.match(CITATIONS["wind-chill"].edition, /NWS Wind Chill/);
  assert.match(CITATIONS["ramp-slope"].edition, /ADA Standards/);
  assert.match(CITATIONS["ladder-angle"].edition, /ANSI A14\.7/);
  assert.match(CITATIONS["mileage-cost"].edition, /IRS-published standard mileage/);
});

test("Group G ramp-slope and trench-slope use structural governance; rainwater-yield uses plumbing", () => {
  assert.equal(CITATIONS["ramp-slope"].governance, GOVERNANCE.structural);
  assert.equal(CITATIONS["trench-slope"].governance, GOVERNANCE.structural);
  assert.equal(CITATIONS["rainwater-yield"].governance, GOVERNANCE.plumbing);
});

test("Group L audit coverage: every agriculture tile has a CITATIONS entry", async () => {
  const ids = await _groupIds("// Group L: Agriculture", "// Group M");
  assert.ok(ids.length === 27, "expected 27 Group L tile ids, got " + ids.length);
  for (const id of ids) assert.ok(CITATIONS[id], "Group L tile '" + id + "' missing CITATIONS entry");
});

test("Group L pesticide-application tiles use the pesticide / 'label is the law' governance", () => {
  for (const id of ["gpa-rate", "seed-rate", "tank-mix"]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.pesticide, id + " should use pesticide governance");
  }
});

test("Group L cites USDA / ASABE / Christiansen by name", () => {
  assert.match(CITATIONS["timber-cruise"].edition, /USDA Forest Service/);
  assert.match(CITATIONS["irrigation-uniformity"].edition, /Christiansen/);
  assert.match(CITATIONS["drawbar-power"].edition, /ASABE D497/);
});

test("Group N audit coverage: every stage tile has a CITATIONS entry", async () => {
  const ids = await _groupIds("// Group N: Stage", "// Group O");
  assert.ok(ids.length === 8, "expected 8 Group N tile ids, got " + ids.length);
  for (const id of ids) assert.ok(CITATIONS[id], "Group N tile '" + id + "' missing CITATIONS entry");
});

test("Group N all 6 tiles use the rigging governance variant", () => {
  for (const id of ["truss-capacity", "time-alignment", "dmx-planner", "neutral-imbalance", "spl-distance", "rigging-check"]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.rigging, id + " should use rigging governance");
  }
});

test("Group N dmx-planner cites ANSI E1.11 by name", () => {
  assert.match(CITATIONS["dmx-planner"].edition, /ANSI E1\.11/);
});

test("Group P audit coverage: every field/SAR tile has a CITATIONS entry", async () => {
  const ids = await _groupIds("// Group P: Field", "// Group Q");
  assert.ok(ids.length === 12, "expected 12 Group P tile ids, got " + ids.length);
  for (const id of ids) assert.ok(CITATIONS[id], "Group P tile '" + id + "' missing CITATIONS entry");
});

test("Group P all 6 tiles use the field governance variant", () => {
  for (const id of ["pacing-distance", "bearing-conversion", "slope-avalanche", "backcountry-needs", "utm-conversion", "solar-times"]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.field, id + " should use field governance");
  }
});

test("Group P cites NOAA / USGS / AIARE by name", () => {
  assert.match(CITATIONS["bearing-conversion"].edition, /NOAA NCEI World Magnetic Model/);
  assert.match(CITATIONS["solar-times"].edition, /NOAA Solar/);
  assert.match(CITATIONS["utm-conversion"].edition, /USGS/);
  assert.match(CITATIONS["slope-avalanche"].edition, /AIARE/);
});

test("Group Q historical-pricing carries the reference governance variant", () => {
  assert.equal(CITATIONS["historical-pricing"].governance, GOVERNANCE.reference);
  assert.match(CITATIONS["historical-pricing"].edition, /BLS PPI/);
});

test("v6 audit complete: every tile id in tools-data.js has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const re = /^\s+\{ id: "([a-z0-9-]+)"/gm;
  const ids = [];
  let m; while ((m = re.exec(appText)) !== null) ids.push(m[1]);
  assert.ok(ids.length >= 200, "expected at least 200 tile ids in tools-data.js, got " + ids.length);
  const missing = ids.filter((id) => !CITATIONS[id]);
  assert.equal(missing.length, 0, "tiles missing CITATIONS entries: " + missing.join(", "));
});

test("Group D audit coverage: every restoration tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupDBlock = appText.split("// Group D: Restoration")[1].split("// Group E")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupDBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length === 25, "expected 25 Group D tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group D tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group D citations cite IICRC S500-2021 / S520-2024 by name", () => {
  // Sample a representative water-damage tile and a mold tile.
  assert.match(CITATIONS["dehumidifier"].edition, /IICRC S500-2021/);
  assert.match(CITATIONS["mold"].edition, /IICRC S520-2024/);
  assert.match(CITATIONS["nam-sizing"].edition, /IICRC S520-2024/);
  assert.match(CITATIONS["chamber-turnover"].edition, /IICRC S500-2021/);
});

test("Group D PPE tile cites OSHA 29 CFR 1910.134 by section", () => {
  assert.match(CITATIONS["ppe"].edition, /29 CFR 1910\.134/);
});

test("Group D restoration tiles use the general governance variant (no IICRC variant in spec §2.5)", () => {
  for (const id of [
    "psychrometric", "drying-goal", "dehumidifier", "air-movers", "water-classes",
    "drying-times", "mold", "ppe", "standing-water", "nam-sizing",
    "hepa-filter-life", "thermal-delta-t", "containment-air-balance", "chamber-turnover",
  ]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.general, id + " should use general governance");
  }
});

test("Group M audit coverage: every water tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupMBlock = appText.split("// Group M: Water")[1].split("// Group N")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupMBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length === 28, "expected 28 Group M tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group M tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group M citations all carry the water governance variant", () => {
  for (const id of ["pounds-formula", "filter-loading", "detention-time", "lab-dilution", "pump-eff-w2w", "srt-fm-ratio"]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.water, id + " should use water governance");
  }
});

test("Group M detention-time cites EPA SWTR 40 CFR 141 by section", () => {
  assert.match(CITATIONS["detention-time"].edition, /40 CFR 141/);
});

test("Group M srt-fm-ratio cites Metcalf & Eddy by name", () => {
  assert.match(CITATIONS["srt-fm-ratio"].edition, /Metcalf.*Eddy/);
});

test("Group M governance flags operator of record and primacy agency", () => {
  assert.match(CITATIONS["pounds-formula"].governance, /[Oo]perator of record.*primacy agency/);
});

test("Group O audit coverage: every kitchen tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupOBlock = appText.split("// Group O: Kitchen")[1].split("// Group P")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupOBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length === 8, "expected 8 Group O tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group O tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group O citations all carry the food-service governance variant", () => {
  for (const id of ["recipe-scale", "yield-ep", "cooling-curve", "plate-cost", "pan-conversion"]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.food, id + " should use food governance");
  }
});

test("Group O cooling-curve cites FDA Food Code 2022 by section", () => {
  assert.match(CITATIONS["cooling-curve"].edition, /FDA Food Code 2022.*3-501\.14/);
});

test("Group O recipe-scale and yield-ep cite USDA FoodData Central by name", () => {
  assert.match(CITATIONS["recipe-scale"].edition, /USDA FoodData Central/);
  assert.match(CITATIONS["yield-ep"].edition, /USDA FoodData Central/);
});

test("Group O governance flags the thermometer as the verdict", () => {
  assert.match(CITATIONS["cooling-curve"].governance, /thermometer.*verdict/i);
});

test("Group K audit coverage: every mechanic tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupKBlock = appText.split("// Group K: Mechanic")[1].split("// Group L")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupKBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length === 12, "expected 12 Group K tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group K tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group K marine tile uses marine governance and cites ABYC P-17", () => {
  const c = CITATIONS["prop-slip"];
  assert.equal(c.governance, GOVERNANCE.marine);
  assert.match(c.edition, /ABYC P-17/);
});

test("Group K fuel-range cites DOE EERE Alternative Fuels Data Center by name", () => {
  assert.match(CITATIONS["fuel-range"].edition, /DOE EERE Alternative Fuels Data Center/);
});

test("Group J audit coverage: every trucking tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupJBlock = appText.split("// Group J: Trucking")[1].split("// Group K")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupJBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length === 18, "expected 18 Group J tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group J tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group J citations all carry the trucking governance variant", () => {
  for (const id of ["dim-weight", "freight-density", "pallet-loadout", "hos-math", "bridge-formula", "reefer-burn", "incoterm-decoder"]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.trucking, id + " should use trucking governance");
  }
});

test("Group J FMCSA / FHWA tiles cite 49 CFR 395 and 23 CFR 658.17 by section", () => {
  assert.match(CITATIONS["hos-math"].edition, /49 CFR 395/);
  assert.match(CITATIONS["bridge-formula"].edition, /23 CFR 658\.17/);
});

test("Group J governance flags ELD / carrier tariff as the legal record", () => {
  assert.match(CITATIONS["hos-math"].governance, /ELD.*carrier tariff.*legal record/i);
  assert.match(CITATIONS["bridge-formula"].governance, /State limits may be lower than federal/);
});

test("Group J incoterm-decoder is a reference page (no compute)", () => {
  assert.match(CITATIONS["incoterm-decoder"].formula, /\(reference page; no compute\)/);
});

test("Group E audit coverage: every construction tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupEBlock = appText.split("// Group E: Carpentry")[1].split("// Group F")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupEBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length >= 30, "expected many Group E tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group E tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group E structural tiles cite IRC / IBC / ASCE / AWC / ACI by edition", () => {
  assert.match(CITATIONS["lumber-spans"].edition, /AWC NDS-2018/);
  assert.match(CITATIONS["wind-pressure"].edition, /ASCE 7-22/);
  assert.match(CITATIONS["snow-load"].edition, /ASCE 7-22/);
  assert.match(CITATIONS["footing-area"].edition, /IBC 2021.*Table 1806\.2/);
  assert.match(CITATIONS["concrete-mix-design"].edition, /ACI 211/);
  assert.match(CITATIONS["formwork-pressure"].edition, /ACI 347/);
  assert.match(CITATIONS["stairs"].edition, /IRC 2021/);
});

test("Group E load-bearing tiles use the structural governance variant", () => {
  for (const id of [
    "stairs", "rafter", "concrete", "rebar", "lumber-spans", "fastener-pullout",
    "beam-loading", "stair-stringer", "joist-deflection", "footing-area",
    "excavation", "wind-pressure", "snow-load", "anchor-embedment",
    "concrete-mix-design", "bolt-torque", "weld-usage", "formwork-pressure",
  ]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.structural, id + " should use structural governance");
  }
});

test("Group C audit coverage: every HVAC tile id has a CITATIONS entry", async () => {
  const appText = await readFile(resolve(ROOT, "tools-data.js"), "utf8");
  const groupCBlock = appText.split("// Group C: HVAC")[1].split("// Group D")[0];
  const ids = [];
  const re = /\{ id: "([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(groupCBlock)) !== null) ids.push(m[1]);
  assert.ok(ids.length > 20, "expected many Group C tile ids, got " + ids.length);
  for (const id of ids) {
    assert.ok(CITATIONS[id], "Group C tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group C citations all carry the mechanical governance variant", () => {
  for (const id of [
    "manual-j-cooling", "manual-j-heating", "duct-sizing", "static-pressure-hvac",
    "refrigerant-pt", "superheat-subcool", "seer-eer", "balance-point", "shr",
    "cfm-per-ton", "combustion-air", "compare-refrigerants", "refrigerant-charge",
    "approach-delta-t", "outdoor-air-mix", "equivalent-length", "wet-bulb-psychrometer",
    "insulation-thickness", "evaporative-cooling", "affinity-laws", "belt-pulley",
    "air-receiver", "geothermal-loop", "baseboard-output", "npsh-a",
  ]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.mechanical, id + " uses off-script governance");
  }
});

test("Group C Manual J tiles disclose the simplified-estimator caveat", () => {
  for (const id of ["manual-j-cooling", "manual-j-heating"]) {
    const c = CITATIONS[id];
    assert.match(c.formula + " " + c.editionNote, /simplified estimator|not a code-compliant|supersedes/i,
      id + " should explicitly disclose that it is not a code-compliant ACCA Manual J calculation");
  }
});

test("Group C tiles cite ACCA / ASHRAE / IFGC by edition where relevant", () => {
  assert.match(CITATIONS["manual-j-cooling"].edition, /ACCA Manual J/);
  assert.match(CITATIONS["duct-sizing"].edition, /ACCA Manual D/);
  assert.match(CITATIONS["combustion-air"].edition, /IFGC 2021/);
  assert.match(CITATIONS["outdoor-air-mix"].edition, /ASHRAE 62\.1-2022/);
});

test("Group H audit coverage: every reference tile has a CITATIONS entry", () => {
  for (const id of [
    "color-codes", "knot-reference", "inspection-checklist", "emergency-contacts",
    "tool-maintenance", "hand-signals", "osha-top10", "loto-steps",
    "defensible-space", "storm-shelter", "triage-quickread",
  ]) {
    assert.ok(CITATIONS[id], "Group H tile '" + id + "' missing CITATIONS entry");
  }
});

test("Group H reference tiles flag '(reference page; no compute)' in the formula slot", () => {
  for (const id of [
    "color-codes", "knot-reference", "inspection-checklist", "emergency-contacts",
    "tool-maintenance", "hand-signals", "osha-top10", "loto-steps",
    "defensible-space", "storm-shelter", "triage-quickread",
  ]) {
    assert.match(CITATIONS[id].formula, /\(reference page; no compute\)/, id + " formula should mark itself as a reference page");
  }
});

test("Group H storm-shelter cites FEMA P-320 and ICC 500 with the structural governance variant", () => {
  const c = CITATIONS["storm-shelter"];
  assert.match(c.edition, /FEMA P-320/);
  assert.match(c.edition, /ICC 500/);
  assert.equal(c.governance, GOVERNANCE.structural);
});

test("Group H triage-quickread carries the field governance variant (not medical advice)", () => {
  assert.equal(CITATIONS["triage-quickread"].governance, GOVERNANCE.field);
});

test("Group H hand-signals does not reproduce ASME imagery (descriptions-only flag)", () => {
  const c = CITATIONS["hand-signals"];
  assert.match(c.formula + " " + c.editionNote, /image reproduction.*prohibited/i);
});

test("Group B citations all carry the plumbing governance variant", () => {
  for (const id of [
    "pipe-sizing", "friction-loss", "pipe-volume", "pump-sizing",
    "static-pressure-piping", "gas-pipe-sizing", "slope", "pressure-conversion",
    "backflow", "water-hammer-arrestor", "recirc-pump-head", "septic-tank",
    "trap-arm", "pipe-expansion", "tankless-gpm", "gas-leak-rate",
    "stormwater-rational", "manning-slope", "hydrostatic-test", "grease-trap",
    "glycol-mix", "expansion-tank", "backflow-loss",
  ]) {
    assert.equal(CITATIONS[id].governance, GOVERNANCE.plumbing, id + " uses off-script governance");
  }
});

// --- buildAnswerWithReference ---

test("buildAnswerWithReference: missing entry returns a stub", () => {
  const s = buildAnswerWithReference("My Tool", "Result: 42", "no-such-tool");
  assert.ok(s.includes("My Tool"));
  assert.ok(s.includes("Result: 42"));
  assert.ok(s.includes("not yet authored"));
});

test("buildAnswerWithReference: present entry includes formula, edition, governance, free-access", () => {
  const s = buildAnswerWithReference("Voltage Drop", "VD = 7.9 V", "voltage-drop");
  assert.ok(s.includes("Formula:"));
  assert.ok(s.includes("Edition:"));
  assert.ok(s.includes("Free access:"));
  assert.ok(s.includes("Governance:"));
  assert.ok(s.includes("Edition note:"));
  // Multi-line list of assumptions when present.
  assert.ok(s.includes("Assumptions:"));
});

test("buildAnswerWithReference: voltage-drop carries an NEC edition string", () => {
  const s = buildAnswerWithReference("Voltage Drop", "x", "voltage-drop");
  assert.match(s, /NEC 2023/);
});

test("buildAnswerWithReference: no assumptions clause omitted when assumptions array empty", () => {
  // ohms-law has 1 assumption ("DC or RMS AC"); pick a tile with empty assumptions if present.
  let foundEmpty = null;
  for (const id of Object.keys(CITATIONS)) {
    if (CITATIONS[id].assumptions.length === 0) { foundEmpty = id; break; }
  }
  if (!foundEmpty) {
    // gfci-afci-reference and phase-balance currently have empty arrays.
    foundEmpty = "gfci-afci-reference";
  }
  const s = buildAnswerWithReference("X", "Y", foundEmpty);
  assert.ok(!s.includes("Assumptions:"), foundEmpty + " should not emit Assumptions header on empty list");
});

// --- renderCitationBlock (with a tiny DOM stub) ---

function makeStubDom() {
  const make = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      children: [], attrs: {}, classList: { add: (c) => { el.className = c; } },
      _text: "",
      get textContent() {
        if (this._text) return this._text;
        return this.children.map((c) => c.textContent || "").join("");
      },
      set textContent(v) { this._text = v; this.children = []; },
      appendChild(c) { this.children.push(c); return c; },
      removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
      setAttribute(k, v) { this.attrs[k] = v; },
      querySelector(sel) {
        if (sel.startsWith(".")) {
          const cls = sel.slice(1);
          for (const c of this.children) if (c.className === cls) return c;
        }
        return null;
      },
    };
    return el;
  };
  globalThis.document = { createElement: make };
  return { make };
}

test("renderCitationBlock: returns null for unknown tile id", () => {
  makeStubDom();
  const parent = globalThis.document.createElement("section");
  const r = renderCitationBlock(parent, "no-such-tool");
  assert.equal(r, null);
});

test("renderCitationBlock: mounts a .v6-reference-block with formula and assumption rows", () => {
  makeStubDom();
  const parent = globalThis.document.createElement("section");
  const block = renderCitationBlock(parent, "voltage-drop");
  assert.ok(block);
  assert.equal(block.className, "v6-reference-block");
  // Block should contain at least the heading + a dl with the §3 rows.
  const all = JSON.stringify(block, (k, v) => k === "children" ? v : v);
  assert.ok(all.includes("Reference"));
  assert.ok(all.includes("Formula or table cited"));
  assert.ok(all.includes("Numeric assumptions"));
  assert.ok(all.includes("NEC 2023"));
});

test("renderCitationBlock: idempotent — replaces an existing block", () => {
  makeStubDom();
  const parent = globalThis.document.createElement("section");
  renderCitationBlock(parent, "voltage-drop");
  renderCitationBlock(parent, "ohms-law");
  // Only one .v6-reference-block at a time.
  const blocks = parent.children.filter((c) => c.className === "v6-reference-block");
  assert.equal(blocks.length, 1);
});
