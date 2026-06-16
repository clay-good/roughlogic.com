# roughlogic.com Specification v82 -- calc-fire.js Cap-Relief Split (Technical Rescue & Confined-Space Bench)

> **Implementation status: CLOSED 2026-06-16 (package stamped 0.63.13, a patch;
> catalog holds at 624 tiles, 25 groups; modules 44 -> 45).** v82 inherits
> everything from spec.md through spec-v81.md and changes none of it. It is a
> platform-only / housekeeping spec in the same spirit as spec-v70 through
> spec-v81 (and spec-v10, spec-v36, spec-v39, spec-v42): it **adds no tiles,
> removes no tiles, and changes no calculator output** -- only the on-disk module
> layout changes.
>
> **The gap, and the evidence for it.** After v81 relieved `calc-hvac.js`, the
> standing module-cap watch (spec-v81 §5) named `calc-fire.js` as the next
> calc-module split candidate. It was the tightest remaining calculator module in
> the repo at **94.9% of its 27 KB gzip cap (25622 B)**. Restoring headroom is
> what keeps the next Group F fire-ground tile unblocked without another cap bump.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What moves

The cohesive **spec-v3 technical-rescue batch** -- three contiguous,
self-contained tiles that sit together in the source file (the "v3 utilities
159 through 161" block, after the v2 reverse-lay / sprinkler / braking block
and before the `FIRE_RENDERERS` map) -- is extracted from `calc-fire.js` into a
new module `calc-rescue.js` (`RESCUE_RENDERERS`). The unifying theme is distinct
from the fire-suppression hydraulics that stay behind (hose friction, pump
discharge pressure, hydrant flow, required fire flow, master-stream and aerial
reach, foam, reverse-lay, sprinkler density, standpipe friction): these three
are **life-safety / rescue-rigging calcs** -- confined-space ventilation timing,
rope-rescue mechanical advantage, and sling-angle load tension.

| Tile id | Name | Source |
|---|---|---|
| `confined-space-purge` | Confined-space air-change purge time `t (min) = (V*N)/CFM`, per OSHA 1910.146 | spec-v3 §2.6 |
| `rope-ma` | Rope-rescue mechanical advantage across rig types (theoretical MA, actual MA after `efficiency^pulleys` losses, haul force), per NFA/NFPA training literature | spec-v3 §2.6 |
| `sling-angle` | Sling-angle load multiplier `L = W/(n*sin(theta/2))` with the choker 0.75 derate, the spec-v27 D/d bend-efficiency curve, and the low-angle (~30 deg) hazard flag, per ASME B30.9 | spec-v3 §2.6 |

**All three KEEP `group: "F"`** -- a tile's group letter is independent of the
module that holds it (the spec-v28 / spec-v30 / spec-v36 / spec-v39 / spec-v42 /
spec-v70 .. spec-v81 precedent). Their ids, citations, worked examples,
dimensional annotations, and behavior are byte-for-byte unchanged. The cut is
clean: the bench carries its **own scoped `./ui-fields.js` import block** -- the
aliased `_DF`/`_debF`/`_mnF`/`_msF`/`_moF`/`_aeF`/`_fmtF` set, which was used by
nothing else in `calc-fire.js` (so it moves out whole, leaving no orphaned
import behind) -- and the per-module **`_finiteGuard`** (copied verbatim,
non-exported so it adds no v14 derivation-corpus row; the helper also remains in
`calc-fire.js`, which still uses it for its other tiles, so the split leaves
**no cross-module import**). The block's only lookup tables -- `ROPE_RIGS` and
the `_V27_DD_EFFICIENCY` bend-efficiency curve with its `_v27SlingDDEfficiency`
interpolator -- are local to the moved tiles and travel with them unchanged. The
moved compute functions are verbatim, along with their exported worked-example
constants (`confinedSpacePurgeExample`, `ropeMAExample`, `slingAngleExample`)
and the exported `ROPE_RIGS` table. The remaining Group F fire tiles (the v1
fire-ground core, the v2 reverse-lay / sprinkler / standpipe bench, the v7 ISO
NFF, the v9 SCBA / NFPA 1142 / confined-space-vent set, the v15 standpipe-PDP /
smoke-ejector pair, the v23 fire-stream / sprinkler-K pair, and the v20
elevation-loss / water-supply-duration pair) stay in `calc-fire.js`.

## 2. As-landed sizes

- `calc-fire.js`: **25622 B -> ~22814 B** gzipped; cap lowered 27000 ->
  **24500** to lock in the freed space (now ~93.1% of the new cap).
- `calc-rescue.js` (new): **~4.4 KB** gzipped; cap **5500** (current +
  headroom). Lazy-loaded on first open of one of its tiles, so it is **not in
  the home-view first-paint payload** (the spec-v10 §H.2 budget is unaffected;
  it ticks only from the `app.js` declare change).

## 3. Wiring repointed (every reference gated)

`app.js` (the three ids move from the `FIRE_RENDERERS` declare to a new
`RESCUE_RENDERERS` declare for `./calc-rescue.js`); `scripts/build.mjs` `FILES`;
`sw.js` precache `SHELL_ASSETS`; `scripts/check-module-sizes.mjs` (lower the
source cap, add the new module's cap); `scripts/check-dimensions.mjs`
(`GRADUATED_MODULES` gains `calc-rescue.js`, since the moved functions carry
full `// dims:` annotations); `test/fixtures/compute-map.js` (the three ids ->
`../../calc-rescue.js`); `test/unit/bounds-fuzzer.test.js` (the focused import
line for the three moved compute fns repointed to a new `../../calc-rescue.js`
import); `test/unit/calc-fire-v3.test.js` (the whole import block -- compute
fns, worked-example constants, and the `ROPE_RIGS` table -- repointed to
`../../calc-rescue.js`); `test/unit/calc-v27.test.js` and
`test/unit/cross-tile-invariants.test.js` (the focused `computeSlingAngle` /
`computeRopeMA` / `computeConfinedSpacePurge` imports repointed); and the
regenerated v14 corpus (`docs/derivations.md` -- the moved functions change file
attribution; the tile-index is tile-id-keyed and unchanged). `tools-data.js`,
`tile-meta.js`, `citations.js`, `test/fixtures/worked-examples.json`,
`docs/audit-trail.md`, and `scripts/related-tiles.mjs` reference tiles by **id**
(group-keyed, not module-keyed) and need **no change**. No import is orphaned in
`calc-fire.js` (the bench used only the aliased `ui-fields.js` imports -- which
move out whole -- and `_finiteGuard`, which the remaining tiles still use). The
README catalog-count gate (`check-readme-counts`) agrees at **45 modules**; the
wiring lint reports **45 renderer modules / 624 tile-id entries**.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates);
`npm test` (5,534 unit tests, unchanged -- the bounds-fuzzer, calc-fire-v3,
calc-v27, and cross-tile-invariants rows now import the three moved functions
from the new module); `npm run build` (624 tile shells, 25 group shells,
regenerated sitemap); `npm run data:verify`; the full-catalog render-no-nan
Chromium sweep, the a11y gate, and the 320 px shell-mobile / responsive-stress
sweeps on both Chromium and WebKit (the three moved tiles render identically
from the new module). The moved tiles' pinned worked examples (confined-space-purge
1000 ft^3 / 200 cfm / 7 purges -> 35 min; rope-ma 4:1 at 0.9 efficiency ->
4 * 0.9^3 actual MA; sling-angle basket 60 deg 2000 lb / 2 legs -> 2000 lb per
leg) re-verify to the digit.

## 5. Roadmap position

v82 is housekeeping, not growth. After it, `calc-fire.js` has headroom for the
next Group F tile again. The standing module-cap watch continues on the
next-tightest registries and modules -- `tile-meta.js`, `citations.js`, and
`tools-data.js` (the flat per-tile registries, relieved by documented cap bumps
when a tile lands) and the next calc-module split candidates `calc-cross.js`,
`calc-agriculture.js`, and `calc-kitchen.js` (now among the tightest renderer
modules at ~93-95% of cap). Further catalog growth should be evidence-driven (a
named gap a working tradesperson hits), not catalog-filling, per the spec-v69 §5
guidance.
