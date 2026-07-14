# roughlogic.com Specification v765 -- Boiler Horsepower, Steam Output, and EDR (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-pipefit.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v764.md. **Opens a new vein: the first NON-inverse
> tile after the inverse-of-existing-tile campaign closed at spec-v764** (a fresh Explore found this genuine coverage gap
> in the thin steam block).
>
> **The gap, and the evidence for it.** The calc-pipefit steam block sizes mains, traps, PRVs, and returns, but there is
> no tile for the most basic steamfitter conversion: **boiler horsepower**. Boilers are rated three ways -- gross output
> in Btu/hr, boiler horsepower (BHP), and steam in lb/hr -- and radiation is sized in square feet of equivalent direct
> radiation (EDR). The ABMA/ASME definition ties them together: **1 BHP = 33,475 Btu/hr = 34.5 lb/hr "from and at" 212 F
> = 139 sq ft EDR**. The number this settles: a **500,000 Btu/hr** boiler is **14.94 BHP**, **515 lb/hr**, and
> **2,076 sq ft** of radiation. Grep confirmed no `boiler-horsepower`, `BHP`-steam, `from-and-at`, or `EDR` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the steam-block
siblings (`steam-trap-sizing`, `steam-pipe-velocity`): the gross output is a power (`M L^2 T^-3`), the steam rate a mass
flow (`M T^-1`), and EDR an area (`L^2`). The v18/v21 contract: a non-finite input or a non-positive gross output
returns `{ error }` (via the module `_finiteGuard` plus the positivity check). Citation discipline (v19/v22): the ABMA/
ASME definition by name, `GOVERNANCE.general`; the note states the "from and at 212 F" basis assumes 212 F feedwater at
0 psig, so a real plant with cooler feedwater and higher pressure evaporates less steam per BHP -- apply the boiler
maker's factor of evaporation for the actual conditions.

## 2. The tile

### 2.1 `boiler-horsepower` -- Boiler Horsepower, Steam Output, and EDR

```
inputs:
  output_btuhr    boiler gross output (Btu/hr, > 0)

boiler_hp   = output_btuhr / 33475
steam_lbhr  = boiler_hp x 34.5      (from and at 212 F)
edr_sqft    = boiler_hp x 139
```

**Pinned worked example.** output = 500,000 Btu/hr:
`BHP = 500000 / 33475 = ` **14.94**; `steam = 14.94 x 34.5 = ` **515 lb/hr**; `EDR = 14.94 x 139 = ` **2,076 sq ft**.
At exactly 33,475 Btu/hr the tile returns 1 BHP, 34.5 lb/hr, and 139 sq ft -- the definition point. Every output is
linear in the gross output, so doubling the Btu/hr doubles all three.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["pipefitting", "plumbing"]`) placed with the steamfitting tiles **past the
exact-count-audited `// Group B: Plumbing` .. `// Group C: HVAC` block** (beside `steam-prv-napier`), so the Group B
audit count is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the ABMA/ASME definition,
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`boiler-horsepower` -> `computeBoilerHorsepower`); `scripts/related-tiles.mjs` (-> `boiler-pipe-sizing` /
`steam-pipe-velocity` / `steam-trap-sizing`); `data/search/aliases.json` (5 collision-checked aliases: "boiler
horsepower", "boiler btu to horsepower", ...); the calc-pipefit `PIPEFIT_RENDERERS` map entry via a hand-written
renderer (one gross-output number field) and the id added to the calc-pipefit declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning the example, the three ABMA factors, the definition point, the linear scaling, and the error seams. The
calc-pipefit.js gzip cap (raised to 22500 B in this spec) covers the addition. Verify at build, including `check-shells`.
Lazy-loaded, absent from home first paint. Home tile count 1,213 -> 1,214.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 14.94 BHP, 515 lb/hr,
2,076 sq ft EDR for a 500,000 Btu/hr boiler).

## 5. Roadmap position

Fills the missing primary conversion in the steam block: how a boiler is rated (Btu/hr, BHP) against what it covers
(steam lb/hr, EDR sq ft). Opens the post-inverse batch -- new forward coverage in thin trades modules (steam/boiler,
survey, machining, pool) under the spec-v106 charter. Further steam-plant tiles stay evidence-driven.
