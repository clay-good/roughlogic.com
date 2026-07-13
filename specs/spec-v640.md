# roughlogic.com Specification v640 -- Manning Pipe Capacity (Full-Bore Gravity Flow) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`**
> (Group B, plumbing/civil), no new module, group, or dependency. Inherits spec.md through spec-v639.md.
>
> **The gap, and the evidence for it.** The `manning-slope` tile solves the Manning equation `V = (1.486/n)
> R^(2/3) sqrt(S)` in one direction only: given a pipe diameter and a target flow, what *slope* is required (at
> half-full, plus the self-cleansing slope). The complementary question every sewer and storm-drain designer also
> asks is the reverse: given a pipe already at a fixed grade, *how much* will it carry flowing full. That is the
> full-bore capacity `Q = V A` with `V = (1.486/n) R^(2/3) sqrt(S)`, `R = D/4`, and `A = (pi/4) D^2` -- the same
> Manning physics, solved for discharge instead of slope, reusing the roughness table (`MANNING_ROUGHNESS`) the
> slope tile already ships. The number a plumber wants on the truck: an 8 in concrete pipe (n 0.013) at a 1% grade
> carries **1.21 cfs (542 gpm)** flowing full at **3.46 ft/s**; because the flow scales with `sqrt(S)`, doubling
> the grade to 2% raises the capacity only **1.41x** (`sqrt 2`), not 2x.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pipe diameter is
`L`, the slope and the material selection are `dimensionless`, the full-flow velocity is `L T^-1`, and the capacity
is `L^3 T^-1`. The English Manning coefficient `1.486` and the roughness table are the same ones `manning-slope`
already uses (`MANNING_ROUGHNESS`: PVC 0.009, copper 0.011, cast iron / concrete 0.013, galvanized steel 0.016,
corrugated metal 0.024, from USGS WSP-2339, public domain). The v18/v21 contract: any non-finite input, a
non-positive diameter or slope, or an unknown material returns `{ error }`. Citation discipline (v19/v22): the
Manning full-bore capacity by name; the note states that **this is the discharge side of the same Manning equation
the manning-slope tile inverts, R = D/4 and A = (pi/4) D^2 for a circular pipe flowing full, Q scales with sqrt(S),
and it does not compute the partial-flow depth (a circular pipe carries a few percent more than full-bore at about
0.94 depth -- the partial-flow curves are separate)** -- a design aid, not a substitute for the engineer of record.

## 2. The tile

### 2.1 `manning-pipe-capacity` -- The Full-Bore Discharge of a Circular Gravity Pipe

```
inputs:
  d_in       in    inside pipe diameter (> 0)
  slope      ft/ft pipe slope S (> 0)
  material   -     pipe material -> roughness n (from MANNING_ROUGHNESS)

D  = d_in / 12                            [ft]
R  = D / 4                                [ft]   full-bore circular hydraulic radius
A  = (pi/4) D^2                           [ft^2] full-bore area
V  = (1.486 / n) R^(2/3) sqrt(S)          [ft/s]
Q  = V A                                  [cfs]  (Q_gpm = 448.831 Q_cfs)
```

**Pinned worked example (an 8 in concrete sewer at 1%).** d = 8 in (D = 0.6667 ft), S = 0.01, concrete (n = 0.013):
`R = 0.1667 ft`, `A = 0.3491 ft^2`, `V = (1.486/0.013) x 0.1667^(2/3) x sqrt(0.01) = ` **3.46 ft/s**, so
`Q = 3.46 x 0.3491 = ` **1.21 cfs = 542 gpm**.
**Cross-check (the sqrt(S) grade law).** Hold the pipe and double the grade to S = 0.02: `Q = 1.21 x sqrt(2) = `
**1.71 cfs** -- twice the slope buys only 41% more capacity.
**Cross-check (roughness).** The same 8 in pipe in PVC (n = 0.009) instead of concrete (n = 0.013) carries
`1.21 x (0.013/0.009) = ` **1.75 cfs**, the linear `1/n` scaling.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "civil"]`, beside `manning-slope`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (Manning full-bore capacity, USGS WSP-2339 n-values, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the sqrt(S) cross-check); `test/fixtures/compute-map.js`
(`manning-pipe-capacity` -> `computeManningPipeCapacity` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs`
(<-> `manning-slope`, `channel-froude-number`, `stormwater-rational`, `weir-flow`); `data/search/aliases.json`
("manning pipe capacity", "full flow pipe capacity", "gravity sewer capacity", plus question rows, all
collision-checked); `PLUMBING_RENDERERS["manning-pipe-capacity"]` via a hand-written renderer registered in the
map literal beside `manning-slope` (the module's `makeNumber` / `makeSelect` / `makeOutputLine` /
`attachExampleButton` / `debounce` / `fmt` helpers, mirroring `renderManningSlope`) and the id added to the
calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the pinned example, the full-bore geometry, the
`sqrt(S)` slope law, the `1/n` roughness scaling, and the error seams (non-finite, non-positive diameter / slope,
unknown material). Group B has no exact audit-count assertion and the mechanical-governance test is an explicit
list, so no count bump. The two `index.html` home-count spots go 1,088 -> 1,089 (check-readme-counts gates them).
The calc-plumbing.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 1.21 cfs, 542 gpm, 3.46 ft/s).

## 5. Roadmap position

Completes the Manning pipe pair: `manning-slope` (given flow, solve for slope) and now `manning-pipe-capacity`
(given slope, solve for flow), the same `V = (1.486/n) R^(2/3) sqrt(S)` physics inverted. The partial-flow depth of
a circular pipe (Manning partial-flow curves) is a natural future extension. Further Group B growth stays
evidence-driven.
