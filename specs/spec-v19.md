# roughlogic.com Specification v19 — Citation Integrity Sweep

> **Implementation status: CLOSED (2026-06-08).** v19 is the second
> of the three-spec set (v18 hardening, v19 citation integrity, v20
> catalog expansion). It inherits everything from spec.md through
> spec-v18.md and lands after v18's contract sweep is green. v19 ships
> **no new tiles**. It makes one guarantee true for every public tile:
> the citation is **inline** (rendered in the tile view and carried into
> the clipboard export), **current** (edition and asOf checked against the
> source's publication cycle), and **well-formatted and well-wrapped**
> (every URL linkifies, no field overflows the viewport, governance and
> edition-disclosure present per the v6 reference-block discipline). Every
> prior constraint holds: US standards only, no paywalled lookup bundled,
> no new dependency, no telemetry.
>
> **How v19 closed.** The *substance* of the sweep — the actual audit of
> all 515 reference blocks and the cycle table behind them — landed as
> **spec-v22 (Citation Integrity II, LANDED 2026-06-05)**, the concrete
> findings register that "closes the loop opened by spec-v19": the §3.3
> freshness ledger ([../docs/citation-freshness-ledger.md](../docs/citation-freshness-ledger.md))
> now lists every tracked source with a `current | disclosed-lag |
> acknowledged-stale` status (CF-02/CF-04); the §4.1 link-integrity and
> §4.4 reusable-constant-hygiene checks landed inside
> `check-citation-coverage.mjs` (CF-01 edition-note relevance, CF-05/CF-06
> host hygiene) and `check-citation-freshness.mjs` (CF-03 passed-date
> re-stamp); the §4.2 320px wrapping rides on v18's `check-shell-mobile.mjs`
> (CF-08); the §4.3 prose conventions are guarded by the CF-09 ngram regex.
> The one piece that remained genuinely open — the **§2.1/§2.2 coverage-gate
> graduation** — landed 2026-06-08: `check-citation-coverage.mjs` now
> **fails** on any tile missing a citation entry, any orphan entry, any
> entry missing one of the four required fields (`formula` / `edition` /
> `freeAccess` / `governance`), and any field carrying a raw `http(s)://`
> scheme (§4.1). Coverage stands at **515 / 515** with all four required
> fields present, so the gate graduated at its floor (the v14 §16 ratchet
> convention). A unit-layer pin lives in
> `test/unit/v19-citation-coverage.test.js`. Rather than add the
> separately-named `check-citation-links.mjs` from §6 — which would
> duplicate the link gate v22 already folded into
> `check-citation-coverage.mjs` — v19 keeps the single source of truth.
> Package stays at the v18 stamp; the 0.19.0 the spec named was already
> passed by v20–v23, so the close rides the **0.24.2** patch stamp (a
> re-stamp would be a semver regression, as v18 §7 and v20 also noted).

> Foreword. The promise the site makes is not "here is a number." Every
> calculator on the internet hands you a number. The promise is "here is a
> number, here is the formula it came from, here is the published
> authority that formula traces to, here is where you can read that
> authority for free, and here is what governs when this estimate and the
> real world disagree." That promise is the entire product. A tile with a
> stale edition, a dead link, a citation that names the wrong section, or
> a reference block that runs off the right edge of a phone screen has
> quietly broken the only promise that distinguishes this site from a
> thousand ad-choked calculators. v19 is the spec that audits all four
> hundred and thirty-seven promises and repairs every broken one.

Repository: github.com/clay-good/roughlogic.com

US standards only.

## 1. Inheritance and the citation model as it stands

v19 inherits the v6 reference-block discipline, the v10 §3 citation-
freshness and citation-strings lint, and the v14 §11.2 citation-coverage
round-trip. The model today:

- Each tile has an entry in `citations.js` shaped
  `{ formula, edition, freeAccess, governance, editionNote, assumptions[] }`,
  where `assumptions[]` is `{ name, value, source? }`.
- `renderCitationBlock(sources, id)` builds the in-view `Reference`
  section (formula / edition / free access / governance / edition note)
  plus a `Numeric assumptions` list; `buildAnswerWithReference` produces
  the plain-text clipboard form.
- `fillCitationText()` linkifies bare domains via `CITATION_LINK_RE`,
  wrapping `nfpa.org`, `ecfr.gov`, `irs.gov/forms-pubs`, etc. as
  `citation-link` anchors with `rel="noopener noreferrer"`.
- `check-citation-coverage.mjs` builds the tile↔source inverse map and
  **warns** (does not fail) when a tile has no citation entry.
- `check-citation-freshness.mjs` warns when a `data/<folder>/manifest.json`
  `edition` lags the current edition in `scripts/sources-cycle.json` by
  more than one cycle, or its `asOf` is >365 days old.

v19 does three things: closes the coverage gap to **fail-on-missing**,
turns freshness warnings into a **resolved/acknowledged** ledger, and
adds a **formatting/wrapping** gate the model does not yet have.

## 2. Inline-presence audit (every tile cites, in view and in copy)

**Goal.** 100% of public tiles render a non-empty reference block in the
tile view and carry it into the clipboard export.

**2.1 Coverage to fail-on-missing.** `check-citation-coverage.mjs`
graduates from warn to **fail** on any tile in `tools-data.js` lacking a
`citations.js` entry, and on any orphan `citations.js` entry whose id is
not a live tile. This matches how the v10 worked-example and v14 bounds
gates graduated once coverage hit 100%.

**2.2 Required fields.** Every entry must carry a non-empty `formula`,
`edition`, `freeAccess`, and `governance`. `editionNote` is required for
any tile whose result depends on a code/standard edition (it names the
bundled edition and tells the user to confirm the AHJ-adopted one);
`assumptions[]` is required for any tile that applies a default the user
did not enter (every default the math uses appears as a named assumption
with a `source`). The coverage gate asserts these.

**2.3 Inline render, not a footnote.** The reference block renders in the
tile view by default (not behind a disclosure the user must open), and
`buildAnswerWithReference` includes formula, edition, free-access,
governance, edition note, and every assumption in the copied text. A
v19 render test asserts both surfaces contain the citation for a sampled
tile per group.

## 3. Currency audit (no tile cites a superseded edition silently)

**Goal.** Every cited edition is either current, or visibly disclosed as
a prior edition the user must confirm against their AHJ.

**3.1 Edition sweep.** For every tracked standard in
`scripts/sources-cycle.json` (NEC, NFPA 13/14/54/1142, IPC, IRC/IBC,
ASHRAE, ACCA, ASCE, IRS publications, 14 CFR, FRCP, USDA NRCS, EPA, AWWA,
WMM, …), v19 confirms the `edition` strings in `citations.js` and the
companion `data/*/manifest.json` files name the current edition, or carry
an `editionNote` that explicitly discloses the bundled edition and directs
the user to verify the locally adopted one. A silent stale edition is a
defect; a disclosed prior edition is acceptable (jurisdictions lag).

**3.2 asOf re-stamp.** Any `manifest.json` `asOf` older than its
folder's `refresh-cadence.json` window is re-verified against the source
and re-stamped, or its staleness is acknowledged in the freshness ledger
(§3.3) with a reason (e.g., "rate unchanged since last publication").
`check-citation-freshness.mjs` continues to **fail** on a missing
`edition`/`asOf` and on a past-expiration WMM.

**3.3 Freshness ledger.** v19 introduces
`docs/citation-freshness-ledger.md`: one row per tracked source with the
edition cited, the current edition, the asOf, and a
`current | disclosed-lag | acknowledged-stale` status. The freshness gate
fails on any source not present in the ledger, making "we forgot to check
this one" impossible. This is the audit-trail analogue for citations.

**3.4 User-supplied current values stay user-supplied.** v19 reaffirms
the spec-v12 §H rule: any value that requires a current rate, bracket, or
wage base (IRS brackets, SS wage base, mileage rate, FUTA credit-reduction
states, state prejudgment-interest rates, garnishment maxima) is
user-supplied or a declared state/year-keyed shard with its own
`refresh_cadence`. v19 does **not** bundle a paywalled or
frequently-changing lookup to "freshen" a citation; it discloses and
defers, as the site always has.

## 4. Formatting and wrapping audit (the new gate)

**Goal.** Every citation field is linkified where it names a domain,
wraps cleanly on a 320px phone, and reads as clean American-English prose
with the site's numeric conventions.

**4.1 Link integrity.** A new `check-citation-links.mjs`:
- Parses every `citations.js` string field through the live
  `CITATION_LINK_RE` and asserts every domain-looking token actually
  matches and linkifies (catches a domain the regex silently misses — a
  trailing punctuation or an unusual TLD that leaves a bare,
  non-clickable URL in the rendered block).
- Flags any field containing a raw `http://`/`https://` literal (the
  convention is bare domains, linkified at render — a literal scheme
  means the regex will mangle it).
- Flags duplicate or contradictory domains within one field, and any
  domain that does not resolve to a plausible US authority host the site
  already cites elsewhere (a typo'd TLD).
- Does **not** make a network request (deterministic-build rule); link
  *liveness* is a manual quarterly check noted in the ledger, not a
  build-time fetch.

**4.2 Wrapping / overflow.** Tying into the v18 §6
`check-shell-mobile.mjs` 320px audit, v19 asserts the rendered reference
block — the longest `formula`/`edition`/`governance` strings and the
`assumptions` values — does not force horizontal scroll at 320px. Long
citations wrap; URLs break at the linkified boundary; no field is a
single unbreakable token. Where a field overflows, it is reworded or the
CSS `overflow-wrap` is confirmed, never truncated.

**4.3 Prose conventions.** Citation text follows the global American-
English and numeric conventions: `$1,500` not "fifteen hundred dollars",
`25%` not "twenty-five percent", ISO `2026-06-05` in asOf/edition stamps,
periods and commas inside quotation marks. The existing `grep-checks.mjs`
/ `check-ngrams.mjs` banned-ngram gate is extended with the handful of
citation-specific anti-patterns the sweep surfaces (e.g., a marketing
adjective that slipped into a `freeAccess` line, a non-ASCII curly
artifact).

**4.4 Reusable-constant hygiene.** The `citations.js` head defines shared
constants (`NEC_2023`, `NEC_FREE`, `NEC_DISCLOSURE`, `GOVERNANCE.*`, …).
v19 confirms that when a standard's edition rolls, the single constant is
the edit point and no entry has drifted to an inline copy of the edition
string. A grep for inline edition strings that duplicate a constant is
added to the link gate.

## 5. Round-trip audit (every formula traces to a real source, both ways)

v19 keeps the v14 §11.2 round-trip and hardens it:

- **Forward:** every tile's `formula` names the authority its math comes
  from; the §2.2 required-field gate enforces presence, and a manual
  reviewer pass per group confirms the named authority actually publishes
  that formula/section (the v18-style "is this citation real" check, but
  for citation *content* rather than code *correctness*).
- **Reverse:** `check-citation-coverage.mjs`'s per-source tile list is the
  edition-rollover playbook — when NEC 2026 lands, the list of every tile
  citing NEC is the exact work queue. v19 confirms that map is complete
  and that every tracked source in §3.1 has at least one tile (an orphan
  source pattern that matches nothing is removed or explained).

## 6. New and graduated gates

Added to `npm run lint` / CI:

- `check-citation-coverage.mjs` — **graduates warn → fail** on
  undercover/orphan (§2.1) plus the §2.2 required-field check.
- `check-citation-freshness.mjs` — **adds** the §3.3 ledger-completeness
  fail (every tracked source must have a ledger row).
- `check-citation-links.mjs` — **new**, the §4.1/§4.4 linkification and
  constant-hygiene gate.
- The §4.2 wrapping check rides on v18's `check-shell-mobile.mjs`; no new
  script, one extended assertion.

Each starts report-only for one commit to surface the backlog, then
graduates to fail once the backlog clears, per the v14 §16 ratchet.

## 7. Acceptance

v19 is complete when: (a) every live tile has a complete, inline,
copied-into-clipboard citation; (b) the freshness ledger lists every
tracked source with a current/disclosed/acknowledged status and the
freshness gate is green; (c) every citation field linkifies cleanly and
no reference block overflows at 320px; (d) the round-trip map is complete
both directions; (e) the three gates above are green and graduated to
fail-on-missing; (f) the v19 stanza in
[../docs/audit-trail.md](../docs/audit-trail.md) records, per group, the
count of stale editions disclosed/refreshed, dead-or-bare links fixed,
and overflowing blocks reworded; (g) package stamps 0.19.0.

## 8. Out of scope for v19

- New tiles and the citations that come with them (v20 — each v20 tile
  lands with its own complete, inline, current citation, so v20 does not
  reopen v19's gates, it inherits them).
- Bundling any paywalled or fast-moving lookup to manufacture freshness
  (§3.4).
- Network-fetch link-liveness checking at build time (deterministic-build
  rule; liveness is the quarterly manual ledger check).
- Internationalization of authorities; every cited body stays US.

## 9. Closing note

The number is the easy part — any calculator can return a number. The
citation is the product. v19 makes all four hundred and thirty-seven
citations inline, current, and clean, so that the professional who finds
the site by typing six words into a search engine gets not just an answer
but a provenance they can hand to a licensing board, a building
inspector, a CPA, or a judge. Then v20 adds fifty-five more, each born
with the same promise already kept.
