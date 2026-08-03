# roughlogic.com Specification v1196 -- Soil Activity (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-03). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1195.md.
>
> **The gap, and the evidence for it.** The landed `atterberg-indices` tile (spec-v328) names its own limit in its note and
> citation: it "does not compute the shrink-swell potential, the **activity**, or the coarse-fraction sieve classification."
> Skempton's activity is the single-number index that separates a benign clay from an expansive one, and no tile computes it
> (grep confirmed no activity / expansive-clay tile exists). A soil can read a modest plasticity index and still be strongly
> expansive if its clay fraction is small -- exactly the case the plasticity index alone hides and the activity reveals.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
soil-QC siblings (`atterberg-indices`, `soil-gradation-coefficients`): the liquid and plastic limits, the clay fraction,
the plasticity index, and the activity are all dimensionless. The v18/v21 contract: a non-finite input (via
`_finiteGuard`), a non-positive limit, a nonplastic soil (`PL >= LL`), or a clay fraction outside `(0, 100]` returns
`{ error }`. Citation discipline (v19/v22): Skempton (1953) activity by name, `GOVERNANCE.general` matching the siblings;
the note states the definition, the inactive/normal/active bands, the mineral reference values, and that activity is a
mineralogy/swell screen rather than a heave calculation. **No copyrighted table is reproduced** -- the definition and its
bands are public geotechnical results; PI comes from the ASTM D4318 limit tests and the clay fraction from the ASTM
D7928 / D422 hydrometer analysis (the user's own data).

## 2. The tile

### 2.1 `soil-activity` -- Soil Activity (Skempton)

```
inputs:
  ll, pl               liquid and plastic limits (%, LL > PL)
  clay_fraction_pct    percent by mass finer than 2 microns (0 < CF <= 100)

PI = LL - PL
A  = PI / clay_fraction_pct
class: A < 0.75 inactive (kaolinite ~0.4) | 0.75-1.25 normal (illite ~0.9) | A > 1.25 active (Na-montmorillonite higher)
```

**Pinned worked example.** LL = 52, PL = 22 so PI = 30; clay fraction 25% gives `A = 30 / 25 =` **1.20**, normal
(illite-like). The insight the fuzzer pins: the same PI = 30 on only 15% clay is `A = 2.0` (active), and on 50% clay is
`A = 0.6` (inactive) -- the activity, not the plasticity index, flags the swelling clay. The 0.75 and 1.25 band edges both
classify as normal (inactive is strictly below 0.75, active strictly above 1.25).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, mirroring `atterberg-indices`) beside
`atterberg-indices`; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (Skempton 1953 / ASTM D4318 / D7928,
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example, pinning `pi` and `activity`);
`test/fixtures/compute-map.js` and `test/fixtures/renderer-map.js` (spec-v1191 reachability parity);
`scripts/related-tiles.mjs` (-> `atterberg-indices` and back, plus the soil siblings); `data/search/aliases.json`
(5 collision-checked aliases; alias shards regenerated); the calc-earthwork `EARTHWORK_RENDERERS` map entry via a
hand-written renderer (non-exported, so no DOM-sentinel row) with the three inputs, and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index. Home tile count 1,568 -> 1,569 (index.html JSON-LD + hero lede, AGENTS.md). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (LL 52 / PL 22 / 25% clay -> A 1.20, normal).

## 5. Roadmap position

Closes a self-declared gap: the Atterberg tile gave the plasticity numbers but explicitly deferred the activity that turns
them into a mineralogy and expansiveness read. The pair now covers both, beside the gradation coefficients and the
fineness modulus on the soil / concrete-materials QC bench.
