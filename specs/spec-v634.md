# roughlogic.com Specification v634 -- Required Plastic Section Modulus for a Steel Beam (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`** (Group E,
> steel), no new module, group, or dependency. Inherits spec.md through spec-v633.md.
>
> **The gap, and the evidence for it.** Spec-v314 (`steel-beam-flexure`) checks a chosen beam: enter Fy and the
> plastic section modulus Zx, get the flexural capacity `Mn = Fy Zx` and its LRFD/ASD utilization against the demand
> moment. But the designer's first move is the inverse -- "my demand moment is 200 kip-ft, what Zx do I need to pick
> a W-shape?" -- and the forward tile can only be guessed-and-checked into it. Inverting the same compact-section
> relation is one line of algebra and gives the number that indexes into a shapes table. The value this settles: a
> 200 kip-ft LRFD demand on 50 ksi steel needs a plastic section modulus of **53.3 in^3** (pick the lightest W with
> Zx at or above it); design the same moment by ASD and the required Zx jumps to **80.2 in^3**, the 1.5x the two
> methods differ by at this factor split.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`steel-beam-flexure` forward tile: the yield stress is `M L^-1 T^-2` (ksi), the demand moment is `M L^2 T^-2`
(kip-ft), the method selector is `dimensionless`, and the required section modulus is `L^3` (in^3). The resistance
factor `phi_b = 0.90` and the safety factor `Omega = 1.67` are the identical universal AISC factors the forward tile
hardcodes -- not shapes-table lookups. The v18/v21 contract: any non-finite numeric input, a non-positive yield
stress, or a non-positive demand moment returns `{ error }`. Citation discipline (v19/v22): AISC 360 Chapter F
(`Mp = Fy Zx`) inverted by name; the note states that **this is the compact, fully-braced case (Lb <= Lp,
Mn = Mp), the 12 converts kip-ft to kip-in, the designer selects the lightest W-shape whose Zx meets or exceeds the
result (the shape lookup is theirs, exactly as the forward tile takes Zx as an input), and a noncompact or unbraced
beam needs the lateral-torsional-buckling check** -- a design aid, not a stamped member design.

## 2. The tile

### 2.1 `required-section-modulus` -- The Zx to Pick a Beam for a Demand Moment

```
inputs:
  fy            ksi      yield stress (> 0, default 50)
  moment_kipft  kip-ft   demand moment: Mu (LRFD) or Ma (ASD) (> 0)
  method        -        design method: LRFD (phi_b = 0.90) or ASD (Omega = 1.67)

LRFD:  Zx_req = 12 x Mu / (0.90 x Fy)          [in^3]
ASD:   Zx_req = 12 x 1.67 x Ma / Fy            [in^3]
```

**Pinned worked example (an LRFD design).** Fy = 50 ksi, Mu = 200 kip-ft, LRFD: `Zx_req = 12 x 200 / (0.90 x 50) =
2400 / 45 = ` **53.3 in^3** -- select the lightest W-shape with Zx >= 53.3 (a W16x31 at Zx = 54 works). Feeding
53.3 in^3 back into `steel-beam-flexure` returns phi_b Mn = 200 kip-ft, closing the loop. **Cross-check (ASD).**
Same Fy and moment by ASD: `Zx_req = 12 x 1.67 x 200 / 50 = ` **80.2 in^3** -- the service-load ASD design carries
the more conservative required modulus, 1.5x the LRFD value at this Fy.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["structural", "steel"]`, beside `steel-beam-flexure`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (AISC 360 Ch. F inverted, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`required-section-modulus` ->
`computeRequiredSectionModulus` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-beam-flexure` /
`steel-beam-shear` / `steel-camber` where present); `data/search/aliases.json` ("required section modulus",
"required zx", "size a steel beam", "beam selection modulus", plus question rows);
`STEEL_RENDERERS["required-section-modulus"]` via the module's `_simpleRenderer` factory with an LRFD/ASD select
(mirroring `steel-beam-flexure`) and the id added to the calc-steel declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the exact round-trip through `computeSteelBeamFlexure`, the LRFD-vs-ASD ratio, and the error seams
(non-finite, non-positive Fy / moment). Group E has no exact audit-count assertion and the mechanical-governance
test is an explicit list, so no count bump. The calc-steel.js gzip cap is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> Zx_req 53.3 in^3 LRFD).

## 5. Roadmap position

Completes the steel-beam-flexure pair spec-v314 opened: the forward tile checks a chosen Zx, this one sizes the Zx
for a demand moment. Both are AISC 360 Ch. F `Mp = Fy Zx`, one solved each way. Further Group E growth stays
evidence-driven.
