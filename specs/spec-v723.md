# roughlogic.com Specification v723 -- Max Fire Area from Available Foam Concentrate (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`** (Group F), no
> new module, group, or dependency. Inherits spec.md through spec-v722.md. Sweep-11 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `foam` tile runs the concentrate math forward: from a fire area
> it returns the concentrate needed. On the fireground the concentrate on the apparatus is fixed, so the real question is
> the inverse -- **how big an area that load can cover**. From `concentrate = area x rate x (pct/100) x duration`,
> `max_area = concentrate / (rate x (pct/100) x duration)`. The number this settles: **100 gal** of concentrate at 0.10
> gpm/ft^2, 3%, 15 min covers up to **~2,222 ft^2**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `foam`
sibling: the concentrate is `L^3` (gal), the application rate is `L T^-1` (gpm/ft^2), the percentage is dimensionless,
the duration is `T` (min), and the returned area is `L^2` (ft^2). The v18/v21 contract: any non-finite input, or a
non-positive concentrate, application rate, foam percentage, or duration returns `{ error }`. Citation discipline
(v19/v22): the NFPA 11 concentrate relation solved for the area, `GOVERNANCE.fire` matching the sibling; the note states
that **a lower application rate, a leaner concentrate percentage, or a shorter duration stretches the same load over more
area, but the rate and duration come from the fuel (hydrocarbon vs polar solvent) and the department SOP, not
convenience, and the foam type, burnback resistance, and incident commander govern**.

## 2. The tile

### 2.1 `foam-max-coverage-area` -- Max Fire Area from Available Foam Concentrate

```
inputs:
  available_concentrate_gal        L^3           foam concentrate on hand (> 0)
  application_rate_gpm_per_ft2      L T^-1        application rate (> 0, default 0.10)
  foam_percentage                  dimensionless concentrate percentage (> 0, default 3)
  duration_min                     T             required duration (> 0, default 15)

max_area_ft2 = available_concentrate_gal / (application_rate_gpm_per_ft2 x (foam_percentage/100) x duration_min)
```

**Pinned worked example.** concentrate = 100 gal, rate = 0.10, pct = 3, duration = 15 min:
`max_area = 100 / (0.10 x 0.03 x 15) = 100 / 0.045 = ` **2,222 ft^2**; feeding 2,222 ft^2 back through `foam` at the same
rate/pct/duration returns 100 gal of concentrate, the input. A leaner 1% concentrate stretches the same load to 6,667
ft^2.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`) placed beside `hydrant-available-flow` in the later spec-vNN section,
well past the Group F exact-35 audit block (the `foam` forward tile itself is inside the audited block, so the inverse row
must stay out of it); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (concentrate relation solved for the area,
`GOVERNANCE.fire` matching the sibling, NFPA 11); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`foam-max-coverage-area` -> `computeFoamMaxCoverageArea`); `scripts/related-tiles.mjs`
(-> `foam` / `foam-eductor-limit` / `master-stream` / `pdp`); `data/search/aliases.json` (5 collision-checked question
aliases: "how big an area can my foam cover", "biggest spill my foam load handles", ...); the calc-fire `FIRE_RENDERERS`
map entry via a hand-written NON-exported renderer (four number fields; kept un-exported so it is not a corpus function
needing fuzzer-sentinel coverage, unlike the exported `renderFoam`) and the id added to the calc-fire declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeFoam` across a concentrate/rate/pct
sweep, the leaner-percentage-more-area monotonicity, and the error seams. The calc-fire.js gzip cap is raised 34000 ->
36000 B (the module was at 94.5%). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint.
Home tile count 1,171 -> 1,172.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 2,222 ft^2 for 100 gal of
concentrate at 0.10 gpm/ft^2, 3%, 15 min).

## 5. Roadmap position

Pairs the forward foam tile (`foam`, concentrate from an area) with its inverse (area from a concentrate load), the two
halves of the fixed-foam-supply question. Further Group F fire-ground growth stays evidence-driven.
