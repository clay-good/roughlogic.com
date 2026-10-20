// spec-v1976: the search box understands a reader's Spanish words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { foldDiacritics, normalizeQuery, rankTools, extractQuantities } from "../../search-discovery.js";
import { canonicalUnit } from "../../field-units.js";
import { rewriteQuery } from "../../query-fill.js";
import { TOOLS } from "../../tools-data.js";

test("search es: accented and plain spellings fold to the same tokens", () => {
  const pairs = [["caída", "caida"], ["CAÍDA", "caida"], ["tubería", "tuberia"], ["galón", "galon"], ["niño", "nino"], ["pingüino", "pinguino"],
    ["cálculo", "calculo"], ["eléctrico", "electrico"], ["cimentación", "cimentacion"], ["baño", "bano"], ["encimera", "encimera"], ["voltage drop", "voltage drop"]];
  for (const [a, b] of pairs) {
    assert.equal(foldDiacritics(a).toLowerCase(), b);
    assert.deepEqual(normalizeQuery(a).tokens, normalizeQuery(b).tokens, a);
  }
});

test("search es: Spanish unit words resolve to the same canonical units; metric stays refused", () => {
  const table = { pie: "ft", pies: "ft", pulg: "in", pulgada: "in", pulgadas: "in", libra: "lb", libras: "lb", galon: "gal", "galón": "gal", galones: "gal",
    amperio: "a", amperios: "a", voltio: "v", voltios: "v", vatio: "w", vatios: "w", calibre: "awg" };
  for (const [word, unit] of Object.entries(table)) assert.equal(canonicalUnit(word), unit, word);
  assert.equal(canonicalUnit("metros"), null);
  assert.equal(canonicalUnit("metro"), null);
  const q = extractQuantities("150 pies 12 pulgadas 3 metros");
  assert.deepEqual(q.map((x) => canonicalUnit(x.unit)), ["ft", "in", null]);
});

test("search es: the gauge named first (calibre 12) becomes the wire-size phrase the matcher reads", () => {
  assert.match(rewriteQuery("caida de voltaje 150 pies calibre 12 20 amperios"), /wire size 12 awg/);
  assert.match(rewriteQuery("#12 awg"), /wire size 12 awg/);
});

test("search es: the draft queue targets real tiles and is never shipped; any shipped es row is reviewed and ranks its tile first", () => {
  const draft = JSON.parse(readFileSync(new URL("../../docs/aliases-es-draft.json", import.meta.url), "utf8"));
  const ids = new Set(TOOLS.map((t) => t.id));
  assert.ok(draft.rows.length >= 40);
  for (const r of draft.rows) {
    assert.ok(ids.has(r.target), r.target);
    assert.equal(r.kind, "es");
    assert.equal(r.reviewed_by, undefined, "a draft carries no reviewer");
    assert.equal(r.term, foldDiacritics(r.term), "drafts are written unaccented");
  }
  assert.equal(existsSync(new URL("../../dist/docs/aliases-es-draft.json", import.meta.url)), false);
  const master = JSON.parse(readFileSync(new URL("../../data/search/aliases.json", import.meta.url), "utf8"));
  const shipped = master.aliases.filter((r) => r.kind === "es");
  for (const r of shipped) {
    assert.ok(r.reviewed_by, r.term);
    const ranked = rankTools(normalizeQuery(r.term).tokens, TOOLS, master.aliases, { limit: 3 });
    assert.equal(ranked[0] && ranked[0].tool.id, r.target, r.term);
  }
});
