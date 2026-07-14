# roughlogic.com Specification v700 -- Septic Drainfield Capacity (calc-septic.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-septic.js`** (Group B,
> plumbing / onsite wastewater), no new module, group, or dependency. Inherits spec.md through spec-v699.md.
>
> **The gap, and the evidence for it.** The `septic-drainfield` tile runs the soil-absorption sizing forward: from a
> design daily flow and the soil application rate it returns the required area and trench length. The lot/permit question
> is the inverse -- **given the trench a parcel can physically fit, how much flow does the field support, and how many
> bedrooms does that permit**. From `required_area = flow / rate` and `trench_feet = area / width`, the inverse is
> `flow = trench_length x width x rate`, then `bedrooms = floor(flow / gpd_per_bedroom)` (EPA baseline 150 gpd/bedroom).
> The number this settles: **300 ft** of 3 ft trench at 0.6 gpd/ft^2 supports **540 gpd** -- a **3-bedroom** house.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`septic-drainfield` sibling (which annotates `in { args: dimensionless } out: { ... L^2, ... }`; this tile follows the same
loose convention). It reuses the sibling's application-rate model and shows the same state-primacy limitation banner via
`getLimitationCopy("septic-drainfield")` -- this is a permit-consequential number and the AHJ governs. The v18/v21
contract: any non-finite input, or a non-positive trench length, application rate, trench width, or per-bedroom design
flow returns `{ error }`. Citation discipline (v19/v22): the EPA OWTS sizing identity solved for flow and bedrooms,
`GOVERNANCE.plumbing` matching the sibling; the note states that **state and county codes set the application rate and the
per-bedroom design flow (commonly 120-150 gpd), the tool bundles no per-state shard, and the AHJ governs**.

## 2. The tile

### 2.1 `septic-drainfield-capacity` -- Septic Drainfield Capacity (Flow / Bedrooms)

```
inputs:
  available_trench_ft            ft         trench length the lot can fit (> 0)
  application_rate_gpd_per_ft2   gpd/ft^2   soil application rate from local code (> 0)
  trench_width_ft                ft         trench width (> 0, default 3)
  gpd_per_bedroom                gpd        per-bedroom design flow (> 0, default 150)

absorption_area_ft2 = available_trench_ft x trench_width_ft
design_flow_gpd     = absorption_area_ft2 x application_rate_gpd_per_ft2
bedrooms            = floor(design_flow_gpd / gpd_per_bedroom)
```

**Pinned worked example.** trench = 300 ft, rate = 0.6 gpd/ft^2, width = 3 ft, 150 gpd/bedroom:
`area = 900 ft^2`, `flow = 900 x 0.6 = 540 gpd`, `bedrooms = floor(540 / 150) = ` **3**; feeding 540 gpd, 0.6, and 3 ft
back through `septic-drainfield` returns a trench length of 300 ft, the input. A lower 120 gpd/bedroom code figure permits
the same field to serve 4 bedrooms (540 / 120 = 4.5 -> 4).

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`) placed beside `septic-drainfield` (Group B is un-audited); a
`tile-meta.js` group-map entry (NOT the simplified-tiles list -- the tile reuses the sibling's banner copy without being a
simplified screen, and the banner gate only constrains the reverse direction); a `citations.js` entry (EPA OWTS identity
solved for flow/bedrooms, `GOVERNANCE.plumbing` matching the sibling); `test/fixtures/worked-examples.json` (the pinned
example); `test/fixtures/compute-map.js` (`septic-drainfield-capacity` -> `computeSepticDrainfieldCapacity`);
`scripts/related-tiles.mjs` (-> `septic-drainfield` / `septic-tank` / `septic-pumpout-interval`);
`data/search/aliases.json` (5 collision-checked question aliases: "how many bedrooms can my leach field support", "how big
a house can this lot support", ...); the calc-septic `RENDERERS` map entry via a hand-written renderer that reuses the
`_v7p_` helper set and renders the state-primacy banner, and the id added to the calc-septic declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeSepticDrainfield`, the
lower-per-bedroom-more-bedrooms monotonicity, and the error seams. The calc-septic.js gzip cap is expected to hold (verify
at build, including `check-shells`). Lazy-loaded, absent from home first paint. Home tile count 1,148 -> 1,149.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 540 gpd / 3 bedrooms for 300 ft of 3 ft trench at 0.6 gpd/ft^2).

## 5. Roadmap position

Pairs the forward drainfield tile (`septic-drainfield`, trench from a flow) with its inverse (flow/bedrooms from the
trench a lot fits), the two halves of the onsite-capacity question. Further Group B onsite-wastewater growth stays
evidence-driven.
