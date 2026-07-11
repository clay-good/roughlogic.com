# roughlogic.com Specification v608 -- Critical Root Zone Encroachment Percent (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, the forestry / arborist bench); no new module, group, or dependency. Inherits spec.md through spec-v607.md.
>
> **The gap, and the evidence for it.** Spec-v566 (`tree-protection-zone`) names this tile as a deliberate follow-on:
> "a trunk-encroachment percent (how much of the CRZ a proposed footprint intrudes) and a species-tolerance factor."
> The protection-zone tile draws the circle; the question a site plan actually raises is what happens when a curb, a
> trench, or a building edge cuts **into** that circle. A construction limit line at a perpendicular distance from the
> trunk slices a segment off the critical root zone, and the fraction of the CRZ area inside that segment is the
> encroachment percent -- the number arborists and ordinances judge against. The segment area of a circle whose chord
> sits a distance d from the center is `R^2 x acos(d/R) - d x sqrt(R^2 - d^2)`, so the encroachment is that over the
> whole CRZ area. The verdict, though, is not one number: a **tolerant** species shrugs off root loss a **sensitive**
> one dies from, so the same 34% encroachment is acceptable for a tolerant oak and a removal-grade impact for a
> sensitive beech. The tile computes the encroachment from the trunk diameter and the limit-line distance, then judges
> it against the species tolerance threshold (about 40% tolerant, 30% intermediate, 20% sensitive), so a designer can
> see whether moving the wall two feet keeps the tree -- before the permit, not after the roots are cut.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The DBH is `L` (in),
the radius factor `dimensionless` (ft per inch), the CRZ radius and the limit-line distance `L` (ft), the CRZ and
segment areas `L^2` (ft^2), and the encroachment and threshold percents `dimensionless`, all carried dimensionless to
the parse-only lint alongside the `tree-protection-zone` sibling. The v18/v21 contract: any non-finite input, a
non-positive DBH or radius factor, or a negative limit-line distance returns `{ error }`; a limit line at or beyond
the CRZ radius returns zero encroachment. Citation discipline (v19/v22): `GOVERNANCE.general` over the CRZ encroachment
relation by name (ANSI A300 Part 5 tree protection / arboriculture practice, matching the `tree-protection-zone`
sibling); `editionNote` prints `radius_ft = radius_factor x dbh_in`, the circular-segment area
`segment = radius_ft^2 x acos(d/radius_ft) - d x sqrt(radius_ft^2 - d^2)` for a limit line at distance d, and
`encroach_pct = segment / (pi x radius_ft^2) x 100`, names the species thresholds (**tolerant ~40%, intermediate
~30%, sensitive ~20%**, Matheny & Clark tolerance ratings), and states that **the encroachment is the CRZ area beyond
a single straight construction limit line (a real footprint may cut more than one side and the impacts are
cumulative), the CRZ radius is set by trunk diameter not the canopy, the species threshold is a guide not a guarantee,
and a qualified arborist and the local ordinance govern** -- a planning screen, not a tree-preservation permit.

## 2. The tile

### 2.1 `tree-crz-encroachment` -- CRZ Encroachment Percent vs Species Tolerance

```
inputs:
  dbh_in           in         trunk diameter at breast height
  radius_factor    ft/in      CRZ radius factor (1.0 typical, 1.5 mature/sensitive)
  limit_distance_ft ft        perpendicular trunk-to-construction-limit-line distance
  species_tolerance select    tolerant | intermediate | sensitive  (threshold 40 / 30 / 20 %)

radius_ft     = radius_factor x dbh_in                                              [ft]
if limit_distance_ft >= radius_ft:  encroach_pct = 0
else:
  segment_ft2 = radius_ft^2 x acos(limit_distance_ft / radius_ft)
                - limit_distance_ft x sqrt(radius_ft^2 - limit_distance_ft^2)       [ft2]
  encroach_pct = segment_ft2 / (pi x radius_ft^2) x 100                             [%]
over_tolerance = encroach_pct > threshold(species_tolerance)
```

**Pinned worked example (a 20-inch DBH tree, 1.0 ft/in factor, construction limit 5 ft from the trunk, intermediate
species).**
`radius = 1.0 x 20 = 20 ft`. The limit line 5 ft out cuts a segment of
`20^2 x acos(5/20) - 5 x sqrt(20^2 - 5^2) = 527.2 - 96.8 = 430.4 ft^2` out of the `pi x 20^2 = 1,257 ft^2` CRZ, so
`encroach = 430.4 / 1,257 x 100 = ` **34.3%** -- past the **30%** intermediate threshold, a decline risk, but it would
be **acceptable for a tolerant** species (40%) and clearly **over for a sensitive** one (20%): the same cut, three
verdicts. **Cross-check (move the limit line out to 12 ft).**
`segment = 20^2 x acos(12/20) - 12 x sqrt(400 - 144) = 370.9 - 192.0 = 178.9 ft^2`,
`encroach = 178.9 / 1,257 x 100 = ` **14.2%** -- now under every threshold, showing that pushing the wall 7 feet
farther from the trunk more than halves the root impact.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["arborist"]`, placed beside `tree-protection-zone` -- **outside** the
counted `// Group L: Agriculture` .. `// Group M` block like the other arborist tiles, so the `citations.test.js`
Group L audit count does **not** change); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`tree-crz-encroachment` -> `computeTreeCrzEncroachment` in `../../calc-arborist.js`);
`scripts/related-tiles.mjs` (-> `tree-protection-zone` / `trunk-decay-strength` / `crown-pruning-dose`);
`data/search/aliases.json` ("crz encroachment", "root zone encroachment", "tree protection encroachment", "construction
near a tree", "tpz intrusion", plus question rows); the id appended to the calc-arborist declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the species-threshold switch, the no-encroachment case, and the error seams (non-finite,
non-positive DBH / factor, negative distance). Renderer hand-written mirroring `tree-protection-zone`, with `makeSelect`
for the radius factor and the species tolerance. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the 5-ft-limit example -> 34.3% encroachment).

## 5. Roadmap position

Gives `tree-protection-zone` the encroachment-and-tolerance check its own follow-on named, beside `trunk-decay-strength`
and `crown-pruning-dose`. No further CRZ follow-on is named; further Group L growth stays evidence-driven.
