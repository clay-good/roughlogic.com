# roughlogic.com Specification v552 -- Slender Column Moment Magnification, Nonsway (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, the concrete design bench); no new module, group, or dependency. Inherits spec.md through spec-v551.md.
>
> **The gap, and the evidence for it.** `rc-column-axial` gives a column's axial capacity but ignores slenderness. A
> reinforced-concrete column that is slender bends under its own axial load times its lateral deflection -- the P-delta
> effect -- and ACI 318-19 Section 6.6.4 handles it in a braced (nonsway) frame with a moment magnifier. The bench has
> no tile for it, and it hides two catches. The critical buckling load `Pc` in the magnifier's denominator is reduced by
> a `0.75` stiffness factor, and the design moment is floored at a minimum `M2,min = Pu(0.6 + 0.03h)`. The result is a
> cliff: a column that just clears the slenderness limit `k lu/r <= 34 - 12(M1/M2)` needs no magnification, but one a
> hair over it can pick up a 1.3 to 1.7 times amplifier that the flexure check never applies. The tile takes the
> factored axial load and end moments, the unbraced length and effective-length factor, and the effective stiffness, and
> returns the magnifier and the magnified design moment -- the amplified demand a slender column is actually designed
> for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The factored axial load
and the critical buckling load are forces (`M L T^-2`, in kip); the end moments and the magnified moment are `M L^2
T^-2` (in kip-ft); the unbraced length and column dimension are lengths (`L`); the effective stiffness `EI` is
`M L^3 T^-2` (kip-in^2); the `Cm`, `k`, magnifier, and the `0.75` factor are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive axial load, larger end moment, unbraced length, or stiffness, a non-positive effective-
length factor, or an axial load at or above `0.75 Pc` (the column has buckled) returns `{ error }`. Citation discipline
(v19/v22): `ACI` over Section 6.6.4; `editionNote` names **ACI 318-19 Section 6.6.4.5 (nonsway moment magnifier)**,
prints `Cm = max(0.6 + 0.4 x M1/M2, 0.4)`, `Pc = pi^2 x EI / (k x lu)^2`,
`delta_ns = max(Cm / (1 - Pu / (0.75 x Pc)), 1.0)`, and `Mc = max(delta_ns x M2, M2_min)` with
`M2_min = Pu x (0.6 + 0.03 h)`, and states that **the critical buckling load carries a 0.75 stiffness reduction in the
denominator, the design moment is floored at M2,min, a column just over the slenderness limit k lu/r <= 34 - 12(M1/M2)
picks up an amplifier the flexure check never applies, M1/M2 is negative for double curvature, and ACI 318 and the
engineer of record govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `rc-slender-column-magnify` -- The P-Delta Amplifier a Slender Column Picks Up Past the Limit

```
inputs:
  factored_axial_kip   kip     Pu
  end_moment_m2_kft    kip-ft  larger factored end moment M2
  end_moment_m1_kft    kip-ft  smaller end moment M1 (signed: negative for double curvature)
  unbraced_len_ft      ft      lu
  eff_length_k         -       effective-length factor k (1.0 nonsway upper bound)
  eff_stiffness_ei     kip-in2 effective flexural stiffness EI
  column_dim_h_in      in      column dimension h (for M2,min)

Cm       = max(0.6 + 0.4 x (M1/M2), 0.4)
Pc       = pi^2 x EI / (k x lu_in)^2                                [kip]   (lu_in = lu x 12)
delta_ns = max(Cm / (1 - Pu / (0.75 x Pc)), 1.0)                    [-]
M2_min   = Pu x (0.6 + 0.03 x h) / 12                               [kip-ft]
Mc       = max(delta_ns x M2, M2_min)                              [kip-ft]
```

**Pinned worked example (Pu = 200 kip, M2 = 80 kip-ft, M1 = 50 kip-ft single curvature, lu = 14 ft, k = 1.0, EI =
1.5e6 kip-in^2, h = 16 in).** `Cm = 0.6 + 0.4 x (50/80) = 0.85`; `Pc = pi^2 x 1.5e6 / (1.0 x 168)^2 = ` **524.5 kip**;
so `delta_ns = 0.85 / (1 - 200/(0.75 x 524.5)) = 0.85 / 0.492 = ` **1.73**, and the magnified moment is
`1.73 x 80 = ` **138.3 kip-ft** (well above the `M2,min = 18 kip-ft` floor) -- 73% more than the 80 kip-ft the flexure
check alone would use. **Cross-check (a shorter column barely magnifies).** Shorten the unbraced length to `10 ft`:
`Pc` rises to `1,028 kip`, so `delta_ns = 0.85 / (1 - 200/771) = ` **1.15**, and `Mc = ` **91.8 kip-ft** -- the same
loads, but the stiffer, shorter column picks up only a 15% amplifier, the cliff that slenderness controls. The tile
returns Cm, Pc, the magnifier, and the magnified moment.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`ACI`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 14 ft example + the 10 ft cross-check);
`test/fixtures/compute-map.js` (`rc-slender-column-magnify` -> `computeRcSlenderColumnMagnify` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-column-axial` / `column-buckling-wood` /
`concrete-longterm-defl`); `data/search/aliases.json` ("moment magnifier", "slender column", "aci 6.6.4", "p-delta
column", "nonsway magnification", "delta ns", "critical buckling load", "column slenderness"); the id appended to the
concrete renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the Cm relation, the 0.75-Pc denominator, the M2,min floor, the
magnifier bounded at 1.0, and the error seams (non-finite, non-positive Pu / M2 / lu / EI / k, Pu >= 0.75 Pc). Hand-
writes its renderer (mirroring the calc-concrete.js `rc-column-axial` pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the Cm / Pc / magnifier / Mc stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 14 ft example -> magnifier 1.73, Mc 138.3 kip-ft).

## 5. Roadmap position

Adds concrete slenderness beside `rc-column-axial` (the cross-section capacity it amplifies the demand against). A
slenderness-limit screen (does k lu/r clear 34 - 12 M1/M2, so no magnification is needed) and a sway (P-Delta) magnifier
for unbraced frames are deliberate future follow-ons. Further Group E growth stays evidence-driven.
