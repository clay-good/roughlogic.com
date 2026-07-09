# roughlogic.com Specification v582 -- Waste Storage Facility Volume (NRCS 313) (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v581.md.
>
> **The gap, and the evidence for it.** `manure-application-rate` handles land application, but not the storage
> structure that holds manure between applications. NRCS Conservation Practice Standard 313 sizes it, and the catch that
> overtops a pit in a wet spring is that an uncovered liquid facility must bank not just the manure but the **net
> precipitation and the 25-year, 24-hour storm** falling on its own surface over the whole storage period. Sizing to
> manure production alone leaves no room for the water, and the minimum storage is **120 days** (or the nutrient-
> management plan), not the emptying convenience. Freeboard adds a margin -- 6 inches for a vertical-wall tank, 12 for
> other structures. The tile takes the animal manure production, the storage period, the added wastewater and bedding,
> the surface area with its net precipitation and storm depth, and the freeboard, and returns the required storage
> volume -- the number that keeps an open pit from overflowing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The daily manure,
wastewater, and bedding volumes are `L^3 T^-1` (ft^3/day); the storage period is a time (`T`, in days); the surface area
is an area (`L^2`, in ft^2); the net precipitation, storm depth, and freeboard are lengths (`L`, in inches); the total
required volume is a volume (`L^3`, in ft^3, also reported in gallons). The v18/v21 contract: any non-finite input, a
non-positive daily manure or storage period, or a negative added volume, surface area, precipitation, or freeboard
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the storage relations by name (NRCS
Conservation Practice Standard 313; ASABE D384 manure production); `editionNote` names the **NRCS 313 waste storage
facility volume**, prints `manure_volume = (daily_manure + wastewater + bedding) x storage_days`,
`precip_storm_volume = surface_area x (net_precip_in + storm_in) / 12`,
`freeboard_volume = surface_area x freeboard_in / 12`, and the total sum, and states that **an uncovered liquid facility
must bank the net precipitation and the 25-year 24-hour storm on its own surface over the storage period (sizing to
manure alone overtops in a wet spring), the minimum storage is 120 days or the nutrient-management plan, freeboard is 6
inches for a vertical-wall tank and 12 inches for other structures, and NRCS 313 and the engineer/planner govern** -- a
planning aid, not the engineer of record.

## 2. The tile

### 2.1 `manure-storage-volume` -- Why an Open Pit Must Bank the Rain and the 25-Year Storm

```
inputs:
  daily_manure_ft3   ft3/day   manure production (animal count x per-head rate)
  wastewater_ft3     ft3/day   added wastewater (0 if none)
  bedding_ft3        ft3/day   added bedding (0 if none)
  storage_days       days      storage period (>= 120)
  surface_area_ft2   ft2       facility surface area (0 for a covered/roofed structure)
  net_precip_in      in        net precipitation on the surface over the period
  storm_in           in        25-year 24-hour storm depth
  freeboard_in       in        freeboard (6 vertical wall / 12 other)

manure_volume    = (daily_manure_ft3 + wastewater_ft3 + bedding_ft3) x storage_days     [ft3]
precip_storm_vol = surface_area_ft2 x (net_precip_in + storm_in) / 12                    [ft3]
freeboard_vol    = surface_area_ft2 x freeboard_in / 12                                  [ft3]
total_ft3        = manure_volume + precip_storm_vol + freeboard_vol                      [ft3]
```

**Pinned worked example (100 dairy cows at 1.5 ft^3/head/day manure plus 20 ft^3/day bedding, 120-day storage, an 8,000
ft^2 open surface with 6 in net precipitation, a 4 in storm, 12 in freeboard).** The manure and bedding are
`(150 + 20) x 120 = 20,400 ft^3`; the precipitation and storm bank `8,000 x (6 + 4) / 12 = 6,667 ft^3`; and the
freeboard adds `8,000 x 12 / 12 = 8,000 ft^3`, for a total of **35,067 ft^3** (about 262,000 gal). **Cross-check
(sizing to manure alone badly undersizes).** Ignoring the precipitation, storm, and freeboard would build only the
`20,400 ft^3` manure volume -- **14,667 ft^3 short**, so the pit overtops the first wet spring, the exact failure NRCS
313 prevents by banking the water. The tile returns the manure volume, the precipitation-plus-storm volume, the
freeboard, and the total.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the full example + the manure-only
undersize cross-check); `test/fixtures/compute-map.js` (`manure-storage-volume` -> `computeManureStorageVolume` in
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `manure-application-rate` / `manure-nutrient-application`
/ `grain-bin-capacity`); `data/search/aliases.json` ("manure storage", "waste storage facility", "nrcs 313", "manure
pit volume", "25 year storm storage", "lagoon sizing", "manure storage days", "freeboard manure"); the id appended to
the agriculture renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the manure and precipitation-storm volumes, the freeboard, the
total, and the error seams (non-finite, non-positive manure / storage, negative added / area / precip / freeboard).
Hand-writes its renderer (mirroring the calc-agriculture.js `manure-application-rate` pattern). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the manure / precip-storm / freeboard / total stack wraps on a phone); render-no-nan + a11y on the
new tile, output read to the value (the full example -> 35,067 ft^3).

## 5. Roadmap position

Adds the storage structure volume beside `manure-application-rate` (the land-application side of the same nutrient plan).
An animal-type per-head manure library (ASABE D384) and a covered-vs-open comparison (the volume saved by a roof) are
deliberate future follow-ons. Further Group L growth stays evidence-driven.
