# roughlogic.com Specification v253 -- Exterior Wall Opening Protection by Fire Separation Distance (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.90.0; was PROPOSED 2026-07-01). Batch spec-v251..v253 (the IBC plan-review trio -- allowable area, egress travel
> distance, and exterior opening protection). This spec closes the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: how much of an exterior wall may be windows and
> doors depends entirely on how close that wall is to the property line, and that limit -- the maximum unprotected /
> protected opening area as a percentage of the wall -- is a check the architect and plans examiner run for every wall
> on a commercial job near a lot line. Adds one tile to the **`calc-construction.js`** Group E cluster (beside
> `allowable-area` and the occupancy tiles); no new group, trade, or dependency. Inherits spec.md through spec-v252.md.
>
> **The gap, and the evidence for it.** IBC 2021 Table 705.8 caps the area of openings in an exterior wall as a
> percentage of the wall area, indexed by the fire separation distance (FSD, the distance from the wall to the lot line
> or an assumed line between buildings) and by whether the openings are protected and the building sprinklered. A wall
> less than 3 ft from the line may have no openings at all; at 5 to 10 ft an unprotected sprinklered wall may be 25%
> glass; at 30 ft or more there is no limit. The catalog now sizes the building (`allowable-area`) and confirms its
> egress (`egress-travel-distance`), but has nothing that answers the wall-by-wall question a facade design turns on:
> given this setback and this protection, how many square feet of window and door is this wall allowed to hold?

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The fire separation
distance is a length (ft); the wall area, the allowable opening area, and the actual opening area are areas (ft^2); the
allowable percentage is a count (`dimensionless`, a fraction reported as a percent). The v18/v21 contract: any
non-finite input, a negative fire separation distance, or a non-positive wall area, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the opening-limit relation by name; `editionNote` names **IBC 2021
Table 705.8 (maximum area of exterior wall openings)** and bundles its rows as editable defaults keyed by FSD band and by
protection / sprinkler status (`< 3 ft`: not permitted; `3 to < 5 ft`: 15% if protected or unprotected-sprinklered, else
not permitted; `5 to < 10 ft`: 25% protected / unprotected-sprinklered, 10% unprotected-nonsprinklered; `10 to < 15 ft`:
45% / 15%; `15 to < 20 ft`: 75% / 25%; `20 to < 25 ft`: no limit / 45%; `25 to < 30 ft`: no limit / 70%; `>= 30 ft`: no
limit), and states that **the fire separation distance is measured per §705.3 to the lot line, the centerline of a
public way, or an imaginary line between buildings on the same lot, unprotected openings in a sprinklered building take
the same allowance as protected openings per Note a to Table 705.8, the §705.8.5 vertical-separation and §705.8.6
protected-opening rules can further govern, and this is a design aid, not a code-official determination** -- the building
official's approval governs.

## 2. The tile

### 2.1 `exterior-opening-protection` -- Exterior Wall Opening Limit by Fire Separation Distance (IBC Table 705.8)

```
inputs:
  fsd_ft         ft      fire separation distance from the wall to the line (Section 705.3)
  wall_area      ft^2    area of the exterior wall being checked
  protected      bool    openings are fire-protected (or building is sprinklered) (default false)
  actual_opening ft^2    proposed total area of openings in the wall

band = fsd_ft < 3  -> 0.00 (not permitted)
     | fsd_ft < 5  -> protected ? 0.15 : 0.00
     | fsd_ft < 10 -> protected ? 0.25 : 0.10
     | fsd_ft < 15 -> protected ? 0.45 : 0.15
     | fsd_ft < 20 -> protected ? 0.75 : 0.25
     | fsd_ft < 25 -> protected ? Infinity : 0.45
     | fsd_ft < 30 -> protected ? Infinity : 0.70
     | else        -> Infinity   (no limit)

allowable_pct  = band          (Infinity reported as "no limit")
allowable_area = band == Infinity ? Infinity : band * wall_area
pass           = band == Infinity ? true : actual_opening <= allowable_area
```

**Pinned worked example (a sprinklered wall 8 ft from the line).** A 1,200 ft^2 exterior wall with a fire separation
distance of 8 ft, openings treated as protected (the building is sprinklered, so Note a applies): the `5 to < 10 ft`
band gives `allowable_pct = 25%`, `allowable_area = 0.25 x 1,200 = 300 ft^2`. A proposed 240 ft^2 of windows and doors
**passes** with 60 ft^2 of glass to spare. **Cross-check (a nonsprinklered wall too close to the line).** A 1,000 ft^2
wall at a fire separation distance of 4 ft, unprotected and nonsprinklered: the `3 to < 5 ft` band is **not permitted**
for unprotected-nonsprinklered openings, so `allowable_area = 0` and any window at all **fails**. Sprinklering the
building (or protecting the openings) moves the same wall to the 15% allowance (`150 ft^2`), which is why a wall tight to
the property line is one of the strongest arguments for a sprinkler system on an otherwise unsprinklered small building.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the opening-limit relation, `editionNote` naming IBC 2021 Table 705.8 with the FSD-band
rows, the §705.3 measurement rule, the Note-a sprinklered-equals-protected allowance, and the AHJ-determination caveat);
`test/fixtures/worked-examples.json` (the sprinklered-wall pass example + the nonsprinklered-too-close cross-check);
`test/fixtures/compute-map.js` (`exterior-opening-protection` -> `computeExteriorOpeningProtection` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `allowable-area` / `egress-travel-distance` /
`occupant-load`); `data/search/aliases.json` ("exterior opening protection", "fire separation distance", "allowable
opening area", "window area near property line", "Table 705.8", "unprotected openings", "how much glass allowed",
"exterior wall openings"); the id appended to the construction renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite,
negative FSD, wall area <= 0) plus the band boundaries (`< 3`, the `3 to < 5` protected split, and the no-limit crossover
at 20 / 25 / 30 ft). Re-pin the `calc-construction.js` size in the `check:module-sizes` allowlist (dated comment).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the FSD-band boundaries and no-limit crossover, the negative-FSD and non-positive-
wall-area error paths); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the allowable-percent / allowable-area / pass-fail stack wraps on a phone, and "no limit" renders
without overflow); render-no-nan + a11y sweep, output read to the value (8 ft sprinklered, 1,200 ft^2 wall -> 25%,
300 ft^2 allowed, 240 ft^2 passes).

## 5. Roadmap position

Closes the IBC plan-review batch (v251..v253): with `allowable-area` (v251) sizing the building and
`egress-travel-distance` (v252) confirming the exits, this tile sizes the wall openings, completing the three gates a
commercial permit set clears. A fire-resistance-rating lookup for exterior walls by FSD and construction type
(Table 705.5) and a projection / parapet limit helper (§705.2 / §705.11) are deliberate future follow-ons.
