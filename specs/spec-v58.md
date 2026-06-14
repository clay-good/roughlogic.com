# roughlogic.com Specification v58 -- Mold Remediation Scoping (2 New Tiles)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.52.0, a minor;
> catalog 584 -> 586, Group D 19 -> 21; wiring lint 31 renderer modules / 586
> tile-id entries; corpus 890, dims 893, fuzzer 890/890, derivation 586/586).**
> v58 is a catalog-growth spec in
> the single-domain-deepening lineage. It inherits everything from spec.md
> through spec-v57.md and changes none of it.
>
> v58 deepens **Group D (Water Damage and Mold Restoration)** with the two pieces
> the suite was missing at the *front* of a mold job: deciding **how big the job
> is** and **naming the condition** you are returning to normal. Group D already
> sizes the drying and containment equipment (`nam-sizing`,
> `containment-air-balance`, `chamber-turnover`, `hepa-filter-life`) and reports
> growth thresholds (`mold`), but it had no tile that maps **affected area to a
> remediation scope** (the first decision an estimator makes) and none that states
> the **IICRC S520 Condition framework** (the language a remediation protocol is
> written in). **No new group, no new dependencies, no telemetry, no AI, US
> standards only.** Both land in `calc-restoration.js`, next to `mold` and
> `water-classes`.
>
> **The gap, and the evidence for it.** A concept-check for
> remediation-level / scope-of-work / S520-condition / square-foot-bands returned
> nothing. The existing `mold` tile answers "will it grow?" (RH/temp/time
> thresholds); `water-classes` is the S500 water vocabulary. Neither answers the
> two questions every mold walkthrough starts with: *what level of containment and
> documentation does this square footage trigger,* and *what Condition is each area
> in.* Those are the EPA small/medium/large bands, the historical NYC DOHMH
> Level I-V scheme, and the S520 Condition 1/2/3 definitions -- the catalog named
> them in citations but exposed no tile for either.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `mold-remediation-level` carries an area input (`L^2`)
  and otherwise categorical inputs/outputs; `mold-conditions` is a pure
  reference page (all dimensionless / categorical, no compute).
- The v18/v21 tile contract applies to `mold-remediation-level`: a non-positive
  area, or any non-finite input, returns `{ error }`. The level mapping is a
  bounded lookup (five bands), so no input can build an unbounded structure.
  `mold-conditions` is a reference render with no numeric input and so no error
  seam beyond the standard empty-input render.
- The v19/v22 citation discipline applies. Both entries use `GOVERNANCE.general`
  ("Estimate. AHJ and licensed professional govern.") -- consistent with the rest
  of Group D, since IICRC S520 and the EPA guidance are consensus / advisory
  references, not law. Sources are named, not reproduced: **EPA 402-K-01-001**
  (Mold Remediation in Schools and Commercial Buildings, free at epa.gov/mold),
  the **NYC DOHMH Guidelines on Assessment and Remediation of Fungi in Indoor
  Environments**, and **IICRC S520-2024** (licensed).
- Tile ids are kebab-case and checked against the 584 live ids:
  `mold-remediation-level` and `mold-conditions` do not collide and are not
  concept-duplicates (the live `mold` tile is growth-threshold risk, not scope or
  Condition vocabulary; see §3).

## 2. The tiles

### 2.1 `mold-remediation-level` -- Remediation Scope by Affected Area (Group D, calc-restoration.js)

The opening decision on a mold job: a hand-sized patch behind a vanity is not a
gut of a finished basement, and the square footage drives containment, PPE, the
need for an independent assessor, and whether clearance testing is warranted.
This tile maps affected area (plus three field flags) to a remediation level and
the controls that level triggers. It is a deterministic branching lookup, not a
hazard judgment.

```
inputs:
  affected_area_ft2   L^2     contiguous + summed visible/suspected growth
  porous              flag    drywall, carpet, ceiling tile, insulation present
  hvac_involved       flag    growth in or fed by the HVAC system
  vulnerable_occupant flag    infant, elderly, asthmatic, or immunocompromised

area -> band (EPA 402-K-01-001):
  < 10 ft^2            small   maintenance staff, minimal containment
  10 to 100 ft^2       medium  trained staff, limited or full containment
  > 100 ft^2           large   professional remediation, full containment

area -> level (NYC DOHMH Level I..IV; Level V = HVAC systems):
  Level I    < 10 ft^2
  Level II   10 to 30 ft^2
  Level III  30 to 100 ft^2
  Level IV   > 100 ft^2
  Level V    any HVAC-system involvement (overrides the area level)

derived controls:
  containment   none -> limited (poly + negative air) -> full (decon chamber)
  ppe_tier      N95 + gloves + eye  ->  half-face P100 + suit  ->  full-face / PAPR
  iep_assess    recommend an independent assessor when area > 100 ft^2,
                HVAC is involved, or a vulnerable occupant is present
  clearance     recommend post-remediation verification (PRV) for medium/large,
                HVAC, or vulnerable-occupant jobs
```

The tile reports the EPA band, the NYC DOHMH level (with the HVAC override to
Level V), the containment recommendation, the PPE tier, whether an independent
environmental professional (IEP) assessment is advised, and whether clearance /
post-remediation verification is advised. Every output is a recommendation
keyed to public guidance; the protocol of the IEP and the remediator governs.

**Worked example (pinned).** 45 ft^2 of moldy drywall, no HVAC involvement,
healthy occupant: porous = true. Band = **medium** (10 to 100 ft^2). Level =
**III** (30 to 100). Containment = **full** recommended for porous material in the
30 to 100 ft^2 range. PPE tier = **half-face P100 + suit**. IEP assessment =
**optional** (area not over 100, no HVAC, no vulnerable occupant). Clearance =
**recommended** (medium job). Cross-checks: 6 ft^2 hard-surface tile patch ->
band small, Level I, limited containment, N95 tier, no IEP, clearance optional;
250 ft^2 -> band large, Level IV, full containment, full-face/PAPR tier, IEP
recommended, clearance recommended; any job with `hvac_involved` -> Level V
override and IEP + clearance recommended regardless of area. Degenerate inputs
(area <= 0, non-finite) return an error.

**Why it is honest.** The output is scope guidance, not a substitute for an
assessment. The note line states: areas are summed visible plus reasonably
suspected growth; the highest moisture reading and the protocol govern the actual
cut line; Condition 3 hidden growth can exceed the visible estimate; and a
vulnerable occupant raises the recommended controls independent of area.

### 2.2 `mold-conditions` -- IICRC S520 Condition Reference (Group D, calc-restoration.js)

A reference page, no compute, parallel to `water-classes`. The S520 framework
names three Conditions; a remediation protocol is the plan to return Condition 2
and Condition 3 areas to Condition 1. Having the definitions one tap away on a
phone, in plain English, with the standard named but not reproduced, is the point.

```
Condition 1 (normal fungal ecology)  -- an indoor environment that may have
  settled spores, fungal fragments, or traces of growth whose identity, location,
  and quantity are reflective of a normal fungal ecology for a similar indoor
  environment. This is the goal state of remediation.

Condition 2 (settled spores)         -- an indoor environment primarily
  contaminated with settled spores dispersed directly or indirectly from a
  Condition 3 area. No actual growth, but elevated settled spore load.

Condition 3 (actual growth)          -- an indoor environment contaminated with
  actual mold growth and associated spores. Growth may be active or dormant,
  visible or hidden.

Goal of remediation: return Condition 2 and 3 areas to Condition 1.
```

The render lists the three Conditions with original plain-English summaries and a
closing line stating the remediation goal. It names IICRC S520-2024 (licensed) by
section; the standard text is not reproduced.

## 3. Concept-check and wiring

Concept-checked against the 584 live tiles. `mold` reports growth *thresholds*
(temperature / RH / hours) -- a risk-of-growth answer, not a scope or a Condition.
`water-classes` is the S500 water-loss vocabulary (categories 1 to 3, classes 1 to
4), a different framework from the S520 Condition vocabulary. `ppe` maps water
*category* to PPE; this tile maps mold *area / level* to a PPE tier and the rest of
the control set. No tile maps affected area to a remediation level, and none states
the S520 Conditions. **Both ship.** They join the restoration bench in
`calc-restoration.js` beside `mold` and `water-classes`.

Per-tile wiring (each tile): a `tools-data.js` row (group `D`, trades
`["restoration"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`mold-remediation-level`: EPA 402-K-01-001 + NYC DOHMH guidelines + IICRC
S520-2024 by name, `GOVERNANCE.general`, assumptions listing the area bands and the
HVAC -> Level V override; `mold-conditions`: IICRC S520-2024 by name,
`GOVERNANCE.general`, `formula: "(reference page; no compute) ..."`);
`test/fixtures/worked-examples.json` (the pinned 45 ft^2 case and the cross-checks
for `mold-remediation-level`); `test/fixtures/compute-map.js` (module path
`../../calc-restoration.js`); `scripts/related-tiles.mjs`
(`mold-remediation-level` -> `mold` / `mold-conditions` / `ppe`;
`mold-conditions` -> `water-classes` / `mold` / `mold-remediation-level`);
`data/search/aliases.json` (e.g. `mold-remediation-level`: "remediation level",
"scope of work", "square footage mold", "EPA mold", "NYC mold guidelines",
"containment level"; `mold-conditions`: "S520", "condition 1", "condition 2",
"condition 3", "fungal ecology"); the `app.js` `RESTORATION_RENDERERS` declares
(already the registry for this module via `calc-restoration.js`); the `// dims:`
annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins the `mold-remediation-level` worked
example, the small / large cross-checks, the HVAC Level V override, and the
non-positive-area error seam.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar at implementation: `npm run lint` (every gate; the wiring
lint must report the new renderer/tile-id counts; the spec-v49
`check-readme-counts` gate must agree at **586 tiles** and the corresponding
sitemap URL count, one detail URL per new tile); `npm test` (unit suite, +2 tests);
`npm run build` (586 tile shells + the Group D group shell, regenerated sitemap);
`npm run data:verify`; the worked-examples runner (+ the `mold-remediation-level`
fixtures; `mold-conditions` is a reference render with no compute fixture); the
320 px shell audit (both new tile shells legible at 320 px -- the level output and
the three-Condition list must wrap, not scroll horizontally); and the
full-catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered
output read to the value (45 ft^2 -> medium / Level III / full containment /
half-face P100 / clearance recommended).

## 5. Roadmap position

v58 brings Group D to 21 tiles and closes the front-of-job scoping gap: the suite
now runs from *what level is this and what Condition am I in* (v58) through sizing
the drying and containment equipment (existing) to the S500 boundary-test drying
log (existing). The standing module-cap watch list adds `calc-restoration.js`: if
these two rows push the module past its byte cap, the spec authorizes a per-tile
split into a sibling `calc-mold.js`, mirroring the spec-v56 `calc-fab.js ->
calc-layout.js` precedent; the gate plan in §4 includes the cap check. v59 and v60
continue the Group D deepening (remediation chemistry / air sampling, and
water-loss documentation).
