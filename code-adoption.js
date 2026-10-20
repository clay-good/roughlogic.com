// spec-v1968 (spec-v106 roadmap pillar 1): "Your state's code edition."
//
// On a tile whose citation names the NEC, the reference block gains one row: a
// state picker and, for the chosen state, the NEC edition that state enforces
// next to the edition the tile follows. The state is kept in one localStorage
// key (`rl-state`), written only when the reader picks one; nothing is sent.
//
// Every drafted row ships (scripts/code-adoption.mjs builds
// data/legal/code-adoption.json from docs/code-adoption-rows.json). A row a
// maintainer has signed within its recheck cadence reads as verified; any other
// row is shown with a plain "not verified" label and the advice to confirm with
// the inspector, and a row whose sources conflict shows no edition at all
// (user decision 2026-10-18; until then unsigned rows were withheld).
//
// The functions above mountStatePicker are pure, so test/unit/code-adoption
// runs them without a DOM.

export const STATE_KEY = "rl-state";

const SCOPE_LABEL = {
  all: "",
  commercial: "commercial buildings",
  "other-than-one-two-family": "buildings other than one- and two-family dwellings",
  "one-two-family": "one- and two-family dwellings",
  "state-buildings": "state buildings",
  // spec-v1974 building-code scopes
  residential: "residential buildings",
  "residential-and-commercial": "residential and commercial buildings",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function isoToday(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? MONTHS[+m[2] - 1] + " " + +m[3] + ", " + m[1] : "";
}

// The edition in force on `today` for each scope the row covers: the latest
// listed edition (current or upcoming) whose effective date is not after today.
// A null effective date means "in force, date not located".
export function editionsOn(row, today) {
  const best = new Map();
  for (const e of [...(row.editions || []), ...(row.upcoming || [])]) {
    if (e.effective && e.effective > today) continue;
    const prev = best.get(e.applies_to);
    if (!prev || (e.effective || "") > (prev.effective || "")) best.set(e.applies_to, e);
  }
  return [...best.values()];
}

// Adopted editions not yet in force on `today`.
export function upcomingOn(row, today) {
  return [...(row.editions || []), ...(row.upcoming || [])].filter((e) => e.effective && e.effective > today);
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

export function isFresh(row, today, cadenceDays) {
  if (!row || !row.verified_on || !row.verified_by) return false;
  const age = daysBetween(row.verified_on, today);
  return age >= 0 && age <= cadenceDays;
}

// The NEC edition year a tile's citation names, or null when it cites the NEC
// by section only.
export function tileNecEdition(editionText) {
  const m = /\b(?:NEC|NFPA 70)[ -]?(?:\(NFPA 70\) )?((?:19|20)\d\d)\b|\b((?:19|20)\d\d) (?:NEC|National Electrical Code)\b/.exec(editionText || "");
  return m ? m[1] || m[2] : null;
}

export function citesNec(editionText) {
  return /\bNEC\b|NFPA 70(?![0-9A-Z])/.test(editionText || "");
}

// spec-v1974: the building codes a citation names. The Residential Code is
// matched only with a lettered section or a year, so the Internal Revenue
// Code's "IRC 179" in a tax tile is not taken for it.
const CODE_RES = {
  IRC: /\bIRC(?:\s+(?:19|20)\d\d)?\s+(?:(?:Sections?|Tables?)\s+)?[RMGPEN]\d|\bIRC\s+(?:19|20)\d\d\b|International Residential Code/,
  IBC: /\bIBC\b|International Building Code/, IPC: /\bIPC\b|International Plumbing Code/,
  IMC: /\bIMC\b|International Mechanical Code/, IFGC: /\bIFGC\b|International Fuel Gas Code/,
  IECC: /\bIECC\b|International Energy Conservation Code/,
};
export function codesCited(editionText) {
  const t = editionText || "";
  return Object.keys(CODE_RES).filter((c) => CODE_RES[c].test(t));
}
export function tileCodeEdition(code, editionText) {
  const m = new RegExp("\\b" + code + "\\s+((?:19|20)\\d\\d)\\b").exec(editionText || "");
  return m ? m[1] : null;
}
const FAMILY_NAME = { UPC: "Uniform Plumbing Code", UMC: "Uniform Mechanical Code", "NFPA 54": "National Fuel Gas Code (NFPA 54)" };
const OFFICIAL = " Your state or local building official can tell you which edition applies.";

// The sentence one building code's row shows, or null when no row is drafted
// for that state (an undrafted state shows nothing for that code). Same
// labeling as the NEC: unsigned rows read "not verified", conflicts show none.
export function codeAdoptionLine(code, name, row, tileEdition, today, cadenceDays) {
  if (!row) return null;
  const fresh = isFresh(row, today, cadenceDays);
  const source = { text: row.citation, href: row.source_url };
  if (!fresh && row.review === "conflict") {
    return { verified: false, source, text: "Not verified: the sources we found disagree about which " + code + " edition " + name + " enforces, so none is shown." + OFFICIAL };
  }
  let text;
  if (row.family && row.family !== code && row.family !== "other") {
    text = name + " adopts the " + (FAMILY_NAME[row.family] || row.family) + ", not the " + code + " this calculator follows, so its " + code + " rule may not apply." + (row.scope ? " " + row.scope : "");
  } else if (row.family === "other") {
    // A state code of its own (Wisconsin's Uniform Dwelling Code), not an edition of this one.
    text = name + " enforces a code of its own, not based on the " + code + " this calculator follows, so its " + code + " rule may not apply." + (row.scope ? " " + row.scope : "");
  } else if (row.status === "local") {
    text = name + " adopts no statewide " + code + ": your city or county sets the edition.";
  } else if (row.status === "none") {
    text = name + " has not adopted the " + code + " statewide.";
  } else {
    const parts = editionsOn(row, today).map((e) => code + " " + e.edition + (SCOPE_LABEL[e.applies_to] ? " for " + SCOPE_LABEL[e.applies_to] : "") + (e.effective ? " (since " + prettyDate(e.effective) + ")" : ""));
    text = row.status === "limited"
      ? name + " has a limited state adoption: " + parts.join(" and ") + ". Applies to: " + (row.scope || "the buildings the state rule names.")
      : name + " enforces " + parts.join(" and ") + (row.status === "statewide-amended" ? ", with state amendments." : ".") + (row.scope ? " " + row.scope : "");
    const next = upcomingOn(row, today);
    if (next.length) text += " " + next.map((e) => code + " " + e.edition + " takes effect " + prettyDate(e.effective) + ".").join(" ");
    text += tileEdition ? " This calculator follows " + code + " " + tileEdition + "." : "";
  }
  if (fresh) return { verified: true, source, text };
  const why = row.verified_on ? "past its quarterly recheck" : row.review === "secondary" ? "drafted from secondary sources and not yet checked by a person" : "drafted from the state's own rule and not yet checked by a person";
  return { verified: false, source, text: "Not verified (" + why + "): " + text + OFFICIAL };
}

function editionPhrase(e) {
  const scope = SCOPE_LABEL[e.applies_to] || "";
  return "NEC " + e.edition + (scope ? " for " + scope : "") + (e.effective ? " (since " + prettyDate(e.effective) + ")" : "");
}

const INSPECTOR = " Your state or local electrical inspector can tell you which edition applies.";

// The sentence the row shows for one state. Returns { text, verified,
// source?: { text, href } }. A signed row within its recheck cadence is
// verified; an unsigned or past-recheck row is shown labeled "not verified";
// a missing row or one whose sources conflict never yields an edition.
export function adoptionLine(name, row, tileEdition, today, cadenceDays) {
  if (!row) {
    return { verified: false, text: name + "'s NEC adoption has not been drafted here yet, so no edition is shown." + INSPECTOR };
  }
  const fresh = isFresh(row, today, cadenceDays);
  if (!fresh && row.review === "conflict") {
    return { verified: false, source: { text: row.citation, href: row.source_url },
      text: "Not verified: the sources we found disagree about which NEC edition " + name + " enforces, so none is shown." + INSPECTOR };
  }
  const line = verifiedLine(name, row, tileEdition, today);
  if (fresh) return line;
  const why = row.verified_on ? "past its quarterly recheck"
    : row.review === "secondary" ? "drafted from secondary sources, since there is no state rule to cite, and not yet checked by a person"
    : "drafted from the state's own rule and not yet checked by a person";
  return { verified: false, source: line.source, text: "Not verified (" + why + "): " + line.text + INSPECTOR };
}

function verifiedLine(name, row, tileEdition, today) {
  const tile = tileEdition
    ? " This calculator follows NEC " + tileEdition + "."
    : " This calculator cites NEC sections by name; check them against that edition.";
  const source = { text: row.citation, href: row.source_url };
  if (row.status === "local") {
    return { verified: true, source, text: name + " adopts no statewide NEC: your city or county sets the edition." + (tileEdition ? tile : "") };
  }
  const now = editionsOn(row, today);
  const parts = now.map(editionPhrase);
  let text = row.status === "limited"
    ? name + " has a limited state adoption: " + parts.join(" and ") + ". Applies to: " + (row.scope || "the buildings the state rule names.")
    : name + " enforces " + parts.join(" and ") + (row.status === "statewide-amended" ? ", with state amendments." : ".");
  if (row.status !== "limited" && row.scope) text += " " + row.scope;
  const next = upcomingOn(row, today);
  if (next.length) text += " " + next.map((e) => "NEC " + e.edition + " takes effect " + prettyDate(e.effective) + ".").join(" ");
  return { verified: true, source, text: text + tile };
}

function readState() {
  try { return localStorage.getItem(STATE_KEY); } catch { return null; }
}

function writeState(v) {
  try { if (v) localStorage.setItem(STATE_KEY, v); else localStorage.removeItem(STATE_KEY); } catch { /* storage blocked: the picker still works for this page */ }
}

let _shard = null;
function loadShard() {
  if (!_shard) {
    _shard = fetch("data/legal/code-adoption.json", { credentials: "omit" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return _shard;
}

// Adds the "Your state" row under the reference block's "Source and edition"
// row. Does nothing when the tile does not cite the NEC or the shard has no rows.
export async function mountStatePicker(block, entry, shard) {
  if (!block || !entry) return null;
  const nec = citesNec(entry.edition);
  const cited = codesCited(entry.edition);
  if (!nec && !cited.length) return null;
  const data = shard || (await loadShard());
  const rows = (data && data.by_state) || {};
  const drafted = nec ? Object.keys(rows).filter((k) => k !== "verifiedOn") : [];
  // spec-v1974: building codes with drafted rows, one line each.
  const building = cited.filter((c) => data && data.codes && data.codes[c] && Object.keys(data.codes[c].by_state || {}).length);
  if (!data || !data.names || (drafted.length === 0 && building.length === 0)) return null;

  const row = document.createElement("div");
  row.className = "v6-reference-row v6-reference-row-state";
  const dt = document.createElement("dt");
  dt.className = "v6-reference-term";
  const label = document.createElement("label");
  label.textContent = "Your state's edition";
  label.setAttribute("for", "rl-state-select");
  dt.appendChild(label);
  const dd = document.createElement("dd");
  dd.className = "v6-reference-value";
  const select = document.createElement("select");
  select.id = "rl-state-select";
  select.className = "state-edition-select";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Choose a state";
  select.appendChild(blank);
  for (const [code, name] of Object.entries(data.names).sort((a, b) => a[1].localeCompare(b[1]))) {
    const o = document.createElement("option");
    o.value = code;
    o.textContent = name;
    select.appendChild(o);
  }
  const out = document.createElement("p");
  out.className = "state-edition-line";
  out.setAttribute("aria-live", "polite");
  dd.appendChild(select);
  dd.appendChild(out);
  row.appendChild(dt);
  row.appendChild(dd);

  const tileEdition = tileNecEdition(entry.edition);
  const extra = building.map(() => { const p = document.createElement("p"); p.className = "state-edition-line"; dd.appendChild(p); return p; });
  const write = (host, r) => {
    host.appendChild(document.createTextNode(r.text));
    if (r.source) {
      host.appendChild(document.createTextNode(" Source: "));
      const a = document.createElement("a");
      a.textContent = r.source.text;
      a.setAttribute("href", r.source.href);
      a.setAttribute("rel", "noopener noreferrer");
      a.className = "citation-link";
      host.appendChild(a);
      if (!/\.$/.test(r.source.text)) host.appendChild(document.createTextNode("."));
    }
  };
  const draw = () => {
    out.textContent = "";
    for (const p of extra) p.textContent = "";
    const code = select.value;
    if (!code || !data.names[code]) return;
    building.forEach((c, i) => {
      const r = codeAdoptionLine(c, data.names[code], data.codes[c].by_state[code], tileCodeEdition(c, entry.edition), isoToday(), data.codes[c].cadence_days);
      if (r) write(extra[i], r);
    });
    if (!drafted.length) return;
    const r = adoptionLine(data.names[code], rows[code], tileEdition, isoToday(), data.cadence_days);
    out.appendChild(document.createTextNode(r.text));
    if (r.source) {
      out.appendChild(document.createTextNode(" Source: "));
      const a = document.createElement("a");
      a.textContent = r.source.text;
      a.setAttribute("href", r.source.href);
      a.setAttribute("rel", "noopener noreferrer");
      a.className = "citation-link";
      out.appendChild(a);
      if (!/\.$/.test(r.source.text)) out.appendChild(document.createTextNode("."));
    }
  };
  const saved = readState();
  if (saved && data.names[saved]) select.value = saved;
  select.addEventListener("change", () => { writeState(select.value); draw(); });
  draw();

  const anchor = block.querySelector(".v6-reference-row-edition");
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(row, anchor.nextSibling);
  else {
    const dl = block.querySelector(".v6-reference-list");
    if (!dl) return null;
    dl.appendChild(row);
  }
  return row;
}
