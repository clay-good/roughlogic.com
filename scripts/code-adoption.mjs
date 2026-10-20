// spec-v1968: the per-state NEC adoption rows.
//
// docs/code-adoption-rows.json holds all 51 drafted rows (50 states and DC),
// each citing that state's own statute or rule. The NFPA map is kept beside
// each row as a cross-check only. Every row ships in
// data/legal/code-adoption.json (build-data.mjs writes it from
// buildCodeAdoptionShard()); a row a maintainer has not signed carries
// verified_on null and the page labels it "not verified" (user decision
// 2026-10-18, replacing "signed rows only"). A row whose sources conflict ships
// with review "conflict" and the page shows no edition for it. validateRows() is the rulebook:
// scripts/check-code-adoption.mjs runs it in lint, and the unit test seeds
// each rule red.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { editionsOn } from "../code-adoption.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ROWS_PATH = resolve(ROOT, "docs", "code-adoption-rows.json");

export const JURISDICTIONS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
  "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];
const STATUSES = new Set(["statewide", "statewide-amended", "limited", "local", "none"]);
const SCOPES = new Set(["all", "commercial", "other-than-one-two-family", "one-two-family", "state-buildings"]);
// Fields that ship in the shard. The prose-lint cap on data shards is 140
// characters; a row that needs more belongs in draft_note, which never ships.
const SHIPPED = ["name", "status", "editions", "upcoming", "pending", "scope", "citation", "source_url", "verified_by", "verified_on"];
const CAP = 140;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function loadRows() {
  return JSON.parse(readFileSync(ROWS_PATH, "utf8"));
}

// Returns { errors, warnings }. `today` is an ISO date.
export function validateRows(doc, today) {
  const errors = [];
  const warnings = [];
  const rows = (doc && doc.rows) || {};
  const cadence = doc && doc.cadence_days;
  if (!Number.isInteger(cadence) || cadence < 1) errors.push("cadence_days must be a positive integer");
  const keys = Object.keys(rows);
  for (const j of JURISDICTIONS) if (!rows[j]) errors.push(j + ": row missing (all 50 states and DC are required)");
  for (const k of keys) if (!JURISDICTIONS.includes(k)) errors.push(k + ": not a state or DC");

  for (const [k, r] of Object.entries(rows)) {
    const at = k + ": ";
    if (!r.name) errors.push(at + "no name");
    if (!STATUSES.has(r.status)) errors.push(at + "status '" + r.status + "' is not one of " + [...STATUSES].join(", "));
    if (!r.citation || !r.citation.trim()) errors.push(at + "no citation (every row cites its state's own statute or rule)");
    if (!/^https:\/\/[^\s]+$/.test(r.source_url || "")) errors.push(at + "source_url must be an https link");
    if (typeof r.citation_primary !== "boolean") errors.push(at + "citation_primary must be true or false");
    for (const f of ["citation", "scope", "pending"]) {
      if (typeof r[f] === "string" && r[f].length > CAP) errors.push(at + f + " is " + r[f].length + " characters; shipped strings stop at " + CAP + " (move the rest to draft_note)");
    }
    const eds = [...(r.editions || []), ...(r.upcoming || [])];
    for (const e of eds) {
      if (!SCOPES.has(e.applies_to)) errors.push(at + "applies_to '" + e.applies_to + "' is not a known scope");
      if (!/^(19|20)\d\d$/.test(e.edition || "")) errors.push(at + "edition '" + e.edition + "' is not a year");
      if (e.effective === null) {
        if (!r.draft_note) errors.push(at + "NEC " + e.edition + " has no effective date and no draft_note saying why");
      } else if (!ISO.test(e.effective || "")) errors.push(at + "effective '" + e.effective + "' is not an ISO date");
    }
    for (const e of r.upcoming || []) if (!e.effective) errors.push(at + "an upcoming edition needs its effective date");
    if (r.status === "local" || r.status === "none") {
      if (eds.length) errors.push(at + r.status + " rows list no editions");
    } else if (STATUSES.has(r.status) && editionsOn(r, today).length === 0) {
      errors.push(at + "a " + r.status + " row needs an edition in force on " + today);
    }

    // Cross-check: an edition the NFPA map does not show must be explained.
    if (r.nfpa_2026_08_03) {
      const nfpaYears = new Set(r.nfpa_2026_08_03.match(/\b(?:19|20)\d\d\b/g) || []);
      const off = (r.editions || []).filter((e) => !nfpaYears.has(e.edition));
      if (off.length && !/NFPA/.test(r.draft_note || "")) {
        errors.push(at + "NEC " + off.map((e) => e.edition).join(", ") + " disagrees with the NFPA map (" + r.nfpa_2026_08_03 + ") and draft_note does not explain it");
      }
    }

    // Sign-off rules.
    const signed = r.verified_on != null || r.verified_by != null;
    if (signed) {
      if (!r.verified_by || !String(r.verified_by).trim()) errors.push(at + "verified_on is set but verified_by is empty");
      if (!ISO.test(r.verified_on || "")) errors.push(at + "verified_by is set but verified_on is not an ISO date");
      else if (r.verified_on > today) errors.push(at + "verified_on " + r.verified_on + " is in the future");
      if (!r.citation_primary) errors.push(at + "signed, but its citation is not a primary source; a row is signed against its state's own statute or rule");
      if (ISO.test(r.verified_on || "") && r.verified_on <= today) {
        const age = Math.round((Date.parse(today) - Date.parse(r.verified_on)) / 86400000);
        if (age > 2 * cadence) errors.push(at + "verified " + age + " days ago, two rechecks late; recheck it or clear its sign-off");
        else if (age > cadence) warnings.push(at + "verified " + age + " days ago, past its " + cadence + "-day recheck; it is withheld from display until rechecked");
      }
    }
  }
  return { errors, warnings };
}

// spec-v1974: the same rows for the building codes, one file per code
// (docs/code-adoption-rows.<code>.json). A building code is adopted per family
// as well as per edition: a state on the Uniform Plumbing Code has no IPC
// edition, and the row says so. Rows are drafted one state at a time, so a
// file need not hold all 51; an empty file ships nothing.
export const BUILDING_CODES = ["IRC", "IBC", "IPC", "IMC", "IFGC", "IECC"];
export const FAMILIES = {
  IRC: ["IRC", "other"], IBC: ["IBC", "other"], IPC: ["IPC", "UPC", "other"],
  IMC: ["IMC", "UMC", "other"], IFGC: ["IFGC", "NFPA 54", "UPC", "other"], IECC: ["IECC", "other"],
};
const CODE_SCOPES = new Set([...SCOPES, "residential", "residential-and-commercial"]);
export const codeRowsPath = (code) => resolve(ROOT, "docs", "code-adoption-rows." + code.toLowerCase() + ".json");

export function loadCodeRows(code) {
  try { return JSON.parse(readFileSync(codeRowsPath(code), "utf8")); } catch { return null; }
}

// The rulebook for one building code's file. Returns { errors, warnings }.
export function validateCodeRows(code, doc, today) {
  const errors = [];
  const warnings = [];
  const at0 = code + " ";
  if (!doc) return { errors: [at0 + "rows file missing (" + codeRowsPath(code).split("/").pop() + ")"], warnings };
  if (doc.code !== code) errors.push(at0 + "file names code '" + doc.code + "'");
  const cadence = doc.cadence_days;
  if (!Number.isInteger(cadence) || cadence < 1) errors.push(at0 + "cadence_days must be a positive integer");
  for (const [k, r] of Object.entries(doc.rows || {})) {
    const at = at0 + k + ": ";
    if (!JURISDICTIONS.includes(k)) { errors.push(at + "not a state or DC"); continue; }
    if (!r.name) errors.push(at + "no name");
    if (!STATUSES.has(r.status)) errors.push(at + "status '" + r.status + "' is not one of " + [...STATUSES].join(", "));
    if (!FAMILIES[code].includes(r.family)) errors.push(at + "family '" + r.family + "' is not one of " + FAMILIES[code].join(", "));
    if (!r.citation || !r.citation.trim()) errors.push(at + "no citation (every row cites its state's own statute or rule)");
    if (!/^https:\/\/[^\s]+$/.test(r.source_url || "")) errors.push(at + "source_url must be an https link");
    if (typeof r.citation_primary !== "boolean") errors.push(at + "citation_primary must be true or false");
    for (const f of ["citation", "scope", "pending"]) {
      if (typeof r[f] === "string" && r[f].length > CAP) errors.push(at + f + " is " + r[f].length + " characters; shipped strings stop at " + CAP);
    }
    const eds = [...(r.editions || []), ...(r.upcoming || [])];
    // A state on another family (UPC, UMC, NFPA 54) adopts no edition of this code.
    if (r.family !== code && eds.length) errors.push(at + "a " + r.family + " row lists " + code + " editions; a state on another code family adopts none");
    for (const e of eds) {
      if (!CODE_SCOPES.has(e.applies_to)) errors.push(at + "applies_to '" + e.applies_to + "' is not a known scope");
      if (!/^(19|20)\d\d$/.test(e.edition || "")) errors.push(at + "edition '" + e.edition + "' is not a year");
      if (e.effective === null) { if (!r.draft_note) errors.push(at + code + " " + e.edition + " has no effective date and no draft_note saying why"); }
      else if (!ISO.test(e.effective || "")) errors.push(at + "effective '" + e.effective + "' is not an ISO date");
    }
    if (r.family === code && (r.status === "statewide" || r.status === "statewide-amended" || r.status === "limited") && editionsOn(r, today).length === 0) {
      errors.push(at + "a " + r.status + " " + code + " row needs an edition in force on " + today);
    }
    const signed = r.verified_on != null || r.verified_by != null;
    if (signed) {
      if (!r.verified_by || !String(r.verified_by).trim()) errors.push(at + "verified_on is set but verified_by is empty");
      if (!ISO.test(r.verified_on || "")) errors.push(at + "verified_by is set but verified_on is not an ISO date");
      else if (r.verified_on > today) errors.push(at + "verified_on " + r.verified_on + " is in the future");
      if (!r.citation_primary) errors.push(at + "signed, but its citation is not a primary source");
    }
  }
  return { errors, warnings };
}

// The shipped rows for each building code that has any, or null.
export function buildCodeShards(docs) {
  const codes = {};
  for (const code of BUILDING_CODES) {
    const d = docs[code];
    if (!d || !d.rows || !Object.keys(d.rows).length) continue;
    const by_state = {};
    for (const j of JURISDICTIONS) {
      const r = d.rows[j];
      if (!r) continue;
      const out = {};
      for (const f of SHIPPED) out[f] = r[f] === undefined ? null : r[f];
      out.family = r.family;
      out.review = reviewFlag(r);
      by_state[j] = out;
    }
    codes[code] = { cadence_days: d.cadence_days, by_state };
  }
  return Object.keys(codes).length ? codes : null;
}

export function loadAllCodeRows() {
  return Object.fromEntries(BUILDING_CODES.map((c) => [c, loadCodeRows(c)]));
}

// "conflict" when the drafted sources disagree (draft_note says SOURCES
// CONFLICT): the page then shows no edition. "secondary" when no primary
// citation was found (an absence of statewide adoption has no rule to cite).
export function reviewFlag(r) {
  if (/SOURCES CONFLICT/.test(r.draft_note || "")) return "conflict";
  if (!r.citation_primary) return "secondary";
  return null;
}

// The shipped shard: every jurisdiction's name (so the picker can list all 51)
// and every row, signed or not, with draft-only fields removed and a review flag.
export function buildCodeAdoptionShard(doc, fetched, codeDocs = loadAllCodeRows()) {
  const by_state = {};
  const stamps = [];
  for (const j of JURISDICTIONS) {
    const r = doc.rows[j];
    if (!r) continue;
    const out = {};
    for (const f of SHIPPED) out[f] = r[f] === undefined ? null : r[f];
    out.review = reviewFlag(r);
    by_state[j] = out;
    if (r.verified_on && r.verified_by) stamps.push(r.verified_on);
  }
  if (stamps.length) by_state.verifiedOn = stamps.sort()[0];
  const names = {};
  for (const j of JURISDICTIONS) names[j] = doc.rows[j] ? doc.rows[j].name : j;
  return {
    source: "Each state's own statute or administrative rule adopting NFPA 70 (NEC), per row.",
    edition: "current",
    fetched,
    cadence_days: doc.cadence_days,
    names,
    by_state,
    // spec-v1974: present only once a building code has drafted rows, so the
    // NEC-only shard is unchanged until then.
    ...(buildCodeShards(codeDocs || {}) ? { codes: buildCodeShards(codeDocs || {}) } : {}),
  };
}

// docs/code-adoption-signoff.md, generated from the rows so the sheet a
// maintainer signs from can never disagree with the file the sign-off edits.
// Rows whose sources conflict, or that cannot be signed yet, are listed first.
export function signoffSheet(doc, today, codeDocs = loadAllCodeRows()) {
  const rank = (r) => (!r.citation_primary ? 0 : /CONFLICT/.test(r.draft_note || "") ? 1 : r.draft_note ? 2 : 3);
  const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|");
  const eds = (r) => r.status === "local" ? "local only" :
    [...r.editions.map((e) => e.edition + (e.applies_to === "all" ? "" : " (" + e.applies_to + ")") + (e.effective ? ", " + e.effective : ", date not located")),
      ...r.upcoming.map((e) => e.edition + " from " + e.effective)].join("; ");
  const keys = JURISDICTIONS.filter((k) => doc.rows[k]).sort((a, b) => rank(doc.rows[a]) - rank(doc.rows[b]) || a.localeCompare(b));
  const signed = keys.filter((k) => doc.rows[k].verified_on);
  const lines = [
    "# NEC adoption sign-off sheet",
    "",
    "> Generated by `node scripts/check-code-adoption.mjs --write` from [code-adoption-rows.json](code-adoption-rows.json); do not edit by hand. Spec: [spec-v1968](../specs/spec-v1968.md).",
    "",
    "**" + signed.length + " of " + keys.length + " rows signed.** Every row shows on NEC calculators; an unsigned row is labeled not verified, and a row whose sources conflict shows no edition. Signing a row removes the label for " + doc.cadence_days + " days, after which it reads as not verified again until it is rechecked.",
    "",
    "## How to sign a row",
    "",
    "1. Open the row's source and read the cited section. Confirm the edition, the effective date and the scope.",
    "2. Fix the row in `docs/code-adoption-rows.json` if needed. If the edition differs from the NFPA map, say why in `draft_note`.",
    "3. Set `verified_by` to your name and `verified_on` to today's date (YYYY-MM-DD).",
    "4. Run `node scripts/check-code-adoption.mjs --write`. It refuses a row with no primary citation, writes the shipped shard and this sheet, and re-hashes the legal folder.",
    "",
    "Rows marked *not signable* cite a secondary source because no adopting statute or rule was found. Each one needs its primary citation first.",
    "",
    "| | State | NEC in force " + today + " | Citation | Check before signing | Signed |",
    "|---|---|---|---|---|---|",
  ];
  for (const k of keys) {
    const r = doc.rows[k];
    const flag = !r.citation_primary ? "not signable" : /CONFLICT/.test(r.draft_note || "") ? "conflict" : r.draft_note ? "check" : "";
    const now = r.status === "local" || r.status === "none" ? "local only" : editionsOn(r, today).map((e) => e.edition + (e.applies_to === "all" ? "" : " (" + e.applies_to + ")")).join("; ");
    lines.push("| " + flag + " | " + esc(r.name) + " | " + esc(now) + " | [" + esc(r.citation) + "](" + r.source_url + ") | " +
      esc([r.draft_note, "All listed: " + eds(r) + ".", r.nfpa_2026_08_03 ? "NFPA map (read 2026-08-03): " + r.nfpa_2026_08_03 + "." : "Not on the NFPA map."].filter(Boolean).join(" ")) +
      " | " + (r.verified_on ? esc(r.verified_by) + ", " + r.verified_on : "") + " |");
  }
  // spec-v1974: one section per building code once it has drafted rows, the
  // same order (unsignable, conflicts, notes, clean) and the ICC cross-check
  // where the NEC rows carry the NFPA map.
  for (const code of BUILDING_CODES) {
    const cd = codeDocs && codeDocs[code];
    const ck = cd && cd.rows ? JURISDICTIONS.filter((k) => cd.rows[k]).sort((a, b) => rank(cd.rows[a]) - rank(cd.rows[b]) || a.localeCompare(b)) : [];
    if (!ck.length) continue;
    const file = codeRowsPath(code).split("/").pop();
    lines.push("", "## " + code + " rows", "",
      "**" + ck.filter((k) => cd.rows[k].verified_on).length + " of " + ck.length + " rows signed**, drafted from [" + file + "](" + file + ") by [spec-v1974](../specs/spec-v1974.md). Sign them the same way, in that file.", "",
      "| | State | " + code + " in force " + today + " | Family | Citation | Check before signing | Signed |",
      "|---|---|---|---|---|---|---|");
    for (const k of ck) {
      const r = cd.rows[k];
      const flag = !r.citation_primary ? "not signable" : /CONFLICT/.test(r.draft_note || "") ? "conflict" : r.draft_note ? "check" : "";
      const now = r.status === "local" || r.status === "none" ? "local only" : editionsOn(r, today).map((e) => e.edition + (e.applies_to === "all" ? "" : " (" + e.applies_to + ")")).join("; ");
      const icc = Object.keys(r).find((f) => /^icc_\d{4}_\d{2}_\d{2}$/.test(f));
      lines.push("| " + flag + " | " + esc(r.name) + " | " + esc(now) + " | " + esc(r.family) + " | [" + esc(r.citation) + "](" + r.source_url + ") | " +
        esc([r.draft_note, "All listed: " + (eds(r) || "none") + ".", icc ? "ICC (read " + icc.slice(4).replace(/_/g, "-") + "): " + r[icc] + "." : "Not checked against ICC."].filter(Boolean).join(" ")) +
        " | " + (r.verified_on ? esc(r.verified_by) + ", " + r.verified_on : "") + " |");
    }
  }
  return lines.join("\n") + "\n";
}
