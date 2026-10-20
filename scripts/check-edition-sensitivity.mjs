#!/usr/bin/env node
// spec-v1973: every "the rule changed" row must stay true.
//
// A row says a tile's answer differs between two editions. Telling a reader a
// rule changed when it did not is as bad as missing a change, so each row must
// name a live tile, two real edition years in order, one source read in EACH
// edition, a short sentence for each side, a dated signer, and -- the expiry
// rule -- the tile's own citation must still name the newer edition, so a row
// cannot describe a change the tile no longer straddles.
import { EDITION_ROWS } from "../edition-sensitivity.js";
import { TOOLS } from "../tools-data.js";
import { CITATIONS } from "../citations.js";

const CODES = new Set(["IRC", "IBC", "IPC", "IMC", "IFGC", "IECC", "NEC"]);
// The rules as a pure function, so the test can seed each one red.
export function checkEditionRows(rows, { ids, citations, today }) {
const errors = [];
const seen = new Set();
for (const r of rows) {
  const tag = `${r.id} (${r.code})`;
  if (!ids.has(r.id)) errors.push(`${tag}: no such tile`);
  if (!CODES.has(r.code)) errors.push(`${tag}: unknown code`);
  if (seen.has(r.id + "|" + r.code)) errors.push(`${tag}: more than one row for this tile and code`);
  seen.add(r.id + "|" + r.code);
  if (!(Number.isInteger(r.from_edition) && Number.isInteger(r.to_edition) && r.from_edition >= 1990 && r.to_edition > r.from_edition && r.to_edition <= 2100)) errors.push(`${tag}: editions must be years, older first`);
  if (!Array.isArray(r.sources) || r.sources.length !== 2 || r.sources[0].edition !== r.from_edition || r.sources[1].edition !== r.to_edition
    || !r.sources.every((s) => typeof s.citation === "string" && s.citation.includes(String(s.edition)))) {
    errors.push(`${tag}: needs exactly two sources, one read in ${r.from_edition} and one in ${r.to_edition}, each citation naming its edition`);
  }
  if (r.also_older !== undefined && !(Array.isArray(r.also_older) && r.also_older.length && r.also_older.every((y) => Number.isInteger(y) && y > r.from_edition && y < r.to_edition))) {
    errors.push(`${tag}: also_older must list editions after ${r.from_edition} and before ${r.to_edition}`);
  }
  for (const k of ["changed", "older_rule", "section"]) if (typeof r[k] !== "string" || !r[k].trim()) errors.push(`${tag}: ${k} is empty`);
  for (const k of ["changed", "older_rule"]) if (typeof r[k] === "string" && r[k].length > 140) errors.push(`${tag}: ${k} is ${r[k].length} characters, over the 140 cap`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.verified_on || "") || r.verified_on > today) errors.push(`${tag}: verified_on must be a date not in the future`);
  if (!r.verified_by) errors.push(`${tag}: no signer`);
  const ed = (citations[r.id] && citations[r.id].edition) || "";
  if (!new RegExp("\\b" + r.code + "\\s+" + r.to_edition + "\\b").test(ed)) errors.push(`${tag}: the tile's citation no longer names ${r.code} ${r.to_edition}; update or retire the row`);
}
return errors;
}

const errors = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())
  ? checkEditionRows(EDITION_ROWS, { ids: new Set(TOOLS.map((t) => t.id)), citations: CITATIONS, today: new Date().toISOString().slice(0, 10) })
  : null;
if (errors !== null) {
  if (errors.length) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error(`check-edition-sensitivity FAILED with ${errors.length} error(s).`);
    process.exit(1);
  }
  console.log(`check-edition-sensitivity OK: ${EDITION_ROWS.length} edition-change rows, each read in both editions, signed, and still straddled by its tile's citation.`);
}
