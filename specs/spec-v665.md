# roughlogic.com Specification v665 -- PVC Conduit Max Run Before an Expansion Fitting (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group A,
> electrical), no new module, group, or dependency. Inherits spec.md through spec-v664.md.
>
> **The gap, and the evidence for it.** Spec-v126 (`conduit-thermal-expansion`) runs NEC 352.44 forward: given a run
> length and a temperature swing, it returns the length change `delta_L = coefficient x (L x 12) x delta_T` and whether
> it crosses the quarter-inch expansion-fitting trigger. The field question is the inverse -- an installer laying a long
> PVC run outdoors wants to know **how long a straight run he can make before he must add a fitting**, i.e. the run
> length at which `delta_L` reaches the 0.25 in trigger. That is `L_max = trigger / (coefficient x 12 x delta_T)`. The
> forward tile never returns it; you would have to guess run lengths and re-check the movement until it hit 0.25 in. The
> number this settles: at a **50 deg F** swing a straight run over about **12.3 ft** reaches the trigger, and at
> **100 deg F** it is about **6.2 ft** -- the run length varies inversely with the swing, which is exactly the reciprocal
> of what the forward tile computes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`conduit-thermal-expansion` sibling: the temperature swing is `T` (deg F, as the sibling labels it), the coefficient is
`dimensionless`, and the trigger and the returned run length are `L` (in and ft). The bundled PVC coefficient
`3.38e-5 in/in/deg-F` and the `0.25 in` trigger are the sibling's editable defaults. The v18/v21 contract: any
non-finite input, or a non-positive coefficient or trigger, or a zero temperature swing (which never reaches the
trigger, so no finite maximum), returns `{ error }`; the magnitude of the swing is used, so its sign does not matter.
Citation discipline (v19/v22): NEC 2023 352.44 (expansion fittings for rigid PVC conduit), solved for the run length;
the note states that **at `L_max` the length change equals the quarter-inch trigger exactly, a longer run needs a
fitting sized for the resulting travel, and the AHJ and the conduit manufacturer govern**.

## 2. The tile

### 2.1 `conduit-expansion-max-run` -- PVC Conduit Max Run Before an Expansion Fitting

```
inputs:
  temp_change_f       deg F  temperature swing max - min (nonzero)
  coeff_in_per_in_f   -      PVC coefficient (> 0, default 3.38e-5)
  trigger_in          in     fitting trigger (> 0, default 0.25)

L_max_ft         = trigger_in / (coeff_in_per_in_f x 12 x |temp_change_f|)   [ft]
delta_l_at_max_in = coeff x (L_max_ft x 12) x |temp_change_f| = trigger_in    [in]  (identity check)
```

**Pinned worked example (a 50 deg F swing).** delta_T = 50 deg F, coeff = 3.38e-5, trigger = 0.25 in:
`L_max = 0.25 / (3.38e-5 x 12 x 50) = 0.25 / 0.02028 = ` **12.33 ft**; feeding 12.33 ft back through
`conduit-thermal-expansion` gives `delta_L = 3.38e-5 x (12.33 x 12) x 50 = ` **0.25 in** exactly, the trigger.
**Cross-check (a wider swing).** delta_T = 100 deg F: `L_max = 0.25 / (3.38e-5 x 12 x 100) = ` **6.16 ft** -- doubling
the swing halves the run, the inverse dependence the forward tile's linear `delta_L ~ delta_T` implies.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `conduit-thermal-expansion`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (NEC 2023 352.44 solved for run length, `GOVERNANCE.electrical` +
`NEC_DISCLOSURE`, the note per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`conduit-expansion-max-run` -> `computeConduitExpansionMaxRun` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `conduit-thermal-expansion` / `raceway-expansion-fitting`
/ `conduit-fill` / `cable-bend-radius`, and the forward tile links back); `data/search/aliases.json` ("max conduit
run", "run length before expansion fitting", "spacing between expansion fittings", plus adjacent rows);
`ELECTRICAL_RENDERERS["conduit-expansion-max-run"]` via a hand-written renderer (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `conduit-thermal-expansion`) and the id
added to the calc-electrical declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the
sign-independence, the round-trip through `computeConduitThermalExpansion`, and the error seams (zero swing, non-positive
coefficient / trigger, non-finite). The Group A audit-coverage test parses only the original `// Group A: Electrical`
block (this tile is in a later section) and asserts a lower bound, so no count bump. The calc-electrical.js gzip cap is
expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 12.3 ft max run at a 50 deg F swing).

## 5. Roadmap position

Pairs the forward NEC 352.44 tile (`conduit-thermal-expansion`, movement from run length) with its inverse (run length
from the trigger), the two halves of the PVC-expansion question. Further Group A growth stays evidence-driven.
