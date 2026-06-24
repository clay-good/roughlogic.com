# roughlogic.com Specification v185 -- Maximum Bends Between Pull Points (360-Degree Rule) (NEC 358.26 et al.) (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.80.0; part of catalog 639 -> 648). Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter: one tile summing the bends in a raceway
> run and checking them against the NEC limit of the equivalent of four quarter-bends (360 degrees)
> total between pull points. Adds one tile to **`calc-electrical.js`** (Group A); no new module, group,
> or dependency. Inherits spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** The catalog computes individual bends (`conduit-offset`,
> `conduit-saddle`, `conduit-90-stub`, `rolling-offset`) and pull-box sizing (`pull-box-sizing`), but
> never the cumulative-degrees check that decides whether a run needs a pull point at all: every
> raceway article caps the total at 360 degrees between pulls. Exceeding it makes a pull impossible and
> is a common rough-in mistake, and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bend
angles and their sum are in degrees; the equivalent quarter-bend count is `dimensionless`. The 360 deg
limit is a constant. The v18/v21 contract: any non-finite input, or a negative angle, returns
`{ error }`; there are no user-denominator divisions. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 358.26 (EMT) and the matching 344.26 / 352.26 / 348.26 /
356.26 sections (a run shall not contain more than the equivalent of four quarter bends, 360 deg,
between pull points)`, `editionNote` `NEC_DISCLOSURE`, with the note that offsets and saddles count
their full deflection (an offset is two bends), that the limit is identical across the common raceway
articles, and that a run exceeding 360 deg requires an intervening pull point (box or conduit body).

## 2. The tile

### 2.1 `bends-between-pulls` -- Cumulative Bend Degrees vs the 360-Degree Limit

```
inputs:
  bend1_deg ... bend6_deg   deg   individual bend deflections in the run (0 for unused fields)
                                  (an offset = its two bends; a saddle = its three bends)

total_deg          = sum of the entered bend angles
quarter_bends_eq   = total_deg / 90
verdict: total_deg <= 360 -> within limit (no intervening pull required by this rule)
         total_deg  > 360 -> add a pull point (box / conduit body) to break the run
```

**Pinned worked example.** A run with two 90-degree elbows and one 30-degree offset entered as its two
22.5-degree bends... entered straightforwardly as `90 + 90 + 45 + 45 = 270 deg` (the offset's two
45-degree bends): `total = 270 deg`; `quarter_bends_eq = 270 / 90 = 3.0` -> **within the 360-degree
limit**, no extra pull required. **Cross-check (over the limit).** Add another 90-degree elbow and a
45-degree kick: `total = 270 + 90 + 45 = 405 deg`; `quarter_bends_eq = 4.5` -> **over 360 degrees**,
a pull point must be inserted. Offsets and saddles count every bend they contain; the AHJ governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 358.26 and the matching .26 sections, the
360-degree / four-quarter-bend limit and the offset/saddle counting note listed, `editionNote`
`NEC_DISCLOSURE`); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`bends-between-pulls` -> `computeBendsBetweenPulls` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `pull-box-sizing` / `conduit-offset` /
`conduit-saddle`); `data/search/aliases.json` ("360 degrees", "four quarter bends", "bends between
pulls", "358.26", "max bends conduit", "pull point"); the id appended to the existing
`ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the within-limit example, the over-limit
cross-check, and error seams (non-finite, negative angle). Raise the `calc-electrical.js` size cap by
~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the over-limit path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the total
degrees and quarter-bend lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(270 deg -> 3.0 quarter-bends, within; 405 deg -> 4.5, over).

## 5. Roadmap position

Completes the conduit-bending family (`conduit-offset`, `conduit-saddle`, `conduit-90-stub`) with the
cumulative-degrees limit feeding `pull-box-sizing`. Further Group A growth stays evidence-driven.
