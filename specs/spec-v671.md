# roughlogic.com Specification v671 -- Horsepower for a Target Planing Speed (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> mechanic / marine), no new module, group, or dependency. Inherits spec.md through spec-v670.md.
>
> **The gap, and the evidence for it.** Spec-v507 (`crouch-planing-speed`) runs Crouch's formula forward: given the
> horsepower, it returns the planing top speed. The repower question a marine mechanic actually asks is the inverse --
> **how much horsepower do I need to hit a target speed**. The forward tile makes you guess a power and re-read the
> speed; the inverse solves it directly. From `speed_mph = C / sqrt(weight / hp)`, `hp = weight x (speed / C)^2`. The
> number this settles: a 6,000 lb runabout targeting **34.7 mph** at C = 190 needs **200 hp**, and to reach **49.1 mph**
> it needs about **400 hp** -- horsepower rises with the SQUARE of the target speed, the diminishing return the forward
> tile shows as a square-root, read the other way. This mirrors the shipped car trap-speed/ET forward-inverse pair for
> boats.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`crouch-planing-speed` sibling: the target speed is `L T^-1` (mph), the displacement is `M L T^-2` (lb), the hull
constant is `dimensionless`, and the returned horsepower is `M L^2 T^-3` (hp). The `C` hull constant defaults to 190
(runabout), the sibling's default. The v18/v21 contract: any non-finite input, or a non-positive target speed /
displacement / hull constant, returns `{ error }`. Citation discipline (v19/v22): Crouch's planing-speed formula solved
for the power, by name; the note states that **horsepower rises with the square of the target speed, the speed is MILES
PER HOUR not knots, the hull constant C (about 150 heavy cruiser, 190 runabout, 210 race) dominates the estimate, the
formula assumes the boat is on plane, and this is a planning estimate -- the actual hull, propeller, and conditions
govern**.

## 2. The tile

### 2.1 `crouch-hp-for-speed` -- Horsepower for a Target Planing Speed

```
inputs:
  target_speed_mph   mph   target planing speed, mph not knots (> 0)
  displacement_lb    lb    loaded displacement (> 0)
  hull_constant      -     C: 150 cruiser / 190 runabout / 210 race (> 0, default 190)

hp = displacement_lb x (target_speed_mph / hull_constant)^2   [hp]
```

**Pinned worked example (a 6,000 lb runabout).** target = 34.7 mph, W = 6,000 lb, C = 190:
`hp = 6000 x (34.7 / 190)^2 = 6000 x 0.03336 = ` **200 hp**; feeding 200 hp back through `crouch-planing-speed` returns
34.7 mph, the input. **Cross-check (the square-law).** Same boat targeting 49.1 mph (about sqrt(2) x 34.7):
`hp = 6000 x (49.1 / 190)^2 = ` **400 hp** -- 40% more speed roughly doubles the power, the diminishing return that makes
the last few mph so expensive.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `crouch-planing-speed`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (Crouch's formula solved for power, `GOVERNANCE.general` matching the sibling, the note per
§1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`crouch-hp-for-speed` ->
`computeCrouchHpForSpeed` in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `crouch-planing-speed` /
`hull-speed` / `prop-pitch-selection` / `prop-slip`, and the forward tile links back); `data/search/aliases.json`
("horsepower for speed", "how much power for target speed", "boat repower horsepower", plus adjacent rows);
`MECHANIC_RENDERERS["crouch-hp-for-speed"]` via the module's `_simpleRenderer` factory (mirroring
`crouch-planing-speed`) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning both examples, the square-law, the round-trip through `computeCrouchPlaningSpeed`, and the error seams. The Group
K audit-coverage test parses only the original `// Group K: Mechanic` block (this tile is in a later section, so the
exact count of 12 is unaffected); the marine-governance test checks only `prop-slip`, so `GOVERNANCE.general` is correct
and no count bump is needed. The calc-mechanic.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 200 hp for 34.7 mph).

## 5. Roadmap position

Pairs the forward Crouch tile (`crouch-planing-speed`, speed from power) with its inverse (power from the target speed),
the two halves of the planing-repower question. Further Group K growth stays evidence-driven.
