// v8 Phase B regression tests (spec-v8.md §4 / §9.2).
//
// Asserts that every tile listed in the Phase B citation tables has an
// inline source-stamp string containing both the code edition year and
// at least one free-access URL. Reads each calc-*.js as text and greps
// for the citation literals; this is the safest way to lock the spec
// strings in place without booting a DOM.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function readCalc(name) {
  return readFile(resolve(ROOT, name), "utf8");
}

const FREE_ACCESS_HOSTS = [
  "nfpa.org/freeaccess", "codes.iccsafe.org", "ecfr.gov", "fda.gov",
  "epa.gov/septic", "ashrae.org", "faa.gov", "awc.org",
];

function assertCitationContains(haystack, needles, description) {
  for (const n of needles) {
    assert.ok(haystack.includes(n), description + " - missing '" + n + "'");
  }
}

// --- Electrical (spec §B.1) ---

test("B.1 wire-ampacity cites NEC 2023 Table 310.16 + free-access URL", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["NEC 2023 Table 310.16", "nfpa.org/freeaccess"], "wire-ampacity");
});
test("B.1 conduit-fill cites NEC 2023 Chapter 9 Tables 4 + 5", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["NEC 2023 Chapter 9, Table 4", "Table 5", "nfpa.org/freeaccess"], "conduit-fill");
});
test("B.1 box-fill cites NEC 2023 §314.16", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["NEC 2023 §314.16", "nfpa.org/freeaccess"], "box-fill");
});
test("B.1 service-load cites NEC 2023 §220.42 / §220.82", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["§220.42", "§220.82", "nfpa.org/freeaccess"], "service-load");
});
test("B.1 breaker-sizing cites NEC 2023 §215.3 / §230.79 / §408.36 + 125% rule", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["§215.3", "§230.79", "§408.36", "§210.20(A)"], "breaker-sizing");
});
test("B.1 motor-fla cites NEC 2023 Tables 430.247-430.250", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["NEC 2023 Tables 430.247", "nfpa.org/freeaccess"], "motor-fla");
});
test("B.1 egc-sizing cites NEC 2023 Table 250.122", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["NEC 2023 Table 250.122", "nfpa.org/freeaccess"], "egc-sizing");
});
test("B.1 lighting-density cites ASHRAE 90.1-2022 Table 9.5.1", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["ASHRAE 90.1-2022 Table 9.5.1", "ashrae.org"], "lighting-density");
});
test("B.1 gfci-afci-reference cites NEC 2023 §210.8 / §210.12 / §406.4", async () => {
  const t = await readCalc("calc-electrical.js");
  assertCitationContains(t, ["§210.8", "§210.12", "§406.4", "nfpa.org/freeaccess"], "gfci-afci-reference");
});

// --- Plumbing (spec §B.2) ---

test("B.2 pipe-sizing cites IPC 2021 Tables 604.3 (WSFU) / 709.1 (DFU) + Hunter (1940)", async () => {
  const t = await readCalc("calc-plumbing.js");
  assertCitationContains(t, ["IPC 2021 Table 604.3", "Table 709.1", "Hunter", "codes.iccsafe.org"], "pipe-sizing");
});
test("B.2 gas-pipe-sizing cites IFGC 2021 Table 402.4 (NFPA 54)", async () => {
  const t = await readCalc("calc-gas.js"); // relocated from calc-plumbing.js (spec-v42 split)
  assertCitationContains(t, ["IFGC 2021 Table 402.4", "NFPA 54", "codes.iccsafe.org"], "gas-pipe-sizing");
});
test("B.2 friction-loss cites Hazen-Williams 1905 + IPC 2021", async () => {
  const t = await readCalc("calc-plumbing.js");
  assertCitationContains(t, ["Hazen-Williams (1905", "IPC 2021"], "friction-loss");
});
test("B.2 septic-tank cites EPA OWTS Manual + free-access URL", async () => {
  const t = await readCalc("calc-septic.js"); // relocated from calc-plumbing.js (spec-v86 split)
  assertCitationContains(t, ["EPA Onsite Wastewater", "EPA/625/R-00/008", "epa.gov/septic"], "septic-tank");
});
test("B.2 grease-trap cites IPC 2021 Table 1003.2 + PDI G101", async () => {
  const t = await readCalc("calc-plumbing.js");
  assertCitationContains(t, ["IPC 2021 Table 1003.2", "PDI G101", "codes.iccsafe.org"], "grease-trap");
});

// --- HVAC (spec §B.3) ---

test("B.3 manual-j-cooling cites ACCA Manual J 8th ed.", async () => {
  const t = await readCalc("calc-hvac.js");
  assertCitationContains(t, ["ACCA Manual J", "8th ed.", "codes.iccsafe.org"], "manual-j-cooling");
});
test("B.3 duct-sizing cites IMC 2021 §603 + Darcy-Weisbach", async () => {
  const t = await readCalc("calc-hvac.js");
  assertCitationContains(t, ["IMC 2021 §603", "Darcy-Weisbach", "codes.iccsafe.org"], "duct-sizing");
});
test("B.3 refrigerant-pt cites ASHRAE 15-2022", async () => {
  const t = await readCalc("calc-refrigerant.js"); // spec-v89 relocation
  assertCitationContains(t, ["ASHRAE 15-2022", "ashrae.org"], "refrigerant-pt");
});
test("B.3 combustion-air cites IMC 2021 §304", async () => {
  const t = await readCalc("calc-hvac.js");
  assertCitationContains(t, ["IMC 2021 §304", "codes.iccsafe.org"], "combustion-air");
});

// --- Fire (spec §B.4) ---

test("B.4 sprinkler-density cites NFPA 13-2022 Table 12.1", async () => {
  const t = await readCalc("calc-fire.js");
  assertCitationContains(t, ["NFPA 13-2022 Table 12.1", "nfpa.org/freeaccess"], "sprinkler-density");
});
test("B.4 required-fire-flow cites IFC 2021 Table B105.1", async () => {
  const t = await readCalc("calc-fire.js");
  assertCitationContains(t, ["IFC 2021 Table B105.1", "codes.iccsafe.org"], "required-fire-flow");
});
test("B.4 pdp cites NFPA 13-2022 §8.3", async () => {
  const t = await readCalc("calc-fire.js");
  assertCitationContains(t, ["NFPA 13-2022 §8.3", "nfpa.org/freeaccess"], "pdp");
});
test("B.4 standpipe-friction cites NFPA 14-2022", async () => {
  const t = await readCalc("calc-fire.js");
  assertCitationContains(t, ["NFPA 14-2022", "nfpa.org/freeaccess"], "standpipe-friction");
});

// --- Construction (spec §B.5) ---

test("B.5 lumber-spans cites IRC 2021 Tables R502.5, R602.5 + AWC NDS-2018", async () => {
  const t = await readCalc("calc-construction.js");
  assertCitationContains(t, ["IRC 2021 Tables R502.5, R602.5", "AWC NDS-2018", "codes.iccsafe.org", "awc.org"], "lumber-spans");
});
test("B.5 rafter cites IRC 2021 Table R802.5.1", async () => {
  const t = await readCalc("calc-construction.js");
  assertCitationContains(t, ["IRC 2021 Table R802.5.1", "codes.iccsafe.org"], "rafter");
});
test("B.5 stair-riser/tread cites IRC 2021 §R311.7", async () => {
  const t = await readCalc("calc-construction.js");
  assertCitationContains(t, ["IRC 2021 §R311.7", "codes.iccsafe.org"], "stairs");
});
test("B.5 footing-area cites IRC 2021 §R401-R403 + IBC 2021 Table 1806.2", async () => {
  const t = await readCalc("calc-construction.js");
  assertCitationContains(t, ["IRC 2021 §R401-R403", "IBC 2021 Table 1806.2", "codes.iccsafe.org"], "footing-area");
});

// --- Cross-cutting (spec §B.6) ---

test("B.6 cooling-curve cites FDA Food Code 2022 §3-401.11 / §3-501.14", async () => {
  const t = await readCalc("calc-kitchen.js");
  assertCitationContains(t, ["FDA Food Code 2022", "§3-401.11", "§3-501.14", "fda.gov"], "cooling-curve");
});
test("B.6 hos-math cites FMCSA 49 CFR 395 + ELD legal record", async () => {
  const t = await readCalc("calc-trucking.js");
  assertCitationContains(t, ["FMCSA 49 CFR 395", "ELD", "ecfr.gov"], "hos-math");
});
test("B.6 bridge-formula cites 23 CFR 658.17 + state-limits caveat", async () => {
  const t = await readCalc("calc-trucking.js");
  assertCitationContains(t, ["23 CFR 658.17", "State limits may be lower", "ecfr.gov"], "bridge-formula");
});

// --- Free-access host coverage roll-up ---

test("Phase B citations together name at least 6 of the 8 free-access hosts", async () => {
  const sources = ["calc-electrical.js", "calc-plumbing.js", "calc-hvac.js", "calc-fire.js", "calc-construction.js", "calc-kitchen.js", "calc-trucking.js", "calc-mechanic.js"];
  const all = (await Promise.all(sources.map(readCalc))).join("\n");
  const present = FREE_ACCESS_HOSTS.filter((h) => all.includes(h));
  assert.ok(present.length >= 6, "expected ≥ 6 free-access hosts named across calc-*.js; got " + present.length + " (" + present.join(", ") + ")");
});
