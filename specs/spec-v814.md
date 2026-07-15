# roughlogic.com Specification v814 -- Concrete Pour Rate, Rate of Rise, and Delivery Cadence (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v813.md. The placement-logistics complement to
> `formwork-pressure`, which takes the rate of rise as an input this tile produces.
>
> **The gap, and the evidence for it.** `formwork-pressure` needs the **rate of rise** (ft/hr) but nothing computes it from
> the crew's placement rate and the form footprint, and nothing gives the pour duration or the ready-mix delivery cadence.
> Grep confirmed no pour-rate / rate-of-rise tile. The number this settles: placing 20 cy/hr into a 100 ft x 1 ft wall
> footprint rises **5.4 ft/hr** (the number `formwork-pressure` wants), fills a 12 ft wall in about **2.2 hours**, and needs
> **2 trucks/hr** -- one 10 cy load every 30 minutes -- to keep the crew placing without a cold joint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
construction siblings (`formwork-pressure`, `ready-mix-concrete-order`): the placement rate and total volume carry
`L^3 T^-1` and `L^3`, the form plan area `L^2`, the truck load `L^3`, the rate of rise `L T^-1`, the pour duration `T`,
and the trucks-per-hour is dimensionless (per-hour implicit). The v18/v21 contract: a non-finite or non-positive placement
rate, form plan area, total volume, or truck load returns `{ error }`. Citation discipline (v19/v22): the rate-of-rise
identity by name (rate of rise = placement rate x 27 / plan footprint area), `GOVERNANCE.general`; the note states that the
rate of rise is the input `formwork-pressure` uses to set the design lateral pressure -- placing faster than the forms are
designed for is how a form blowout happens -- that the pour must stay continuous to avoid a cold joint, and that the
delivery cadence assumes the plant can sustain the trucks-per-hour.

## 2. The tile

### 2.1 `concrete-pour-rate` -- Concrete Pour Rate, Rate of Rise, and Delivery Cadence

```
inputs:
  placement_rate_cyhr  crew placement rate (cy/hr)
  form_plan_area_ft2   horizontal footprint being filled (ft^2; wall = length x thickness)
  total_volume_cy      total pour volume (cy)
  truck_load_cy        ready-mix truck load (cy, default 10)

rate_of_rise_ft_hr = placement_rate_cyhr * 27 / form_plan_area_ft2
pour_hours         = total_volume_cy / placement_rate_cyhr
trucks_per_hour    = placement_rate_cyhr / truck_load_cy
```

**Pinned worked example.** Placement 20 cy/hr, wall 100 ft long x 1 ft thick (footprint 100 ft^2), total 44.44 cy (a 12 ft
wall), 10 cy trucks: `rate of rise = 20 * 27 / 100 = ` **5.4 ft/hr**; `pour = 44.44 / 20 = ` **2.22 hr**;
`trucks = 20 / 10 = ` **2/hr** (one load every 30 min). Cross-check: speeding to 30 cy/hr raises the rate of rise to
`30 * 27 / 100 = ` **8.1 ft/hr** -- feed that into `formwork-pressure` and the design lateral pressure climbs with it, so
the faster schedule can outrun the forms.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction", "carpentry"]`, inside the `// Group E` construction
block beside `formwork-pressure`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry
(`E`); a `citations.js` entry (rate of rise = placement rate x 27 / plan area, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the faster-schedule cross-check); `test/fixtures/compute-map.js`
(`concrete-pour-rate` -> `computeConcretePourRate`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `formwork-pressure` / `ready-mix-concrete-order` / `concrete-yield`); `data/search/aliases.json` (5 collision-checked
aliases: "concrete pour rate", "concrete rate of rise", "form fill rate", "concrete pour duration", "ready mix trucks per
hour"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `formwork-pressure` renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the rate of rise, the pour duration, the trucks-per-hour, and the error seams
(non-positive placement rate, plan area, volume, truck load). The calc-construction.js gzip cap is watched at build. Verify
at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home
tile count 1,262 -> 1,263.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 * 27 / 100 -> 5.4 ft/hr; 44.44 / 20 -> 2.22 hr).

## 5. Roadmap position

Closes the loop on the formwork family: `concrete-pour-rate` produces the rate of rise that `formwork-pressure` consumes,
and the delivery cadence that `ready-mix-concrete-order` quantities feed. Serves the concrete crew and superintendent
(concrete / construction / carpentry). Stays evidence-driven; the form design governs the safe rate of rise.
