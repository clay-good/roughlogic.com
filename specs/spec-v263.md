# roughlogic.com Specification v263 -- Wood Bending Member (NDS Adjusted Bending Value and Beam Stability Factor CL) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v263..v265 (the sawn-lumber design trio -- the three limit states a wood
> member and its connection have to pass once the steel batch (v254..v256) and the reinforced-concrete batch (v257..v259)
> covered the other two structural materials: does the beam bend without buckling sideways (this spec), does it carry the
> end shear once someone notches it (v264), and does the bolt through it transfer the load (v265). This spec opens the
> batch with bending -- the flexural companion the catalog has been missing since it shipped the wood *column*.)**
> In-scope catalog expansion under the spec-v106 trades-only charter (carpentry is a first-class trade). The catalog
> already adjusts a wood *column's* reference compression value for buckling -- `column-buckling-wood` computes the NDS
> column stability factor `Cp` from `le/d`, `Fc*`, and `Emin'` (calc-construction.js Group E) -- but there is no bending
> analogue: nothing adjusts a wood beam's reference bending value `Fb` for lateral-torsional buckling of the compression
> edge, which is the beam stability factor `CL`. Adds one tile beside the existing wood-column tile in
> **`calc-construction.js`** Group E; no new group, module, trade, or dependency. Inherits spec.md through spec-v262.md.
>
> **The gap, and the evidence for it.** A wood beam whose compression edge is not continuously braced can buckle sideways
> before it reaches its bending strength, exactly as a steel beam does (the `Lb`/`Cb`/`Mn` machinery in `steel-beam-flexure`,
> spec-v254). The NDS handles this with the same two-step move as the column: form a Euler-type critical stress, then blend
> it with the material strength through a stability factor. The beam slenderness is `RB = sqrt(le x d / b^2)` (capped at 50),
> the critical buckling bending value is `FbE = 1.20 x Emin' / RB^2`, and the beam stability factor is
> `CL = (1 + FbE/Fb*) / 1.9 - sqrt( ((1 + FbE/Fb*) / 1.9)^2 - (FbE/Fb*) / 0.95 )`, so the adjusted bending value is
> `Fb' = Fb* x CL` and the allowable moment is `M' = Fb' x S` with `S = b d^2 / 6`. A 3-1/2 x 11-1/4 header (`Fb* = 1350`,
> `Emin' = 620,000 psi`) braced only at its ends over a 12 ft span carries `RB = 11.5`, `FbE = 5,626 psi`, `CL = 0.985`,
> `Fb' = 1,329 psi`, and `M' = 98,100 in-lb (8,180 ft-lb)` -- the near-1.0 factor a designer expects for a stocky,
> nearly-braced beam, and the number that drops off a cliff the moment the beam is left tall, thin, and unbraced. The wood
> column tile has needed this bending twin since it landed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The reference-times-factors
bending value `Fb*` (reference `Fb` multiplied by every applicable adjustment factor except `CL` itself, exactly as the NDS
defines the intermediate) is a stress (psi); the reference minimum modulus `Emin'` is a stress (psi); the breadth `b`,
depth `d`, and effective unbraced length of the compression edge `le` are lengths (in); the slenderness `RB`, the ratio
`FbE/Fb*`, and the beam stability factor `CL` are dimensionless; the section modulus `S = b d^2 / 6` is a length cubed
(in^3); the adjusted bending value `Fb' = Fb* x CL` is a stress (psi); the allowable moment `M' = Fb' x S` is a moment
(in-lb, reported in ft-lb alongside). The v18/v21 contract: any non-finite input, a breadth, depth, unbraced length, `Fb*`,
or `Emin'` at or below zero, returns `{ error }`; a computed `RB` above 50 returns `{ error }` (the NDS slenderness limit
for a bending member -- geometry that slender is not a beam). `CL` is clamped to a ceiling of 1.0 (a member braced so well
that `FbE/Fb*` is large yields a stability factor that rounds just above 1.0 through floating point; the physical factor
never exceeds 1.0). Citation discipline (v19/v22): `GOVERNANCE.general` over the NDS beam-stability provisions by name;
`editionNote` names **the NDS beam stability factor `CL` with `RB = sqrt(le d / b^2)`, `FbE = 1.20 Emin' / RB^2`, and
`CL = (1 + FbE/Fb*)/1.9 - sqrt(((1 + FbE/Fb*)/1.9)^2 - (FbE/Fb*)/0.95)` (NDS 3.3.3), and the effective-length `le` from
the loading/bracing conditions of NDS Table 3.3.3**, gives `Emin'` a default of **620,000 psi (a common visually-graded
Douglas Fir-Larch reference minimum modulus)** and states that **`Fb*` is the reference bending value already multiplied by
every applicable adjustment factor except `CL` -- the user supplies it, and the reference values and factors `CD`, `CM`,
`Ct`, `CF`, `Cfu`, `Ci`, `Cr` come from the NDS Supplement for the actual species, grade, and service condition; `le` is
the effective unbraced length from NDS Table 3.3.3 (not the clear span) for the actual bracing and loading; this checks
lateral-torsional buckling of a solid rectangular sawn-lumber bending member bent about its strong axis only, and does not
cover the volume factor `CV` or curvature/interaction of glulam, biaxial bending, or combined bending-plus-axial; and this
is a design aid, not a substitute for the engineer of record** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `wood-beam-bending` -- Wood Bending Member (NDS Adjusted Bending Value Fb' and Beam Stability Factor CL)

```
inputs:
  fb_star_psi   psi   reference bending value x all factors except CL (Fb*)
  emin_psi      psi   reference minimum modulus Emin' (default 620000)
  b_in          in    breadth (thickness) of the rectangular section
  d_in          in    depth of the rectangular section (strong axis)
  le_in         in    effective unbraced length of the compression edge (NDS Table 3.3.3)

RB     = sqrt(le_in * d_in / (b_in * b_in))          ; slenderness ratio, must be <= 50
FbE    = 1.20 * emin_psi / (RB * RB)                  ; critical buckling bending value, psi
r      = FbE / fb_star_psi                            ; ratio, dimensionless
CL     = (1 + r) / 1.9 - sqrt( ((1 + r) / 1.9)^2 - r / 0.95 )   ; clamp to 1.0
Fb'    = fb_star_psi * CL                             ; adjusted bending value, psi
S      = b_in * d_in * d_in / 6                       ; section modulus, in^3
M'     = Fb' * S                                      ; allowable moment, in-lb (report ft-lb = M'/12)
```

**Pinned worked example (a 4x12 header braced only at its ends).** `Fb* = 1350 psi`, `Emin' = 620,000 psi`, `b = 3.5 in`,
`d = 11.25 in`, `le = 144 in` (12 ft span, uniformly loaded, ends held): `RB = sqrt(144 x 11.25 / 3.5^2) =
sqrt(1620 / 12.25) = sqrt(132.24) = 11.50` (<= 50); `FbE = 1.20 x 620,000 / 132.24 = 5,626 psi`; `r = 5,626 / 1,350 =
4.167`; `CL = (5.167 / 1.9) - sqrt((5.167 / 1.9)^2 - 4.167 / 0.95) = 2.7195 - sqrt(7.3957 - 4.386) = 2.7195 - 1.7347 = `
**0.985**; `Fb' = 1,350 x 0.985 = ` **1,329 psi**; `S = 3.5 x 11.25^2 / 6 = 73.83 in^3`; `M' = 1,329 x 73.83 =
98,150 in-lb = ` **8,179 ft-lb**. The stability factor sits just below 1.0 -- a stocky, nearly-braced beam loses almost
nothing to buckling -- which is exactly the answer a designer expects and the reason the check is easy to skip until it
isn't. **Cross-check (the same section left tall and unbraced, the buckling seam).** Hold `Fb*`, `Emin'`, `b`, `d` and
stretch `le` to `600 in` (a 50 ft unbraced compression edge): `RB = sqrt(600 x 11.25 / 12.25) = sqrt(550.4) = 23.46`;
`FbE = 1.20 x 620,000 / 550.4 = 1,352 psi`; `r = 1,352 / 1,350 = 1.001`; `CL = (2.001 / 1.9) - sqrt((1.0532)^2 - 1.001 /
0.95) = 1.0532 - sqrt(1.1092 - 1.0537) = 1.0532 - 0.2356 = ` **0.817**; `Fb' = 1,103 psi`. The factor has fallen from
0.985 to 0.817 -- a 17% strength loss purely from leaving the compression edge unbraced -- which is the whole point of the
`CL` check and the number the fuzzer pins as the slenderness climbs. The `RB > 50` error seam (set `le = 3000 in`) and the
`CL <= 1.0` clamp (set `le` tiny so `FbE/Fb*` is enormous and `CL` rounds to 1.0) are the two boundaries the fuzzer holds.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the NDS beam-stability provisions, `editionNote` naming the `CL`/`RB`/`FbE` equations of
NDS 3.3.3, the `Emin'` default, the `Fb*`-is-user-supplied and `le`-from-Table-3.3.3 notes, the rectangular-sawn-strong-
axis-only scope, and the design-aid caveat); `test/fixtures/worked-examples.json` (the 4x12 braced-ends example + the
unbraced cross-check); `test/fixtures/compute-map.js` (`wood-beam-bending` -> `computeWoodBeamBending` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `column-buckling-wood` / `lumber-spans` / `beam-loading`);
`data/search/aliases.json` ("wood beam", "beam stability factor", "CL", "lateral torsional buckling wood", "adjusted
bending value", "Fb prime", "unbraced wood beam", "will the beam buckle sideways", "allowable moment lumber"); the id
appended to the `CONSTRUCTION_RENDERERS["wood-beam-bending"]=` block at the file end of `app.js`'s construction bundle;
the `// dims:` annotation (`fb_star_psi`/`emin_psi` pressure, `b_in`/`d_in`/`le_in` length, `RB`/`r`/`CL` dimensionless, `S`
length^3, `M'` moment); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and the
error/clamp seams (non-finite, `fb_star_psi <= 0`, `emin_psi <= 0`, `b_in <= 0`, `d_in <= 0`, `le_in <= 0`, `RB > 50`, and
the `CL <= 1.0` clamp). Bump the `calc-construction.js` size in the `check:module-sizes` allowlist if the gate flags it
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error/clamp seams); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the RB / FbE / CL / Fb' / M' stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (4x12 at le 144 in -> CL 0.985, Fb' 1,329 psi, M' 8,179 ft-lb).

## 5. Roadmap position

Opens the sawn-lumber design trio (v263..v265) and completes wood as the fourth structural material in Group E, beside
steel (v254..v256), reinforced concrete (v257..v259), and geotechnics (v260..v262). Bending here, shear at a notch in
`wood-beam-shear` (v264), and the bolted connection that ties members together in `wood-bolt-connection` (v265) are the
three checks a wood member and its joint must pass; with the existing `column-buckling-wood` (compression) the four
member-level limit states -- bending, shear, compression, and connection -- are all covered for sawn lumber. A glulam
volume-factor `CV` companion, a combined bending-plus-axial (NDS 3.9) interaction, and a deflection/vibration
serviceability check are the deliberate next follow-ons.
