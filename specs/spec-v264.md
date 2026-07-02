# roughlogic.com Specification v264 -- Wood Bending Member Shear and Notched-End Reduction (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.91.0; was PROPOSED 2026-07-02). Batch spec-v263..v265 (the sawn-lumber design trio). This spec is the middle limit
> state: horizontal (rolling) shear near the supports, and the collapse in allowable shear the moment someone notches the
> beam over a bearing -- the single most common field detail that quietly halves a joist's end capacity.)**
> In-scope catalog expansion under the spec-v106 trades-only charter. `wood-beam-bending` (v263) sizes the beam for moment
> at midspan; this tile covers the other governing stress, the horizontal shear that peaks at the ends, and -- the reason
> the tile earns its keep -- the NDS notch rule that a rectangular notch cut in the tension face at a support concentrates
> that shear and reduces the allowable end reaction by the square of the depth ratio. Adds one tile beside
> `wood-beam-bending` and `column-buckling-wood` in **`calc-construction.js`** Group E; no new group, module, trade, or
> dependency. Inherits spec.md through spec-v263.md.
>
> **The gap, and the evidence for it.** Horizontal shear in a rectangular wood beam is `fv = 3V / (2 b d)`, so the
> allowable end shear of an un-notched member is `V = (2/3) Fv' b d`. That much a designer can do in their head; the catalog
> does not, and more to the point it does nothing with the case that actually governs. When a joist or beam is notched on
> the tension side at the end -- to drop it flush over a ledger, to clear a pipe, to seat it in a pocket -- NDS 3.4.3.2
> replaces the depth `d` with the *net* depth `dn` at the notch and multiplies by `(dn/d)^2`, so the allowable end reaction
> becomes `V' = (2/3) Fv' b dn (dn/d)^2`. That squared term is brutal: a 4x12 rated for `4,725 lb` of end shear un-notched,
> notched 2 in to a net `9-1/4 in` depth, is allowed only `2,626 lb` -- a `44%` loss from a two-inch cut, because the
> re-entrant corner of the notch is a crack starter and the code prices it accordingly. Field carpenters notch beam ends
> constantly; nothing in the catalog tells them what it costs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The adjusted shear value
`Fv'` (reference `Fv` times all applicable factors, user-supplied) is a stress (psi); the breadth `b`, full depth `d`, and
net depth at the notch `dn` are lengths (in); the applied end shear `V_applied` is a force (lb); the allowable un-notched
end shear `Vr`, the allowable notched end shear `Vr_notch`, and the actual shear stress `fv` are a force and a stress
respectively; the depth ratio `dn/d` and the demand/capacity ratio are dimensionless. The v18/v21 contract: any non-finite
input, a breadth, full depth, or `Fv'` at or below zero returns `{ error }`; a net depth `dn` at or below zero, or `dn`
greater than the full depth `d` (a notch cannot be deeper than the beam), returns `{ error }`; a negative applied shear
returns `{ error }`. When `dn` equals `d` (no notch) the notched result equals the un-notched result -- the `(dn/d)^2`
factor is 1.0 and the two allowables coincide, the continuity seam the fuzzer pins. Citation discipline (v19/v22):
`GOVERNANCE.general` over the NDS shear provisions by name; `editionNote` names **the rectangular-section shear stress
`fv = 3V / (2 b d)` (NDS 3.4.2) and the notched-bending-member rule `V' = (2/3) Fv' b dn (dn/d)^2` for a notch on the
tension side at the end of a bending member (NDS 3.4.3.2)** and states that **`Fv'` is the reference shear value already
multiplied by every applicable adjustment factor -- the user supplies it, and the reference `Fv` and the factors come from
the NDS Supplement for the actual species, grade, and service condition; this is the tension-side end-notch case only, and
does not cover notches on the compression side (a different rule), notches away from the support, the special provisions
for sloped or bevel-cut notches, round notches, or the `Cvr` shear-reduction factor for members with connections in the
shear zone; loads within a distance `d` of the support may be neglected in `V` per NDS 3.4.3.1, which the user applies to
the input; and this is a design aid, not a substitute for the engineer of record** -- the engineer of record's stamped
design governs.

## 2. The tile

### 2.1 `wood-beam-shear` -- Wood Bending Member Shear (Rectangular fv and the NDS Tension-Side End-Notch Reduction)

```
inputs:
  fv_prime_psi   psi   adjusted shear value Fv' (reference Fv x all factors)
  b_in           in    breadth (thickness) of the rectangular section
  d_in           in    full depth of the section
  dn_in          in    net depth remaining at a tension-side notch at the support (dn = d if un-notched)
  v_applied_lb   lb    applied end shear at the support (0 to skip the demand check)

Vr        = (2/3) * fv_prime_psi * b_in * d_in                       ; un-notched allowable end shear, lb
ratio     = dn_in / d_in                                             ; depth ratio, <= 1
Vr_notch  = (2/3) * fv_prime_psi * b_in * dn_in * ratio * ratio      ; notched allowable end shear, lb
fv        = v_applied_lb > 0 ? 3 * v_applied_lb / (2 * b_in * dn_in) ; actual stress on net section, psi
dcr       = v_applied_lb > 0 ? v_applied_lb / Vr_notch : null        ; demand / capacity, dimensionless
```

**Pinned worked example (a 4x12 notched 2 in at the end, Douglas Fir-Larch).** `Fv' = 180 psi`, `b = 3.5 in`,
`d = 11.25 in`, `dn = 9.25 in` (a 2 in tension-side notch), `V_applied = 2,000 lb`: un-notched
`Vr = (2/3) x 180 x 3.5 x 11.25 = 0.6667 x 7,087.5 = ` **4,725 lb**; `ratio = 9.25 / 11.25 = 0.8222`;
`Vr_notch = (2/3) x 180 x 3.5 x 9.25 x 0.8222^2 = 120 x 9.25 x 0.6760 = 3,885 x 0.6760 = ` **2,626 lb**; the notch cuts the
allowable end reaction from 4,725 to 2,626 lb, a **44% loss** from a single 2 in cut. The actual stress on the net section
is `fv = 3 x 2,000 / (2 x 3.5 x 9.25) = 6,000 / 64.75 = 92.7 psi`, and the demand/capacity is
`dcr = 2,000 / 2,626 = 0.76` -- the notch is acceptable here, but a 3 in notch (dn = 8.25) would drop `Vr_notch` to
1,863 lb and push the demand/capacity past 1.0 (dcr = 1.07, an overstress), which is the cliff this tile exists to show. **Cross-check (the no-notch continuity
seam).** Set `dn = d = 11.25`: `ratio = 1.0`, `Vr_notch = (2/3) x 180 x 3.5 x 11.25 x 1.0 = 4,725 lb`, identical to `Vr` --
the notched formula collapses onto the un-notched allowable exactly when there is no notch, the identity the fuzzer pins,
and the `dn > d` and `dn <= 0` error seams bracket it.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the NDS shear provisions, `editionNote` naming `fv = 3V/(2bd)` of NDS 3.4.2 and the tension-
side end-notch rule `V' = (2/3) Fv' b dn (dn/d)^2` of NDS 3.4.3.2, the `Fv'`-is-user-supplied note, the tension-side-end-
notch-only scope with the compression-side/away-from-support/`Cvr` exclusions, the neglect-loads-within-`d` note, and the
design-aid caveat); `test/fixtures/worked-examples.json` (the notched 4x12 example + the no-notch continuity cross-check);
`test/fixtures/compute-map.js` (`wood-beam-shear` -> `computeWoodBeamShear` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `wood-beam-bending` / `joist-deflection` / `lumber-spans`); `data/search/aliases.json`
("wood shear", "notched beam", "notch at support", "horizontal shear wood", "joist notch", "beam end notch", "does the
notch weaken the beam", "allowable end shear lumber", "fv equals 3V over 2bd"); the id appended to the
`CONSTRUCTION_RENDERERS["wood-beam-shear"]=` block at the file end of `app.js`'s construction bundle; the `// dims:`
annotation (`fv_prime_psi` pressure, `b_in`/`d_in`/`dn_in` length, `v_applied_lb` force, `Vr`/`Vr_notch` force, `fv`
pressure, `ratio`/`dcr` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples and the error/continuity seams (non-finite, `fv_prime_psi <= 0`, `b_in <= 0`, `d_in <= 0`, `dn_in <= 0`,
`dn_in > d_in`, `v_applied_lb < 0`, and the `dn = d` identity `Vr_notch == Vr`). Bump the `calc-construction.js` size in
the `check:module-sizes` allowlist if the gate flags it (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error/continuity seams); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the Vr / ratio / Vr_notch / fv / dcr stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (4x12 notched to 9.25 in -> Vr 4,725 lb, Vr_notch 2,626 lb, dcr 0.76).

## 5. Roadmap position

The middle limit state of the sawn-lumber trio (v263..v265): bending in `wood-beam-bending` (v263), shear here, and the
bolted connection in `wood-bolt-connection` (v265). The tension-side end-notch case is the one that governs in the field;
a compression-side notch rule, a notch-away-from-support case, the `Cvr` shear-reduction factor for members with fasteners
in the high-shear zone, and a bearing-perpendicular-to-grain (`Cb`, NDS 3.10) companion are the deliberate next follow-ons
once the base shear check lands.
