# roughlogic.com Specification v800 -- Water-Cementitious Ratio and Exposure Cap (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec. The v800 milestone.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v799.md. Explore sweep #23 (entry 4), closing
> the concrete-QC cluster (yield / fineness-modulus / w-cm).
>
> **The gap, and the evidence for it.** The **water-cementitious ratio** is the single strongest lever on concrete
> strength and durability, and no tile computes it. `w/cm = mixing water / total cementitious`. The number this settles:
> 282 lb water over 470 lb cement + 94 lb fly ash (564 cementitious) is **0.50**, which exceeds the ACI 318 Table
> 19.3.2.1 cap of **0.45** for severe freeze-thaw or sulfate exposure. Grep confirmed no water-cement / w/cm tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`concrete-yield`, `ready-mix-concrete-order`): the water, cement, and SCM masses carry `M`, the
exposure class is dimensionless, the ratio is dimensionless, and the cementitious total carries `M`. The exposure caps
are the ACI 318 Table 19.3.2.1 values, selected by class. The v18/v21 contract: a non-finite input (via `_finiteGuard`),
an unknown exposure class, a non-positive water or cement mass, or a negative SCM mass returns `{ error }`; the "no cap"
class returns a `null` pass/fail. Citation discipline (v19/v22): water-cementitious ratio and exposure caps by name (ACI
318 Table 19.3.2.1; ACI 211.1), `GOVERNANCE.general` matching the siblings; the note states that w/cm counts all
supplementary cementitious materials in the denominator, that lower w/cm means lower permeability, the exposure caps,
that the water must include aggregate free moisture and admixture water, and that this checks the durability cap only
(strength, minimum cementitious, and air are separate).

## 2. The tile

### 2.1 `water-cement-ratio` -- Water-Cementitious Ratio and Exposure Cap (ACI 318)

```
inputs:
  water_lb          total mixing water incl. aggregate free moisture + admixture water (lb)
  cement_lb         portland cement (lb)
  scm_lb            supplementary cementitious materials -- fly ash / slag / pozzolans (lb)
  exposure_class    none | f1 (0.55) | w_s1 (0.50) | f2_s2 (0.45) | f3_c2 (0.40)

wcm            = water_lb / (cement_lb + scm_lb)
passes         = cap === null ? null : wcm <= cap
```

**Pinned worked example.** Water 282 lb, cement 470 lb, fly ash 94 lb, exposure F2/S2 (cap 0.45): `cementitious = 564`;
`w/cm = 282 / 564 = ` **0.50**, which **exceeds** the 0.45 cap (reduce water or add cementitious). Dropping the water to
225 lb gives 0.399, which passes; counting the SCM in the denominator lowers the ratio versus cement alone.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]` -- kept off the near-cap construction trade so its group shell
stays under budget) beside `concrete-yield`; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (ACI 318 Table
19.3.2.1, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example, two pinned outputs);
`test/fixtures/compute-map.js` (`water-cement-ratio` -> `computeWaterCementRatio`); `scripts/related-tiles.mjs` (->
`concrete-yield` / `fresh-concrete-temp` / `fineness-modulus`); `data/search/aliases.json` (5 collision-checked aliases:
"water cement ratio", "w/cm ratio", "max w/c for freeze thaw concrete", ...); the calc-construction
`CONSTRUCTION_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no DOM-sentinel row) with an
exposure-class select, and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the ratio, the SCM-in-denominator behavior, the cap pass/fail, and the error seams. The calc-construction.js gzip
cap is unchanged. Verify at build, including `check-shells` (the group-shell gzip cap). Lazy-loaded, absent from home
first paint. Home tile count 1,248 -> 1,249.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (282/564 -> 0.50, exceeds the 0.45 cap).

## 5. Roadmap position

Closes the sweep-23 concrete-QC cluster -- yield (ASTM C138), fineness modulus (ASTM C136), and water-cementitious ratio
(ACI 318) -- at the v800 milestone, rounding out the batch-and-materials QC set beside the ready-mix order and
fresh-concrete-temperature tiles. The catalog is now very saturated (sweep #23 confirmed near-completeness); the next
batch will need a fresh sweep into a less-mined trade domain. Stays evidence-driven.
