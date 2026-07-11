# roughlogic.com Specification v606 -- Manure Storage Covered-vs-Open Roof Savings (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L, the agriculture bench); no new module, group, or dependency. Inherits spec.md through spec-v605.md.
>
> **The gap, and the evidence for it.** Spec-v582 (`manure-storage-volume`) names this tile as a deliberate follow-on:
> "a covered-vs-open comparison (the volume saved by a roof)." The storage tile sizes an open facility, which must bank
> the net precipitation and the 25-year storm falling on its own surface; a roof keeps that rain out, and the obvious
> next question is **how much storage volume a roof buys back.** The answer is the whole precipitation-plus-storm term
> the open facility carries: `area x (net_precip + storm) / 12` cubic feet over the storage period. That volume is
> pure clean rainwater the operation would otherwise have to store, haul, and land-apply as if it were waste, so a
> roof both shrinks the structure and cuts the pumping and spreading. The saving is not a footnote: an 8,000-square-
> foot pit in a 10-inch wet season saves about **6,700 cubic feet -- roughly 50,000 gallons, a fifth of the whole
> facility.** And because the saving scales with the rainfall and the surface area, a roof pays back fastest exactly
> where it rains most and the pit is largest. The tile puts the open volume, the covered volume, and the roof saving
> in gallons and percent side by side, so a producer weighing a cover can see the storage and hauling it eliminates
> before pricing the steel.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The daily manure,
wastewater, and bedding volumes are `L^3 T^-1` (ft^3/day), the storage period `T` (days), the surface area `L^2`
(ft^2), the net precipitation, storm, and freeboard depths `L` (in), and the open, covered, and saved volumes `L^3`
(ft^3 and gal), all carried dimensionless to the parse-only lint alongside the `manure-storage-volume` sibling. The
v18/v21 contract: any non-finite input, a non-positive daily manure or storage period, a non-positive surface area
(there is nothing for a roof to cover), or a negative added volume, precipitation, storm, or freeboard returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the covered-vs-open comparison by name (USDA-NRCS
Conservation Practice 313 waste storage facility, matching the `manure-storage-volume` sibling); `editionNote` prints
`open_ft3 = (manure + wastewater + bedding) x days + area x (net_precip + storm)/12 + area x freeboard/12`,
`roof_saving_ft3 = area x (net_precip + storm)/12`, `covered_ft3 = open_ft3 - roof_saving_ft3`, and
`percent_saved = roof_saving_ft3 / open_ft3 x 100`, and states that **the roof saving is the net precipitation and the
25-year, 24-hour storm the open facility must otherwise bank on its own surface, the freeboard is held the same in both
cases (a conservatism -- a roofed structure can often carry less), the saving is clean rainwater the operation also
avoids hauling and land-applying, and NRCS 313 and the engineer/planner govern** -- a planning aid, not the engineer of
record.

## 2. The tile

### 2.1 `manure-cover-savings` -- Storage Volume a Roof Saves

```
inputs:
  daily_manure_ft3   ft3/day   daily manure production
  wastewater_ft3     ft3/day   added wastewater (0 if none)
  bedding_ft3        ft3/day   added bedding (0 if none)
  storage_days       days      storage period (>= 120 per NRCS 313)
  surface_area_ft2   ft2       facility surface area (the roof area)
  net_precip_in      in        net precipitation over the storage period
  storm_in           in        25-year, 24-hour storm depth
  freeboard_in       in        freeboard (6 in vertical wall, 12 in other)

open_ft3        = (daily_manure_ft3 + wastewater_ft3 + bedding_ft3) x storage_days
                  + surface_area_ft2 x (net_precip_in + storm_in)/12 + surface_area_ft2 x freeboard_in/12
roof_saving_ft3 = surface_area_ft2 x (net_precip_in + storm_in)/12
covered_ft3     = open_ft3 - roof_saving_ft3
percent_saved   = roof_saving_ft3 / open_ft3 x 100
roof_saving_gal = roof_saving_ft3 x 7.48052
```

**Pinned worked example (an 8,000-square-foot pit, 120 days, 6 in net precip + 4 in storm).**
`open = (150 + 20) x 120 + 8,000 x 10/12 + 8,000 x 12/12 = 20,400 + 6,667 + 8,000 = 35,067 ft^3`. The roof removes the
rain: `roof_saving = 8,000 x 10/12 = ` **6,667 ft^3**, so `covered = 28,400 ft^3` and the saving is
`6,667 x 7.48052 = ` **49,870 gallons**, or `6,667 / 35,067 = ` **19%** of the whole facility. **Cross-check (a wetter
climate and a bigger pit pay more).** 12,000 ft^2, 10 in net precip + 5 in storm, same manure: `open = 20,400 +
12,000 x 15/12 + 12,000 = 47,400 ft^3`, `roof_saving = 12,000 x 15/12 = ` **15,000 ft^3** = **112,208 gallons** =
**32%** -- the roof buys back a third of a facility where it rains most, exactly where the storage and hauling hurt.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, placed inside the `// Group L: Agriculture` comment block
beside `manure-storage-volume` -- the `citations.test.js` **Group L audit count bumps 29 -> 30**); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json`
(both examples); `test/fixtures/compute-map.js` (`manure-cover-savings` -> `computeManureCoverSavings` in
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `manure-storage-volume` / `manure-application-rate` /
`manure-nutrient-application`); `data/search/aliases.json` ("manure cover savings", "roof over manure pit", "covered
vs open manure", "manure storage roof", "rainfall on a manure pit", plus question rows); the id appended to the
calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the roof-saving-equals-precip-term
identity, the wetter-pays-more behavior, and the error seams (non-finite, non-positive manure / days / area, negative
added / precip / storm / freeboard). Renderer hand-written mirroring `manure-storage-volume` (`makeNumber` /
`makeOutputLine`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group L audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 8,000 ft^2 example
-> 6,667 ft^3 / 49,870 gal / 19%).

## 5. Roadmap position

Answers the covered-vs-open question `manure-storage-volume` leaves open, beside `manure-application-rate` and
`manure-nutrient-application`. The v582-named animal-type per-head manure library (ASABE D384) remains a deliberate
future follow-on. Further Group L growth stays evidence-driven.
