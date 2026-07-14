# roughlogic.com Specification v760 -- Groove Weld Length for an Applied Load (calc-metalair.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-metalair.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v759.md. Explore sweep #15 (entry 7).
>
> **The gap, and the evidence for it.** The `groove-weld-strength` tile runs AISC J2 forward: from a weld length it returns
> the shear capacity. The detailer's question is the inverse -- **the weld length an applied load needs** at a given
> effective throat. From `capacity = stress_ksi x 1000 x throat x length`, `L = load / (stress_ksi x 1000 x throat)`, with
> `stress_ksi = 0.30 FEXX` (ASD) or `0.75 x 0.60 FEXX` (LRFD). The number this settles: a **100,000 lb** LRFD load on a
> **0.25 in** E70 PJP throat needs about **12.7 in**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`groove-weld-strength` sibling: the applied load carries the sibling's dimensionless lb treatment, the throat and returned
length are `L` (in), the weld type / electrode / method are dimensionless selects, and the stress is dimensionless (ksi).
It reuses the sibling's AISC J2 weld-metal shear (0.60 FEXX, ASD 0.30 FEXX / LRFD 0.75 x 0.60 FEXX) and the CJP/PJP throat
rule, solved for the length. The v18/v21 contract: any non-finite input, a non-positive applied load, or a missing/
non-positive throat for the chosen weld type (PJP effective throat, or CJP thinner-part thickness) returns `{ error }`.
Citation discipline (v19/v22): the capacity relation solved for the length, `GOVERNANCE.structural` matching the sibling;
the note says to **round up, split between joint sides**, and **add for returns and minimum-length rules** (AWS D1.1),
that a **CJP** weld develops the base metal so the shear length governs only the shear case, and that the WPS, inspector,
and engineer of record govern.

## 2. The tile

### 2.1 `groove-weld-length-for-load` -- Groove Weld Length for an Applied Load

```
inputs:
  applied_load_lb       dimensionless applied load (lb, > 0)
  weld_type             dimensionless PJP | CJP
  effective_throat_in   L             PJP effective throat (in) -- required for PJP
  base_thickness_in     L             thinner part thickness (in) -- required for CJP
  electrode             dimensionless E60..E110 (default E70)
  method                dimensionless ASD | LRFD (default ASD)

throat_in         = weld_type == CJP ? base_thickness_in : effective_throat_in
stress_ksi        = method == LRFD ? 0.75 x 0.60 x FEXX : 0.30 x FEXX
required_length_in = applied_load_lb / (stress_ksi x 1000 x throat_in)
```

**Pinned worked example.** load = 100,000 lb, PJP, throat = 0.25 in, E70, LRFD:
`stress = 0.75 x 0.60 x 70 = 31.5 ksi`, `L = 100000 / (31.5 x 1000 x 0.25) = 100000 / 7875 = ` **12.70 in**. Feeding
12.70 in back through `groove-weld-strength` at the same weld returns a 100,000 lb capacity (utilization 1.0), the load. An
ASD basis (21 ksi) on the same throat needs a longer ~19.0 in.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`) placed beside `groove-weld-strength` (Group E is
not exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (capacity relation solved for the
length, `GOVERNANCE.structural` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`groove-weld-length-for-load` -> `computeGrooveWeldLengthForLoad`);
`scripts/related-tiles.mjs` (-> `groove-weld-strength` / `fillet-weld-strength` / `weld-heat-input`);
`data/search/aliases.json` (4 collision-checked question aliases: "groove weld length", "how long a groove weld", ...);
the calc-metalair `METALAIR_RENDERERS` map entry via a hand-written renderer (a weld-type select, a load field, a throat
and a base field, and electrode/method selects) and the id added to the calc-metalair declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeGrooveWeldStrength` (utilization 1.0)
across a load/type/throat/electrode/method sweep, the more-load-more-length, thicker-throat-less-length, and
LRFD-less-than-ASD behavior, and the error seams. The calc-metalair.js gzip cap (raised to 8000 B in this spec) covers the
addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,208 ->
1,209.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 12.70 in for a 100,000 lb
LRFD load on a 0.25 in E70 PJP throat).

## 5. Roadmap position

Pairs the forward groove-weld tile (`groove-weld-strength`, capacity from the length) with its inverse (the length for a
load), the two halves of the groove-weld sizing question. Closes the clean run of Explore sweep #15 (entries #4
growth-final-count and #5 condenser-cop remain as weaker candidates). Further Group E welding growth stays
evidence-driven.
