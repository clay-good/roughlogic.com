# roughlogic.com Specification v1036 -- Manning Gravity-Flow Family Rehomed to calc-drainage.js (3 Tiles Moved, 0 New Tiles)

> **Status: LANDED (2026-07-27). Refactor spec -- no new tiles, no behavior change.**
> Moves `manning-slope`, `manning-pipe-capacity`, and `pipe-partial-flow-depth`, plus the `MANNING_ROUGHNESS`
> table they share, from **`calc-plumbing.js`** into the existing **`calc-drainage.js`**. Inherits spec.md
> through spec-v1035.md. Second step of the cap-relief work begun in spec-v1030.
>
> **Why.** spec-v1030 §2 recorded that `MANNING_ROUGHNESS` straddles the boundary of any wider site-water split:
> it is read by exactly these three tiles and no others. That shared constant was the specific thing blocking the
> larger split, so moving the three together removes the blocker. They go to `calc-drainage.js` rather than a new
> module because **Manning's equation is gravity drainage** -- `roof-drain-sizing` and `sewage-force-main-velocity`
> already live there, and `calc-drainage.js` was itself created by this same cap-relief pattern out of
> `calc-plumbing.js` (spec-v73).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moved

| Tile | Was | Now |
|---|---|---|
| `manning-slope` | calc-plumbing.js | calc-drainage.js |
| `manning-pipe-capacity` | calc-plumbing.js | calc-drainage.js |
| `pipe-partial-flow-depth` (spec-v1011) | calc-plumbing.js | calc-drainage.js |

Plus the `MANNING_ROUGHNESS` table and the `THETA_MAX_Q` / `THETA_MAX_V` partial-flow turning-point constants.
All three keep `group: "B"`; ids, inputs, outputs, citations, worked examples, and dimensional annotations are
unchanged.

## 2. Why this one needed care

Unlike the spec-v1030 tail block, this family uses the **older split `// --- Utility N ---` layout**: the code sits
in three non-contiguous regions, with `computeManningSlope` around line 1016 and its renderer around line 1346,
several hundred lines apart. Extraction was done by explicit named boundaries and verified by conservation --
`calc-plumbing.js` went 61 -> 58 renderers and `calc-drainage.js` 6 -> 9, so nothing was dropped or duplicated.

Three couplings had to be chased that a naive move would have missed, each caught by a gate rather than by reading:

1. **Four other test files** imported the moved symbols from `calc-plumbing.js`
   (`calc-plumbing-v3.test.js`, `cross-tile-invariants.test.js`, and two separate import blocks in
   `bounds-fuzzer.test.js`), including `MANNING_ROUGHNESS` and `manningSlopeExample` -- not just the compute
   functions.
2. **`renderManningSlope` is an exported renderer**, imported by the fuzzer's exported-renderer DOM-sentinel test.
3. **Its `// dims:` annotation sat one line above the function**, outside the extraction boundary. Losing it failed
   `check-dimensions` with "graduated module calc-drainage.js: renderManningSlope missing dims annotation" -- the
   Phase C ratchet caught it exactly as designed.

## 3. Result

| | before | after |
|---|---|---|
| `calc-plumbing.js` | 69,039 B gz (90.8%) | **65,468 B gz (86.1%)** |
| `calc-drainage.js` | 7,923 B gz (88.0% of 9,000) | **12,049 B gz (80.3% of 15,000)** |

`calc-drainage.js`'s cap is raised 9,000 -> 15,000. Raising is the correct call for a module this size; a split is
the remedy for the large ones. Across spec-v1030 and this spec, `calc-plumbing.js` has gone **99.4% -> 86.1%**.

## 4. Wiring

`app.js` (three ids moved between the two `declare(...)` lists), `test/fixtures/compute-map.js` (3 module paths),
`test/unit/bounds-fuzzer.test.js` + `test/unit/calc-plumbing-v3.test.js` + `test/unit/cross-tile-invariants.test.js`
(import repaths), `scripts/check-module-sizes.mjs` (dated cap-ledger entry), and the regenerated corpus /
derivations artifacts. `calc-plumbing.js` keeps a split-note comment naming the destination. No new module, so the
five new-module scaffolding spots do not apply and the module count is unchanged.

## 5. Verification

Behavior-preserving, so the evidence is that nothing changed: renderer-count conservation (61->58 and 6->9), full
`npm run lint` (all gates including `check-dimensions`), **5,875 unit tests passing with 0 failures** -- the same
count as before -- `npm run build`, and check-dist / shells / module-sizes / shell-mobile / csp / readme-counts /
data:verify. All three moved tiles were **render-verified in a real browser** via the targeted Playwright a11y run,
the failure mode a module move actually risks.
