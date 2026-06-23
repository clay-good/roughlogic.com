# roughlogic.com Specification v162 -- Hanger Rod Load and Diameter (MSS SP-58) (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v157..v163 (plumbing/pipefitting -- steamfitting, pressure
> piping, and pipe support).** In-scope catalog expansion under the spec-v106 trades-only charter: the
> rod half of the support pair opened by the filled-load tile (v161). Adds one tile to
> **`calc-pipefit.js`** (Group B); no new module, group, or dependency. Inherits spec.md through
> spec-v161.md.
>
> **The gap, and the evidence for it.** Once the per-hanger load is known (v161), the fitter picks a
> threaded rod from the MSS SP-58 maximum-safe-load table -- 3/8 in carries 610 lb, 1/2 in 1,130 lb, and
> so on, derated at temperature. That single lookup decides the rod stock on the truck and is the most
> common "is this rod big enough" question on a hanger detail, and the catalog has no rod table and no
> sizing tile. `pipe-support-spacing` stops at spacing and count; nothing sizes the rod that the spacing
> implies.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The applied
load and the rod's rated load are a mass (`M`, lb, the support-load convention); the rod diameter is a
length (`L`, in); the temperature derate factor and the utilization are `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive load, a derate factor outside (0,1], or a load that
exceeds the largest tabulated rod after derate returns `{ error }` (the last with a clear
"exceeds-table, engineer the support" message). Citation discipline (v19/v22): `GOVERNANCE.general` over
the rod-selection logic by name; `editionNote` names **MSS SP-58** and states that **the bundled maximum
safe loads are the standard's carbon-steel threaded-rod values at or below 650F**, that the temperature
derate above that is applied from the standard's curve (user factor for an off-table temperature), and
that the engineer of record and the standard's current edition govern the final selection.

## 2. The tile

### 2.1 `hanger-rod-sizing` -- Minimum Hanger Rod Diameter from Load

```
inputs:
  load_lb        M               operating load per hanger, lb (from pipe-filled-support-load)
  temp_derate    dimensionless   rod allowable derate at service temperature (default 1.0)

# bundled MSS SP-58 carbon-steel rod maximum safe loads (<= 650F), lb:
#   3/8 in  610 | 1/2 in 1130 | 5/8 in 1810 | 3/4 in 2710 | 7/8 in 3770 | 1 in 4960
#   1-1/8 in 6230 | 1-1/4 in 8000 | 1-3/8 in 9510 | 1-1/2 in 11630
rated(d)       = table[d] x temp_derate
required_rod   = smallest d such that rated(d) >= load_lb
utilization    = load_lb / rated(required_rod) x 100
```

**Pinned worked example.** 228 lb per hanger (the v161 example), room temperature (derate 1.0): the
smallest rod whose rated load clears 228 lb is **3/8 in** (610 lb), at `228 / 610 = 37 percent`
utilization.
**Cross-check (heavier load steps up two sizes).** 1,200 lb per hanger: 3/8 in (610) and 1/2 in (1,130)
both fall short, so the pick is **5/8 in** (1,810 lb) at `1200 / 1810 = 66 percent`. Each row of the
table is a discrete step; the tile returns the first one that clears the load.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting","plumbing"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the rod-selection logic, `editionNote` naming MSS SP-58, the
650F-baseline and derate caveats, and the EOR-governs note); `test/fixtures/worked-examples.json`
(example + cross-check); `test/fixtures/compute-map.js` (`hanger-rod-sizing` -> `computeHangerRodSizing`
in `../../calc-pipefit.js`); `scripts/related-tiles.mjs` (-> `pipe-filled-support-load` /
`pipe-support-spacing` / `flange-bolt-torque`); `data/search/aliases.json` ("hanger rod", "rod sizing",
"all thread", "threaded rod load", "MSS SP-58", "hanger rod diameter"); the id appended to the existing
pipefit renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, the cross-check, the exceeds-table error, and the
seams (non-finite, load <= 0, derate outside (0,1]). Raise the `calc-pipefit.js` size cap by ~20 percent
if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the exceeds-table path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the rod size,
rated load, and utilization wrap on a phone); render-no-nan + a11y sweep, output read to the value (228
lb -> 3/8 in, 37 percent).

## 5. Roadmap position

Closes the support pair: it consumes the `per_hanger` load from `pipe-filled-support-load` (v161), which
in turn consumes the spacing from `pipe-support-spacing`. The chain pipe-size -> spacing -> load -> rod is
now complete in Group B. Further support growth stays evidence-driven.
