# roughlogic.com Specification v274 -- Wood Shear Wall Deflection (SDPWS Three-Term Equation 4.3-1) (calc-lateral.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v272..v274 (the SDPWS wood lateral-force-resisting-system trio -- diaphragm
> (v272), shear wall (v273), deflection (this spec)). This spec closes the trio with the serviceability limit state: after
> the diaphragm distributes the force and the shear wall carries it, how far does that wall actually deflect at the top --
> the story drift the code caps.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: carpentry is the catalog's largest trade, and the
> catalog now resolves the diaphragm unit shear (`diaphragm-shear`, v272) and the shear-wall unit shear and holdown
> (`shearwall-overturning`, v273), but nothing computes the shear wall's *deflection* -- the drift ASCE 7 limits and the
> value that decides whether a slender wall needs to be stiffer even when its strength checks out. Adds one tile to the
> **`calc-lateral.js`** Group E cluster (opened by v272), completing the diaphragm / shear wall / deflection triad; no new
> group, trade, or dependency. Inherits spec.md through spec-v273.md.
>
> **The gap, and the evidence for it.** A wood shear wall deflects at its top from three sources that SDPWS Equation 4.3-1
> adds in series: the bending of the end posts (chords), the panel shear plus nail slip lumped into an apparent shear
> stiffness, and the rigid-body rotation from the holdown and anchorage taking up their slack. The three-term equation is
> `delta = 8 v h^3 / (E A b) + v h / (1000 Ga) + h da / b`, evaluated in the SDPWS unit-specific convention (`v` in plf, `h`
> and `b` in ft, `E` in psi, `A` in in^2, `Ga` in kips/in, `da` in inches, `delta` in inches -- the leading `8` folds the
> foot-to-inch conversion into the bending term). For a `10 ft` wall `8 ft` long at `400 plf` on 4x4 posts (`E =
> 1,600,000 psi`, `A = 12.25 in^2`) with `Ga = 15 kips/in` and `0.15 in` of anchorage slip, the top deflects about
> `0.47 in` -- the bending term a small `0.02 in`, the shear and anchorage terms carrying the rest, and the total a drift
> ratio of about `0.4%`. That is the number a designer checks against the ASCE 7 allowable story drift, and the reason a
> tall narrow wall can pass on strength and still fail on stiffness. `shearwall-overturning` sizes the wall's strength; this
> tile tells you whether it is stiff enough.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The unit shear `v` is a force
per length (plf); the wall height `h` and length `b` are lengths (ft); the chord modulus `E` is a stress (psi); the chord
end-post area `A` is an area (in^2); the apparent shear stiffness `Ga` is a force per length (kips/in); the anchorage slip
`da` and the resulting deflection `delta` are lengths (in). The v18/v21 contract: any non-finite input, or a unit shear,
height, length, modulus, area, or apparent stiffness at or below zero, or a negative anchorage slip, returns `{ error }`;
because SDPWS Eq 4.3-1 is a *unit-specific* (dimensionally non-homogeneous, calibrated) equation, the tile documents the
required units on the field and does not rescale, and `da` is permitted to be zero (a rigid anchorage). Citation discipline
(v19/v22): `GOVERNANCE.general` over the SDPWS three-term deflection equation by name; `editionNote` names **the AWC Special
Design Provisions for Wind and Seismic (SDPWS) Equation 4.3-1 three-term shear-wall deflection
`delta = 8 v h^3 / (E A b) + v h / (1000 Ga) + h da / b`, the linearized (apparent-shear-stiffness `Ga`) form of the legacy
four-term equation, with the terms being end-post bending, combined panel-shear-and-nail-slip, and anchorage rotation, in
the unit-specific convention (`v` plf, `h`/`b` ft, `E` psi, `A` in^2, `Ga` kips/in, `da` and `delta` in), as compiled in the
AWC/APA wood-frame shear-wall design guides**, defaults `E` to **1,600,000 psi (DF-L sawn-lumber posts)** and states that
**this returns the top-of-wall deflection of a single segmented shear wall at the given (service, ASD) unit shear -- `Ga` is
the tabulated apparent shear stiffness for the chosen sheathing and nailing (SDPWS Table 4.3A/4.3B, the seismic column),
`da` is the total vertical anchorage elongation (holdown deformation, plate crushing, and any rod stretch and shrinkage) at
that shear, the equation is the segmented-wall form (not the perforated-wall or force-transfer-around-openings deflection),
and the result is compared against the ASCE 7 allowable story drift; and this is a design aid, not a substitute for the
engineer of record's stamped lateral design** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `shearwall-deflection` -- Wood Shear Wall Deflection (SDPWS Eq 4.3-1)

```
inputs:
  v_plf    plf     unit shear on the wall (service / ASD level)
  h_ft     ft      wall height
  b_ft     ft      wall length
  E_psi    psi     modulus of elasticity of the end posts (chords), default 1600000
  A_in2    in2     cross-sectional area of one end post
  Ga_kin   k/in    apparent shear stiffness Ga for the sheathing and nailing
  da_in    in      total vertical anchorage elongation da (holdown slip), default 0

; SDPWS Eq 4.3-1, unit-specific: v plf, h/b ft, E psi, A in^2, Ga kips/in, da in -> delta in
bend   = 8 * v_plf * h_ft^3 / (E_psi * A_in2 * b_ft)   ; end-post bending, in
shear  = v_plf * h_ft / (1000 * Ga_kin)                ; panel shear + nail slip, in
anchor = h_ft * da_in / b_ft                           ; anchorage rotation, in
delta  = bend + shear + anchor                         ; total top-of-wall deflection, in
drift_ratio = delta / (h_ft * 12)                      ; deflection over height, dimensionless
```

**Pinned worked example (a 10 ft by 8 ft wall at 400 plf on 4x4 DF-L posts).** `v = 400 plf`, `h = 10 ft`, `b = 8 ft`,
`E = 1,600,000 psi`, `A = 12.25 in^2` (a 4x4 post), `Ga = 15 kips/in`, `da = 0.15 in`. Bending
`8 x 400 x 10^3 / (1,600,000 x 12.25 x 8) = 3,200,000 / 156,800,000 = 0.0204 in`; shear
`400 x 10 / (1000 x 15) = 4,000 / 15,000 = 0.2667 in`; anchorage `10 x 0.15 / 8 = 0.1875 in`; total
`delta = 0.0204 + 0.2667 + 0.1875 = ` **0.474 in**, a drift ratio of `0.474 / 120 = 0.40%`. The bending term is a rounding
error, the shear and anchorage terms split the rest -- the usual signature of a short wood shear wall, and a drift the
ASCE 7 seismic limit comfortably clears. **Cross-check (double the height to 20 ft, the h^3 bending term wakes up).** Hold
everything else and set `h = 20 ft`: bending scales with `h^3` to `0.0204 x 8 = 0.163 in`, shear scales with `h` to
`0.2667 x 2 = 0.533 in`, anchorage scales with `h` to `0.1875 x 2 = 0.375 in`; `delta = 0.163 + 0.533 + 0.375 =
1.072 in`, a `0.45%` drift -- the bending term now an eighth of the total, the reason a tall narrow wall's deflection grows
faster than its height and can govern over strength. The three terms are pinned separately so the fuzzer sees each scaling
law; the non-finite, `v_plf <= 0`, `h_ft <= 0`, `b_ft <= 0`, `E_psi <= 0`, `A_in2 <= 0`, `Ga_kin <= 0`, and `da_in < 0`
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the SDPWS Eq 4.3-1 three-term deflection, `editionNote` naming the three terms, the
apparent-shear-stiffness `Ga` linearization of the four-term form, the unit-specific convention, the AWC/APA compilation,
and the tabulated-`Ga`, anchorage-slip-`da`, segmented-wall, compare-to-ASCE-7-drift, and design-aid caveats);
`test/fixtures/worked-examples.json` (the 10 ft example + the 20 ft cross-check); `test/fixtures/compute-map.js`
(`shearwall-deflection` -> `computeShearwallDeflection` in `../../calc-lateral.js`); `scripts/related-tiles.mjs` (->
`shearwall-overturning` / `diaphragm-shear` / `seismic-base-shear` / `beam-deflection`); `data/search/aliases.json`
("shear wall deflection", "SDPWS 4.3-1", "story drift wood", "three term deflection equation", "wall drift", "apparent
shear stiffness Ga", "how much does a shear wall deflect", "wood shear wall stiffness", "lateral drift shear wall"); the id
appended to the `LATERAL_RENDERERS["shearwall-deflection"]=` block at the file end of `app.js`'s lateral bundle; the
`// dims:` annotation (`v_plf` force/length, `h_ft`/`b_ft` length, `E_psi` pressure, `A_in2` area, `Ga_kin` force/length,
`da_in`/`delta` length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
three terms separately, the `h`/`h^3` scaling laws, the `da = 0` rigid-anchorage path, and the eight error seams. Bump the
`calc-lateral.js` size in the `check:module-sizes` allowlist if the gate flags it (dated comment). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the eight error paths, the per-term and scaling-law assertions); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the bend / shear / anchor /
delta / drift stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (10 ft wall at 400 plf ->
0.47 in, 0.40% drift).

## 5. Roadmap position

Closes the SDPWS wood lateral batch (v272..v274) and completes the `calc-lateral.js` diaphragm / shear wall / deflection
triad, the serviceability bookend to the strength checks of v272 and v273. The natural next steps are a diaphragm-deflection
companion (the SDPWS diaphragm equation, the horizontal analogue of this one), a perforated / force-transfer-around-openings
shear-wall deflection form, and a multi-story drift accumulation; with the batch complete the wood lateral cluster stands
beside the NDS-member, steel-member, reinforced-concrete, masonry, and geotechnical clusters in Group E, and the load path
from the `seismic-base-shear` demand through the diaphragm and into the shear wall is closed end to end -- demand,
distribution, strength, and drift.
