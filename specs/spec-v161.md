# roughlogic.com Specification v161 -- Filled Pipe Support Load (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 626, package 0.76.0; v157-v162 of the batch). Batch spec-v157..v163 (plumbing/pipefitting -- steamfitting, pressure
> piping, and pipe support).** In-scope catalog expansion under the spec-v106 trades-only charter: the
> load half of a support pair completed by the hanger-rod tile (v162). Adds one tile to
> **`calc-pipefit.js`** (Group B); no new module, group, or dependency. Inherits spec.md through
> spec-v160.md.
>
> **The gap, and the evidence for it.** `pipe-support-spacing` (IPC 308.5) gives the maximum hanger
> spacing and the hanger count, but never the load each hanger carries -- and that load is the input every
> hanger, rod, and attachment is then sized to. The operating load on a hanger is the pipe's own weight
> plus the weight of the water (or other fluid) filling it plus the insulation, all per foot, times the
> span between hangers. The catalog has a generic shop-weight tile (`metal-weight`, weight of a bare
> shape) but nothing that builds the MSS SP-58 operating support load -- empty pipe plus contents plus
> insulation per foot, then per hanger -- which is a different number for a different purpose.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pipe
OD/ID, wall, and insulation thickness are a length (`L`, in); the material and fluid densities are a mass
per volume (`M/L^3`); the empty, fluid, insulation, and filled per-foot weights are a mass per length
(`M/L`, lb/ft); the support spacing is `L` (ft); the per-hanger load is a mass (`M`, lb, the field
convention for a support load). The v18/v21 contract: any non-finite input, a non-positive OD, wall, or
spacing, a wall at or above half the OD (degenerate bore), or a negative density/thickness returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the additive support-load buildup by
name; `editionNote` names **MSS SP-58** (the pipe-support standard the operating load feeds) and notes
that bundled pipe weights are nominal mill values and the water density is taken at 62.4 lb/ft^3 -- a hot
or dense fluid changes the contents weight, and concentrated loads (valves, flanges) are added
separately.

## 2. The tile

### 2.1 `pipe-filled-support-load` -- Empty, Filled, and Per-Hanger Support Load

```
inputs:
  od_in            L          pipe outside diameter, in
  wall_in          L          pipe wall thickness, in
  pipe_density     M/L^3      pipe material density (steel 490, copper 558 lb/ft^3; default steel)
  fluid_density    M/L^3      contents density (water 62.4 lb/ft^3; default water)
  insul_thk_in     L          insulation thickness, in (default 0)
  insul_density    M/L^3      insulation density (default ~ 6 lb/ft^3 mineral wool)
  spacing_ft       L          hanger spacing, ft (from pipe-support-spacing)

id_in        = od_in - 2 x wall_in                                  # guarded: id_in > 0
empty_lbft   = (pi/4) x (od_in^2 - id_in^2)/144 x pipe_density
fluid_lbft   = (pi/4) x (id_in^2)/144 x fluid_density
insul_lbft   = (pi/4) x ((od_in + 2 x insul_thk_in)^2 - od_in^2)/144 x insul_density
filled_lbft  = empty_lbft + fluid_lbft + insul_lbft
per_hanger   = filled_lbft x spacing_ft
```

**Pinned worked example.** 4 in Sch 40 steel (OD 4.5 in, wall 0.237 in, ID 4.026 in), water-filled, no
insulation, 14 ft spacing: `empty = 10.79 lb/ft` (nominal), `fluid = (pi/4)(4.026^2)/144 x 62.4 = 5.52
lb/ft`, `filled = 16.31 lb/ft`; `per_hanger = 16.31 x 14 = ` **228 lb**.
**Cross-check (add insulation).** Same pipe with 1 in mineral-wool insulation. **As-landed correction:**
the spec draft stated "~ +2.0 lb/ft -> filled 18.3 -> 256 lb," but the insulation formula at the spec's
own default 6 lb/ft^3 mineral-wool density gives `insul = (pi/4)((4.5 + 2)^2 - 4.5^2)/144 x 6 = 0.72
lb/ft` -> filled `17.04 lb/ft` -> `per_hanger = 17.04 x 14 = 239 lb`. The landed tile and its pinned
fixtures use the correct computed value (239 lb), per the catalog-correctness discipline (hand-verify
every worked example against compute output before pinning). The contents and insulation are additive;
the spacing is the lever that turns lb/ft into the load a single hanger carries.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting","plumbing"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the additive load buildup, `editionNote` naming MSS SP-58, the
nominal-mill-weight and 62.4-lb/ft^3 caveats, and the separate concentrated-load note);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`pipe-filled-support-load` -> `computePipeFilledSupportLoad` in `../../calc-pipefit.js`);
`scripts/related-tiles.mjs` (-> `hanger-rod-sizing` / `pipe-support-spacing` / `pipe-volume`);
`data/search/aliases.json` ("pipe weight", "filled pipe weight", "support load", "hanger load",
"water filled pipe", "pipe load per foot"); the id appended to the existing pipefit renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning the example, the cross-check, and error seams (non-finite, OD/wall/spacing <= 0,
`wall >= od/2`, negative density/thickness). Raise the `calc-pipefit.js` size cap by ~20 percent if
needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the empty/fluid/insulation/filled stack and
the per-hanger line wrap on a phone); render-no-nan + a11y sweep, output read to the value (4 in Sch 40,
water, 14 ft -> 16.31 lb/ft, 228 lb/hanger).

## 5. Roadmap position

The load half of the support pair: its `per_hanger` output is the input to `hanger-rod-sizing` (v162),
and it complements `pipe-support-spacing` (which sets the spacing this tile consumes). Together the three
take a fitter from pipe size to spacing to load to rod diameter. Further support growth (trapeze sizing,
seismic bracing screen) stays evidence-driven.
