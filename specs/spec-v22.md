# roughlogic.com Specification v22 — Citation Integrity II (Concrete Findings Register)

> **Implementation status: LANDED (2026-06-05).** Every CF-NN finding is
> fixed with a red-then-green regression test in
> `test/unit/v22-citation-integrity.test.js`. **CF-01:** the eight enumerated
> tiles (plus four more electrical-group tiles the new relevance gate caught,
> twelve total) now carry domain-appropriate edition notes; the
> edition-note-relevance assertion in `check-citation-coverage.mjs` fails on
> any disclosure constant attached to a tile that does not cite its standard.
> **CF-02/CF-03:** the four passed-`next_expected` cycle rows (NEC, ASHRAE
> 62.1/62.2/90.1, AASHTO) are re-verified — NEC advanced to the published 2026
> edition (disclosed-lag, `NEC_DISCLOSURE` now names 2026), the rest re-stamped
> `last_verified: 2026-06-05`; the freshness gate now **fails** on a passed
> date with no re-stamp and on any tracked source missing a ledger row.
> **CF-04:** ICC 2021-vs-2024 recorded as disclosed-lag in the ledger.
> **CF-05/CF-06:** `movable-type.co.uk` and `convertit.com` reworded to
> whitelisted durable hosts; a link-hygiene check guards recurrence.
> **CF-08:** the worst long URLs shortened to bare host plus prose, and the
> `.citation-link { overflow-wrap: anywhere }` 320px guard confirmed (every
> shell passes the full-catalog `check-shell-mobile` audit). **CF-09:** the
> spelled-out `<number> percent` / `in dollars` prose reworded to `%` / `(USD)`
> with a guarding regex. The §5 freshness ledger
> [../docs/citation-freshness-ledger.md](../docs/citation-freshness-ledger.md)
> lists all 13 tracked sources with a status. The CF-07 (raw URL schemes) and
> CF-10 (non-ASCII artifacts) classes were re-confirmed clean. Package stamps
> **0.22.0**.
>
> v22 is the findings-and-fix register that closes the loop opened by
> spec-v19. v19
> defined the citation-integrity guarantee — every public tile cites
> **inline** (in view and in the clipboard export), **current** (edition
> and asOf checked against the source's publication cycle), and
> **well-formatted and well-wrapped** (every URL linkifies, nothing
> overflows a 320px phone) — and specified the three gates that enforce it.
> v22 is the result of actually auditing the citation surface
> (`citations.js`, 5,059 lines; `scripts/sources-cycle.json`; the
> `data/*/manifest.json` edition stamps) and **enumerating every concrete
> issue it found**, each with its category, location, exact offending text,
> and prescribed fix. v22 ships **no new tiles**. Every prior constraint
> holds: US standards only, no paywalled lookup bundled, no new dependency,
> no telemetry. Package stamps **0.22.0** at the close of v22.
>
> v22 inherits everything from spec.md, spec-v2.md … spec-v21.md. It does
> not redefine the citation model — it consumes the v19 gates and reports
> what they must catch. v22 lands after v21's contract sweep is green, so a
> citation block that is being reworded for wrapping is reworded on a tile
> whose math is already hardened.

> Foreword. The number is the easy part; the citation is the product. v19
> made that argument and built the gates. v22 is the day someone read all
> four hundred and thirty-seven reference blocks and the cycle table behind
> them, looking for the four ways the promise quietly breaks: a stale
> edition cited with a straight face, a dead or un-clickable link, a block
> that runs off the right edge of a phone, and prose that drifts from the
> house voice. The audit found one genuinely embarrassing class — eight
> tiles in five unrelated trades displaying the **NEC ampacity disclosure**
> as their edition note, so a wastewater operator and a pesticide
> applicator are both told to "verify the NEC edition adopted by your AHJ"
> on a tile that has nothing to do with the NEC. It found a cycle table
> that has silently fallen behind its own refresh dates. And it found a
> handful of URLs long enough to break a 320px layout. None of it is fatal;
> all of it is the difference between a citation a licensing board trusts
> and one it raises an eyebrow at. v22 fixes each.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. The headline defect: cross-contaminated edition notes

The audit's single highest-value finding is a content defect, not a
formatting one, and it is graded **S1** (a user sees wrong governance
text):

**CF-01 — Eight non-electrical tiles display `NEC_DISCLOSURE` as their
`editionNote`.** The constant
`NEC_DISCLOSURE = "Editions available: bundled values follow NEC 2023.
Jurisdictions on NEC 2017 / 2020 use slightly different ambient
corrections and ampacity ranges; verify the edition adopted by your AHJ."`
is assigned verbatim to eight tiles that have nothing to do with the NEC:

| Tile id | Trade / authority | Why the NEC note is wrong here |
|---------|-------------------|--------------------------------|
| `noise-dose` | OSHA 29 CFR 1910.95 | Occupational noise — no NEC, no ampacity |
| `svi-sludge-index` | Wastewater / Standard Methods | Sludge settleability — no NEC |
| `sprayer-calibration` | Pesticide / EPA label | Application rate — no NEC |
| `thi-livestock` | Livestock heat stress / USDA | Temperature-humidity index — no NEC |
| `lightning-countdown` | NOAA 30-30 rule | Flash-to-bang timing — no NEC |
| `excavation-bench-plan` | OSHA 29 CFR 1926 Subpart P | Trench protection — no NEC |
| `nfpa-1142-water-supply` | NFPA 1142 | Rural water supply — wrong NFPA document |
| `scba-cylinder-time` | NFPA / air management | Breathing-air duration — no NEC |

Each renders, in its in-view reference block and its clipboard export, the
NEC's "2017 / 2020 ambient corrections and ampacity ranges" disclosure.
This is the v19 §3 currency promise inverted: the edition note is not
stale, it is *foreign* — it discloses the wrong standard's edition
entirely. *Fix:* give each tile a domain-appropriate single-edition or
"single-edition (physical fact / agency guidance)" note, drawn from the
governance/edition vocabulary the relevant group already uses (OSHA tiles
get the OSHA-edition note, the NFPA-1142 tile gets the NFPA-1142
disclosure, the NOAA/USDA tiles get a single-edition agency-guidance
note). *Gate:* extend `check-citation-coverage.mjs` §2.2 required-field
check with an **edition-note relevance** assertion — a tile whose
`formula`/`governance` names no NEC/NFPA-70 reference may not carry
`NEC_DISCLOSURE` (and, generalized, an `editionNote` constant may not be
attached to a tile that cites none of that constant's standards). This
catches the whole class, not just these eight.

## 2. Currency — the cycle table has fallen behind its own dates

v19 §3 holds that a *disclosed* lag is acceptable (jurisdictions lag) but
a *silent* stale edition is a defect, and §3.3 requires a freshness ledger
so "we forgot to check this one" is impossible. The audit found that the
reference the freshness gate trusts — `scripts/sources-cycle.json` — is
itself stale, which means the gate cannot be doing its job.

**CF-02 — `sources-cycle.json` has passed `next_expected` dates with no
rollover** (S2; the table is the source of truth the gate reads).
`_updated: "2026-05-10"`, yet as of 2026-06-05 several rows are past their
own next-release estimate and still list the prior edition:

- **NEC (NFPA 70):** `next_expected: 2025-08` has passed; `current_edition`
  still `"2023"`. NEC 2026 is on its published cycle. `citations.js`
  bundles `NEC_2023`. *Fix:* verify NEC 2026 publication, advance the
  cycle row, and re-audit the `NEC_2023` constant (disclose 2026 as the
  newer adopted edition while the bundled values follow whichever edition
  the values were derived from — the v19 §3.1 disclosed-lag pattern).
- **AASHTO Green Book:** `next_expected: 2025-10` passed; table still
  `"2018 (7th ed.)"`. Citations cite "7th ed." *Fix:* confirm 8th-edition
  status; update the row and the citing tiles' edition strings.
- **ASHRAE 62.1 / 62.2 / 90.1:** `next_expected: 2025-10 / 2025-12`
  passed; table still `"2022"`. Citations bundle `ASHRAE 62.1-2022` /
  `ASHRAE 90.1-2022`. *Fix:* verify the 2025 editions; update the rows and
  the head constants (`ASHRAE_62_1`, the 90.1 constant) once confirmed.

**CF-03 — The freshness gate is not catching CF-02** (S1 process defect).
That `_updated` is 2026-05-10 while four standards rolled past their dates
unflagged means `check-citation-freshness.mjs` either is not being run in
the gate or is comparing against the stale `current_edition` rather than a
calendar check on `next_expected`. *Fix:* per v19 §3.2, the freshness gate
**fails** when a tracked source's `next_expected` is in the past and the
row has not been re-confirmed (a passed date demands either a new edition
or an explicit "verified, not yet released" re-stamp). This is the
mechanism that makes CF-02 self-reporting next cycle.

**CF-04 — ICC I-codes bundle 2021 while current is 2024 (disclosed-lag,
acceptable, schedule refresh)** (S3). `IRC_2021` / `IBC_2021` / `IMC_2021`
/ `IPC_2021` / `IFGC_2021` and every citing tile trail the 2024 cycle by
one edition. The disclosures (`IPC_DISCLOSURE`, `IRC_DISCLOSURE`,
`IBC_DISCLOSURE`) **do name 2024 as the newer adopted edition**, so this
is correctly disclosed lag, not a silent defect. *Disposition:* no urgent
fix; v22 records it in the freshness ledger (§5) with status
`disclosed-lag` and schedules a 2024 I-code value refresh as its own
future pass (a value refresh is a data change, out of v22's citation-text
scope).

**Verified current / well-disclosed (no defect):** FDA Food Code 2022
(disclosed), WMM2025 (expiry-dated), NFPA 14-2024 (disclosed), NFPA 70E-2024,
IICRC S520-2024, FHFA/HUD FY2026 limits, IRS current-year publications.

## 3. Formatting and wrapping

### 3.1 Link integrity

**CF-05 — `movable-type.co.uk` will not linkify** (`bearing-conversion`
neighborhood, S2). The `CITATION_LINK_RE` whitelist matches only
`gov|org|com|edu|net|mil|int`, so the `.co.uk` domain in
`freeAccess: "Free in navigation texts and at Movable Type Scripts
(movable-type.co.uk)."` renders as dead plain text. It is the only
`.co.uk` in the file. *Fix:* reword to a whitelisted mirror (the same
haversine/great-circle references are free at `nist.gov` / university OCW
and in any navigation text), or — lower preference — extend the regex to
handle `co.uk`; rewording is cleaner and avoids widening the linkifier for
one domain.

**CF-06 — `convertit.com` is a defunct/dubious host for Abramowitz &
Stegun (AMS 55)** (S2). `freeAccess: "AMS 55 is public domain; free at
convertit.com and nist.gov/pml."` cites a host that appears nowhere else
and is not a durable authority for A&S. *Fix:* drop `convertit.com`; AMS
55 / DLMF is authoritatively free at `dlmf.nist.gov` and `nist.gov/pml`,
both already present. Keep the NIST pointers.

**CF-07 — raw URL scheme literals: CLEAN.** No citation *data* field
carries a literal `http://`/`https://`; the only `https://` in the file is
in the linkify renderer (`a.setAttribute("href", "https://" + token)`),
which is correct. No glued-punctuation breakage either — the link regex's
path group stops before trailing `.`/`;`/`)`, so domains followed by
sentence punctuation linkify with the punctuation left outside the anchor.
Recorded as verified-clean per v19's "report only real issues" discipline.

### 3.2 320px overflow

**CF-08 — Long single-token URLs force horizontal scroll at 320px** (S1 on
the most important viewport — a phone in the field; the v18 §6 / v19 §4.2
gate target). These render as one unbreakable `<a>` with no space or break
opportunity:

| Location (tile / constant) | URL token (approx length) |
|---|---|
| `ASHRAE_FREE` constant + the ASHRAE 62.1 ventilation tile | `ashrae.org/technical-resources/standards-and-guidelines/read-only-versions-of-ashrae-standards` (~84) |
| FRCP / deadline tile | `uscourts.gov/rules-policies/current-rules-practice-procedure/federal-rules-civil-procedure` (~70) |
| equine/heartworm tile | `heartwormsociety.org/veterinary-resources/american-heartworm-society-guidelines` (~71) |
| HUD FMR tile | `huduser.gov/portal/datasets/fmr/fmrs/FY2026_code/select_Geography.odn` (~62) |
| FAA handbook tiles (several) | `faa.gov/regulations_policies/handbooks_manuals` (~46) |
| FDA Food Code tiles | `fda.gov/food/retail-food-protection/fda-food-code` (~49) |
| VA loan-limit tile | `benefits.va.gov/homeloans/purchaseco_loan_limits.asp` (~52) |

*Fix (preferred):* shorten the linkified token to the **bare host**
(`ashrae.org`, `uscourts.gov`, `heartwormsociety.org`, `huduser.gov`,
`faa.gov`, `fda.gov`, `va.gov`) and move the path into the following prose
as plain words ("…the read-only ASHRAE standards page at ashrae.org"),
which both linkifies cleanly and wraps. *Fix (belt-and-suspenders):*
confirm `.citation-link { overflow-wrap: anywhere; }` so any future long
token breaks rather than scrolls. The v19 §4.2 assertion rides on v18's
`check-shell-mobile.mjs`; v22 adds these specific strings as the regression
fixtures the 320px audit must pass.

### 3.3 Prose conventions

**CF-09 — Spelled-out "percent" / "dollars" where the house convention is
`%` / digits** (S3; global CLAUDE.md §5). Confirmed instances (all in
assumption `value` or `editionNote` prose):

- `"O2 must be maintained between 19.5 and 23.5 percent"` → `19.5%–23.5%`
  (confined-space O₂, OSHA 1910.146 assumption).
- `"fires at > 8 percent"` → `> 8%` (severe-dehydration flag).
- `"PCV above 35 percent … donor PCV below 35 percent"` → `35%`
  (vet transfusion edition note).
- `"1.5 to 2.5 percent of body weight"` (×2, equine feeding formula +
  assumption) → `1.5%–2.5%`.
- `"One discount point typically costs 1 percent of the loan"` → `1%`
  (mortgage-point edition note).
- `"~60 percent of vested" / "default 60 percent of vested balance"` →
  `60%` (mortgage-reserves note + assumption).
- `"differs … by roughly 5 percent" / "by ~5 percent"` → `5%`
  (readability syllable-counter notes).
- `"-20 to 50 C / 0 - 100 percent RH"` → `0%–100% RH` (acoustics
  validity-envelope note).
- `"rate per mile in dollars"` → `"rate per mile (USD)"` or `"$/mi"`
  (mileage assumption).

*Disposition:* reword each to the numeric convention. A few uses where
"percent" is a label word reading as prose ("…expressed as a percent")
are left alone — the gate targets `<number> percent`, not the bare noun.
*Gate:* extend the `check-ngrams.mjs` banned-ngram list (v19 §4.3) with the
`/\d+(\.\d+)?\s+percent\b/` and `\bin dollars\b` patterns so the class
cannot reappear.

**CF-10 — Non-ASCII artifacts: CLEAN.** Every non-ASCII glyph in the file
is a legitimate math symbol (`°`, `√`, `≤`, `≥`, `×`, `Σ`, `∝`, `ρ`, and
the U+2212 minus in formula strings). No curly-quote or smart-apostrophe
artifact, and no marketing adjective in any `freeAccess` field (checked
best/leading/easy/powerful/comprehensive). Recorded as verified-clean.

## 4. Reusable-constant hygiene (v19 §4.4)

CF-01 is the acute symptom of a latent hygiene gap: an `editionNote`
constant can be attached to a tile that cites none of that constant's
standards, and nothing catches it. CF-02 is the dual: an edition string
lives in a head constant (`NEC_2023`, `ASHRAE_62_1`) so a rollover is a
one-line edit — but only if no tile has drifted to an inline copy. v22
confirms (and the §6 link gate asserts) that (a) every `editionNote`
constant is used only on tiles whose `formula`/`edition`/`governance`
names the matching standard, and (b) no tile carries an inline edition
string that duplicates a head constant — the single constant stays the
edit point for the next NEC/ICC/ASHRAE rollover.

## 5. Freshness ledger (v19 §3.3, now populated)

v22 creates and populates `docs/citation-freshness-ledger.md`: one row per
tracked source in `sources-cycle.json` with `edition cited / current
edition / asOf / status ∈ {current | disclosed-lag | acknowledged-stale}`.
The CF-02 sources land as `acknowledged-stale` with a dated re-verify
action; CF-04 (ICC 2021 vs 2024) lands as `disclosed-lag`; the verified
set in §2 lands as `current`. The freshness gate (§6) fails on any tracked
source absent from the ledger, making the CF-03 blind spot structurally
impossible to repeat.

## 6. Gates (graduated and extended per the v14 §16 ratchet)

- `check-citation-coverage.mjs` — adds the **edition-note relevance**
  assertion (CF-01 / §4): a tile may not carry an `editionNote` constant
  whose standard it does not cite.
- `check-citation-freshness.mjs` — adds the **passed-`next_expected`
  fails** rule (CF-03) and the **ledger-completeness fails** rule (CF-02 /
  §5): every tracked source must have a ledger row, and a past release date
  without a re-stamp is a failure.
- `check-citation-links.mjs` — the v19 §4.1 link gate now asserts every
  domain token matches the linkifier whitelist (catches CF-05), flags a
  domain that resolves to no plausible recurring US-authority host (CF-06),
  and flags an inline edition string duplicating a head constant (§4).
- `check-shell-mobile.mjs` — the v18 320px audit gains the CF-08 long-URL
  strings as named regression fixtures (v19 §4.2).
- `check-ngrams.mjs` — gains the CF-09 `<number> percent` / `in dollars`
  patterns.

Each starts report-only for one commit to surface the full backlog, then
graduates to fail once cleared, per the ratchet.

## 7. Acceptance

v22 is complete when: (a) the eight CF-01 tiles carry a domain-appropriate
edition note and the relevance gate is green; (b) the CF-02 cycle rows are
re-verified and advanced (or re-stamped "verified, not yet released"), the
CF-03 passed-date rule is live, and the freshness gate is green; (c) the
freshness ledger lists every tracked source with a status, CF-04 recorded
as disclosed-lag; (d) CF-05 and CF-06 links resolve to whitelisted,
durable US-authority hosts and the link gate is green; (e) no reference
block overflows at 320px against the CF-08 fixtures; (f) the CF-09 prose is
reworded and the ngram gate is green; (g) the five gates above are
graduated to fail-on-missing; (h) the v22 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records, per category, the
counts fixed (8 foreign edition notes, 4 stale cycle rows, 2 dead/bare
links, 7 overflowing URLs, 9+ prose reworks); (i) package stamps 0.22.0.

## 8. Out of scope for v22

- The CF-04 ICC-2024 value refresh (a data change to bundled defaults, not
  a citation-text change — its own future pass).
- Bundling any paywalled or fast-moving lookup to manufacture freshness
  (v19 §3.4 reaffirmed: user-supplied current rates stay user-supplied).
- Network-fetch link-liveness at build time (deterministic-build rule;
  liveness stays the quarterly manual ledger check).
- New tiles and their citations (v23 — each v23 tile is born with a
  complete, inline, current, well-wrapped citation that inherits these
  gates rather than reopening them).

## 9. Closing note

v19 made the citation the product and built the gates. v22 read every
promise the gates are supposed to protect and found the catalog mostly
honest — links clean of raw schemes, no smart-quote rot, the hardest
currency cases correctly disclosed — with one genuinely wrong class (eight
trades wearing the electrician's edition note), a cycle table that drifted
behind its own calendar, and a handful of URLs too long for a phone. Each
is now a one-line fix and a gate that won't let it recur. The professional
who finds the site by typing six words into a search engine gets a
provenance a licensing board, a building inspector, a CPA, or a judge can
trust — and the next time NEC rolls, the freshness gate says so before a
user does.
