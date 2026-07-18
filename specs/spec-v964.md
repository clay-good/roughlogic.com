# roughlogic.com Specification v964 -- Available Water and MAD Irrigation Trigger (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L), no new module, group, or dependency. Inherits spec.md through spec-v963.md. Irrigation-scheduling sweep, beside the
> accepted `irrigation-requirement` and `sprinkler-precip-rate` tiles.
>
> **The gap, and the evidence for it.** `irrigation-requirement` computes ET demand and gross depth, but nothing gives
> the soil-reservoir TRIGGER -- when to irrigate and the net refill depth. Grep confirmed no available-water / MAD /
> depletion tile. The number this settles: a silt loam holds **4.32 in** of available water and triggers at 2.16 in
> depleted (an 8.6-day interval).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since water contents are in/in fractions), bounds-
fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a field capacity
outside (0,1), a wilting point at or above field capacity, a non-positive root depth or ETc, or a MAD outside (0,1]
returns `{ error }`. Citation discipline (v19/v22): the soil-water-reservoir scheduling method by name (FAO-56 / NRCS),
`GOVERNANCE.general`; the note states that MAD is ~0.5 (0.3-0.6 by crop), that RAW is both the trigger and the net refill
depth, and that the gross applied depth adds the application efficiency (in irrigation-requirement) -- the field-measured
soil moisture, the actual root depth and ETc, and the agronomist govern.

## 2. The tile

### 2.1 `mad-irrigation-trigger` -- Available Water and MAD Irrigation Trigger

```
inputs:
  field_capacity  water content at field capacity (in/in), default 0.30
  wilting_point   water content at wilting point (in/in), default 0.12
  root_depth_in   effective root depth (in), default 24
  mad_fraction    management-allowed depletion (0-1, ~0.5), default 0.5
  etc_in_day      crop water use ETc (in/day), default 0.25

taw_in                   = (field_capacity - wilting_point) x root_depth_in
raw_in                   = mad_fraction x taw_in            [= net refill depth and the trigger]
irrigation_interval_days = raw_in / etc_in_day
```

**Pinned worked example.** Silt loam, FC 0.30, PWP 0.12, 24 in root, MAD 0.5, ETc 0.25 in/day:
`TAW = (0.30-0.12) x 24 = ` **4.32 in**, `RAW = 0.5 x 4.32 = ` **2.16 in**, interval = `2.16/0.25 = ` **8.64 days**.
Cross-check: hotter weather at **ETc 0.35 in/day** shortens the interval to `2.16/0.35 = ` **6.17 days** (same reservoir,
faster use).

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `irrigation-requirement`); a `tile-meta.js` `_TILES`
entry (`L`); a `citations.js` entry (FAO-56 / NRCS soil-water reservoir, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the base example plus the hotter-weather cross-check, pinning TAW, RAW, and the interval); `test/
fixtures/compute-map.js` (`mad-irrigation-trigger` -> `computeMadIrrigationTrigger`, module `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (-> `irrigation-requirement` / `sprinkler-precip-rate` / `soil-phase-relations`);
`data/search/aliases.json` (5 collision-checked aliases: "irrigation trigger", "available water capacity", "management
allowed depletion", "when to irrigate", "soil moisture depletion"), then `node scripts/build-alias-shards.mjs`; a
hand-written renderer in the `AGRICULTURE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to
the calc-agriculture declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning TAW/RAW/interval, the hotter-weather and
deeper-root directions, the MAD linearity, and the error seams. The calc-agriculture.js gzip cap and the Group L group
shell are watched at build. Home tile count 1,412 -> 1,413.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(FC 0.30 / PWP 0.12 / 24 in / MAD 0.5 / ETc 0.25 -> 4.32, 2.16, 8.64 days).

## 5. Roadmap position

Irrigation scheduling beside `irrigation-requirement`, serving the irrigator / grower (agriculture). Deliberately the
soil-reservoir trigger; the field-measured soil moisture, the actual crop root depth and ETc, the application efficiency
(irrigation-requirement), and the agronomist govern. Stays evidence-driven. Continues the irrigation-scheduling sweep at
1 new spec (v964).
