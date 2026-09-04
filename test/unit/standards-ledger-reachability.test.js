import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "..");
const readJson = async (f) => JSON.parse(await readFile(resolve(ROOT, f), "utf8"));

async function manifestEditions() {
  const folders = (await readdir(resolve(ROOT, "data"), { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((f) => existsSync(resolve(ROOT, "data", f, "manifest.json")));
  const out = new Map();
  for (const f of folders) out.set(f, (await readJson("data/" + f + "/manifest.json")).edition || "");
  return out;
}

test("every tracked standard is reachable by the edition-staleness check", async () => {
  // CF-06: a row whose match_terms hit no manifest edition is inert -- it looks
  // like coverage and checks nothing. Six of thirteen were in that state.
  const cycle = await readJson("scripts/sources-cycle.json");
  const editions = [...(await manifestEditions()).values()];
  for (const s of cycle.standards) {
    const reachable = (s.match_terms || []).some((t) => editions.some((e) => e.includes(t)));
    if (reachable) continue;
    assert.ok(s.citation_only, s.id + " matches no manifest edition and is not marked citation_only");
    assert.ok(
      typeof s.citation_only_reason === "string" && s.citation_only_reason.length > 40,
      s.id + " is citation_only but gives no substantive reason",
    );
  }
});

test("a superseded edition cited on a tile is disclosed in its folder manifest", async () => {
  // The four that were not: IMC 2021, ASHRAE 62.1-2022, 62.2-2019 and 90.1-2022
  // were cited on HVAC tiles, and IFC 2021 on a fire tile, with no manifest
  // saying a newer edition exists -- while the identical case for IPC / IFGC /
  // IRC / IBC was disclosed. A reader of one tile was told; a reader of the
  // other was not.
  const editions = await manifestEditions();
  const hvac = editions.get("hvac");
  for (const named of ["IMC 2021", "ASHRAE 62.2-2019", "ASHRAE 90.1-2022"]) {
    assert.ok(hvac.includes(named), "hvac manifest must name the bundled edition " + named);
  }
  // Read the current editions from the ledger rather than restating them. This
  // assertion hard-coded "IMC 2024" and broke the same day ICC published the
  // 2027 IMC -- the identical mistake the manifest disclosure had made, in the
  // test written to guard it.
  const cycle = await readJson("scripts/sources-cycle.json");
  const editionOf = (id) => cycle.standards.find((s) => s.id === id).current_edition;
  for (const current of ["62.2-2025", "90.1-2025", "62.1-2025"]) {
    assert.ok(hvac.includes(current), "hvac manifest must name the current edition " + current);
  }
  assert.ok(
    hvac.includes("IMC " + editionOf("imc")),
    "hvac manifest must name the ledger's current IMC edition (" + editionOf("imc") + ")",
  );
  const fire = editions.get("fire");
  assert.ok(fire.includes("IFC 2021"), "fire manifest must name the bundled IFC edition");
  assert.ok(
    fire.includes("IFC " + editionOf("ifc")),
    "fire manifest must name the ledger's current IFC edition (" + editionOf("ifc") + ")",
  );
  // The pattern the older disclosures established, held to here too.
  for (const [folder, text] of [["hvac", hvac], ["fire", fire]]) {
    assert.match(text, /current published edition/, folder + " must use the established disclosure wording");
  }
});

test("the ledger's own _updated covers the newest row in it", async () => {
  const cycle = await readJson("scripts/sources-cycle.json");
  const newest = [...cycle.standards, ...cycle.annual_figures]
    .map((r) => r.last_verified)
    .filter(Boolean)
    .sort()
    .at(-1);
  assert.ok(cycle._updated >= newest, "_updated " + cycle._updated + " is behind " + newest);
});
