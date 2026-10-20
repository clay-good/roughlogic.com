// spec-v1973: when the edition a reader works under would change the answer.
//
// One row per (tile, code), each read in both editions' text: what the rule
// is now and what it was. A tile with no row says nothing, because an absent
// row is not evidence of an unchanged rule. The rows came from the I-code
// refresh of 2026-10-17, which read the IRC, IBC, IPC and IECC printings side
// by side and gave these tiles an edition input that runs either rule. No NEC
// row is asserted: each needs both editions' text quoted first.
export const EDITION_ROWS = [
  { id: "allowable-area", code: "IBC", from_edition: 2021, to_edition: 2027, also_older: [2024], section: "Table 506.3.3", input: "code_edition",
    changed: "Frontage increase factors are read from Table 506.3.3 as printed; interpolating between its rows and columns is no longer allowed.",
    older_rule: "IBC 2021 (and 2024) footnote a allowed interpolating Table 506.3.3 between rows and columns.",
    verified_on: "2026-10-17", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IBC 2021 Table 506.3.3, footnote a" }, { edition: 2027, citation: "IBC 2027 Table 506.3.3" }] },
  { id: "smoke-alarm-placement", code: "IRC", from_edition: 2021, to_edition: 2024, section: "R310.3.1", input: "code_edition",
    changed: "Alarms stay 10 ft from a cooking appliance whatever their sensing type; 6 ft only where 10 ft would block a required location.",
    older_rule: "IRC 2021 R314.3.1: 20 ft ionization, 10 ft ionization with a silencing switch, 6 ft photoelectric.",
    verified_on: "2026-10-17", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IRC 2021 R314.3.1" }, { edition: 2024, citation: "IRC 2024 R310.3.1" }] },
  { id: "roof-drain-sizing", code: "IPC", from_edition: 2021, to_edition: 2027, section: "Tables 1106.2.3.1(1)-(3)", input: "code_edition",
    changed: "Horizontal storm drains are sized from one table per pipe material; aged cast iron carries about two thirds of the 2021 figure.",
    older_rule: "IPC 2021 Table 1106.2: one horizontal storm drain table for every material.",
    verified_on: "2026-10-17", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IPC 2021 Table 1106.2" }, { edition: 2027, citation: "IPC 2027 Tables 1106.2.3.1(1) to (3) and 1106.2.4" }] },
  { id: "grease-trap", code: "IPC", from_edition: 2021, to_edition: 2027, section: "1003.3.7 to 1003.3.11",
    changed: "Grease storage can be sized from meals served per day (Table 1003.3.8), which this calculator adds when meals are entered.",
    older_rule: "IPC 2021 had no meals-based grease storage sizing; the retention table was the same.",
    verified_on: "2026-10-17", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IPC 2021 Section 1003.3.5.1" }, { edition: 2027, citation: "IPC 2027 Sections 1003.3.7 to 1003.3.11 and Table 1003.3.8" }] },
  { id: "fireplace-clearance-check", code: "IRC", from_edition: 2021, to_edition: 2024, section: "R1001.11 Exception 3", input: "code_edition",
    changed: "Sheathing and trim may abut the sidewalls 8 in from the firebox lining for an opening under 6 sq ft (12 in at 6 sq ft or more).",
    older_rule: "IRC 2021 R1001.11 Exception 3: 12 in from the firebox lining for every opening.",
    verified_on: "2026-10-20", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IRC 2021 R1001.11, Exception 3" }, { edition: 2024, citation: "IRC 2024 R1001.11, Exception 3" }] },
  { id: "lighting-density", code: "IECC", from_edition: 2021, to_edition: 2024, section: "Table C405.3.2(1)", input: "code_edition",
    changed: "Lower lighting power allowances: office 0.64 to 0.62, retail 0.84 to 0.78, school 0.72 to 0.70 W per sq ft.",
    older_rule: "IECC 2021 Table C405.3.2(1), the same values as ASHRAE 90.1-2019 Table 9.5.1.",
    verified_on: "2026-10-17", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IECC 2021 Table C405.3.2(1)" }, { edition: 2024, citation: "IECC 2024 Table C405.3.2(1)" }] },
  { id: "blower-door-ach50", code: "IECC", from_edition: 2021, to_edition: 2024, section: "R402.5.1.3",
    changed: "The prescriptive air leakage limit is 4.0 ACH50 in climate zones 0-2, 3.0 in 3-5 and 2.5 in 6-8.",
    older_rule: "IECC 2021 R402.4.1.3: 5.0 ACH50 in climate zones 0-2 and 3.0 in zones 3-8.",
    verified_on: "2026-10-17", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IECC 2021 R402.4.1.3" }, { edition: 2024, citation: "IECC 2024 R402.5.1.3" }] },
  { id: "duct-leakage-cfm25", code: "IECC", from_edition: 2021, to_edition: 2024, section: "Table R403.3.8", input: "code_edition",
    changed: "Duct leakage limits depend on ducted returns and location: 4 or 6 CFM25 per 100 sq ft with 3 or more returns.",
    older_rule: "IECC 2021 R403.3.6: 4 CFM25 per 100 sq ft (3 at rough-in without the air handler), 8 with ducts inside.",
    verified_on: "2026-10-17", verified_by: "rl",
    sources: [{ edition: 2021, citation: "IECC 2021 R403.3.6" }, { edition: 2024, citation: "IECC 2024 Table R403.3.8" }] },
];

// The editions a row's older rule covers: from_edition, plus any later edition
// printed before the change (`also_older`, e.g. IBC 2024 kept the 2021 footnote).
export function olderEditions(row) {
  return [row.from_edition].concat(Array.isArray(row.also_older) ? row.also_older : []);
}

// The sentence for a reader working under `working`, or null when it is on the
// same side of the change as the edition the tile follows.
export function sensitivityLine(row, working) {
  const w = Number(working);
  if (!row || !Number.isFinite(w) || w > Math.max(...olderEditions(row))) return null;
  return "This calculator follows " + row.code + " " + row.to_edition + ", and the rule it applies changed after " + row.code + " " + w + " (" + row.section + "): "
    + row.changed + " The older rule: " + row.older_rule
    + (row.input ? " Set the calculator's edition input to " + row.from_edition + " to run the older rule." : "")
    + " Confirm the edition with your building official.";
}

// Adds a "Working under an older edition?" row under the reference block's
// edition row, for a tile that has a sensitivity row. Does nothing otherwise.
export function mountEditionChanges(block, toolId) {
  const rows = EDITION_ROWS.filter((r) => r.id === toolId);
  if (!block || !rows.length) return null;
  const host = document.createElement("div");
  host.className = "v6-reference-row v6-reference-row-sensitivity";
  const dt = document.createElement("dt");
  dt.className = "v6-reference-term";
  const label = document.createElement("label");
  label.textContent = "Working under an older edition?";
  label.setAttribute("for", "rl-edition-older");
  dt.appendChild(label);
  const dd = document.createElement("dd");
  dd.className = "v6-reference-value";
  const select = document.createElement("select");
  select.id = "rl-edition-older";
  const opts = [{ value: "", text: "No, " + rows.map((r) => r.code + " " + r.to_edition).join(" / ") }]
    .concat(rows.map((r, i) => ({ value: String(i), text: "Yes, " + r.code + " " + olderEditions(r).join(" or ") })));
  for (const o of opts) { const el = document.createElement("option"); el.value = o.value; el.textContent = o.text; select.appendChild(el); }
  const out = document.createElement("p");
  out.className = "state-edition-line";
  out.setAttribute("aria-live", "polite");
  select.addEventListener("change", () => {
    const r = rows[Number(select.value)];
    out.textContent = select.value === "" || !r ? "" : sensitivityLine(r, r.from_edition);
  });
  dd.appendChild(select);
  dd.appendChild(out);
  host.appendChild(dt);
  host.appendChild(dd);
  const anchor = block.querySelector(".v6-reference-row-edition");
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(host, anchor.nextSibling);
  else {
    const dl = block.querySelector(".v6-reference-list");
    if (!dl) return null;
    dl.appendChild(host);
  }
  return host;
}
