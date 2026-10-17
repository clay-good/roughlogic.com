// spec-v1968 (spec-v106 roadmap pillar 1): "Your state's code edition."
//
// On a tile whose citation names the NEC, the reference block gains one row: a
// state picker and, for the chosen state, the NEC edition that state enforces
// next to the edition the tile follows. The state is kept in one localStorage
// key (`rl-state`), written only when the reader picks one; nothing is sent.
//
// Telling an electrician the wrong enforced edition is worse than saying
// nothing, so this shows ONLY rows a maintainer has signed off (they are the
// only rows data/legal/code-adoption.json carries; scripts/code-adoption.mjs
// builds it from docs/code-adoption-rows.json) and withholds a signed row once
// it is older than its recheck cadence. Until at least one row is signed, the
// picker does not appear at all.
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

function editionPhrase(e) {
  const scope = SCOPE_LABEL[e.applies_to] || "";
  return "NEC " + e.edition + (scope ? " for " + scope : "") + (e.effective ? " (since " + prettyDate(e.effective) + ")" : "");
}

// The sentence the row shows for one state, or a plain "not verified" sentence.
// Returns { text, verified, source?: { text, href } }. A row that is unsigned,
// missing, or past its cadence never yields an edition.
export function adoptionLine(name, row, tileEdition, today, cadenceDays) {
  if (!row) {
    return { verified: false, text: name + "'s NEC adoption has not been verified here yet, so no edition is shown. Your state or local electrical inspector can tell you which edition applies." };
  }
  if (!isFresh(row, today, cadenceDays)) {
    return { verified: false, text: name + "'s NEC adoption is past its quarterly recheck, so it is not shown until it is verified again. Your state or local electrical inspector can tell you which edition applies." };
  }
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
// row. Does nothing when the tile does not cite the NEC or no row is signed.
export async function mountStatePicker(block, entry, shard) {
  if (!block || !entry || !citesNec(entry.edition)) return null;
  const data = shard || (await loadShard());
  const rows = (data && data.by_state) || {};
  const signed = Object.keys(rows).filter((k) => k !== "verifiedOn");
  if (!data || !data.names || signed.length === 0) return null;

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
  const draw = () => {
    out.textContent = "";
    const code = select.value;
    if (!code || !data.names[code]) return;
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
