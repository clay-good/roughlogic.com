# roughlogic.com Specification v694 -- Well Sustainable Yield from Specific Capacity (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M,
> water), no new module, group, or dependency. Inherits spec.md through spec-v693.md.
>
> **The gap, and the evidence for it.** Spec-v16 (`well-drawdown`) runs the well relation forward: given a discharge and
> the water levels, it returns the drawdown and specific capacity. The pump-sizing question a well contractor asks is the
> inverse -- **how hard can I pump this well without pulling the water below the pump**. The forward tile makes you guess
> discharge rates and re-read the drawdown; the inverse solves it directly. From `specific_capacity = discharge /
> drawdown`, `max_yield = specific_capacity x allowable_drawdown`, where the allowable drawdown is the head from the
> static level down to a safe level above the pump intake. The number this settles: a 1.0 GPM/ft well with 30 ft of
> usable drawdown yields **30 GPM**; a marginal 0.3 GPM/ft well with 40 ft yields only **12 GPM**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`well-drawdown` sibling: the specific capacity is `L^2 T^-1` (GPM per ft, matching the forward's dims), the allowable
drawdown is `L` (ft), and the returned yield is `L^3 T^-1` (GPM) -- so `yield = specific_capacity x drawdown` is
dimensionally exact. It reuses the sibling's 0.5 GPM/ft marginal-well threshold. The v18/v21 contract: any non-finite
input, or a non-positive specific capacity or allowable drawdown, returns `{ error }`. Citation discipline (v19/v22):
AWWA A100 / USGS well-testing methods, the specific-capacity relation solved for yield, by name and `GOVERNANCE.water`
matching the sibling; the note states that **the specific capacity comes from a step-drawdown test or the well-drawdown
tile, the allowable drawdown is static level to a safe level above the pump intake, specific capacity declines with rate
(well losses) so this linear estimate holds near the tested rate and overstates the yield far above it (confirm with a
constant-rate test), a specific capacity below 0.5 GPM/ft is a marginal well, and a pumping test and a licensed well
driller govern**.

## 2. The tile

### 2.1 `well-max-yield` -- Well Sustainable Yield from Specific Capacity

```
inputs:
  specific_capacity_gpm_ft   GPM/ft   from a step test or the well-drawdown tile (> 0)
  allowable_drawdown_ft      ft       static level to a safe level above the pump intake (> 0)

max_yield_gpm = specific_capacity_gpm_ft x allowable_drawdown_ft
marginal = specific_capacity_gpm_ft < 0.5
```

**Pinned worked example (a good well).** specific capacity = 1.0 GPM/ft, allowable drawdown = 30 ft:
`max_yield = 1.0 x 30 = ` **30 GPM**; pumping 30 GPM through `well-drawdown` (static 50, pumping 80) returns a specific
capacity of 1.0 GPM/ft, the input. **Cross-check (a marginal well).** specific capacity = 0.3 GPM/ft, allowable drawdown
= 40 ft: `max_yield = ` **12 GPM** -- and the 0.3 GPM/ft is flagged as a marginal well (below the 0.5 GPM/ft threshold).

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`) placed in the LATER Group M section beside `uv-required-exposure`,
NOT beside `well-drawdown` in the original block -- the Group M audit-coverage test asserts exactly 34 ids in the
`// Group M: Water`..`// Group N` block, so the row must stay out of it; a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (specific-capacity relation solved for yield, `GOVERNANCE.water` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`well-max-yield` ->
`computeWellMaxYield` in `../../calc-water.js`); `scripts/related-tiles.mjs` (-> `well-drawdown` / `pump-tdh` /
`pump-eff-w2w` / `detention-time`, and the forward tile links back); `data/search/aliases.json` ("sustainable well
yield", "max gpm from specific capacity", "how hard can i pump a well", plus adjacent rows);
`WATER_RENDERERS["well-max-yield"]` via a hand-written renderer (the module's `makeNumber` / `makeOutputLine` /
`attachExampleButton` / `debounce` / `fmt` / `_v16w_readNum` helpers, mirroring `well-drawdown`) and the id added to the
calc-water declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the marginal-well flag, the
round-trip through `computeWellDrawdown`, and the error seams. The calc-water.js gzip cap is expected to hold (verify at
build, including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 30 GPM for a 1.0 GPM/ft well with 30 ft of drawdown).

## 5. Roadmap position

Pairs the forward well tile (`well-drawdown`, specific capacity from a test) with its inverse (yield from the specific
capacity), the two halves of the well-pump sizing question. Further Group M growth stays evidence-driven.
