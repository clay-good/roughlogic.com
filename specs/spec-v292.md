# roughlogic.com Specification v292 -- Wood Beam-Column Combined Bending and Axial Compression (NDS 3.9.2) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.103.0; proposed 2026-07-02). Batch spec-v290..v292 (the NDS wood-member depth trio -- bearing (v290),
> tension (v291), the beam-column interaction (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `column-buckling-wood` checks pure axial and
> `wood-beam-bending` checks pure bending, but a stud carrying wind on a bearing wall, or a post with an eccentric load, is
> both at once -- and NDS combines them in an interaction equation that neither single-action tile captures. Adds one tile
> to the existing **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v291.md.
>
> **The gap, and the evidence for it.** NDS 3.9.2 checks a member under bending plus axial compression with the interaction
> `(fc/Fc')^2 + fb/[Fb' (1 - fc/FcE)] <= 1.0`, where `fc = P/A` and `fb = M/S` are the applied axial and bending stresses,
> `Fc'` is the adjusted compression value (already including the column-stability factor `Cp`), `Fb'` the adjusted bending
> value (including the beam-stability factor `CL`), and `FcE = 0.822 Emin'/(le/d)^2` is the Euler buckling stress; the
> `1 - fc/FcE` term is the moment-magnification (P-delta) amplifier. For a 4x4 DF-L post-stud (`A = 12.25 in^2`,
> `S = 7.15 in^3`) carrying 3,000 lb axial and 3,000 in-lb of bending over an 8 ft unbraced height with `Fc' = 1,150`,
> `Fb' = 1,350`, `Emin' = 580,000`, the axial and bending stresses are 245 and 420 psi, `FcE = 634 psi`, and the
> interaction is `(245/1,150)^2 + 420/[1,350(1 - 245/634)] = 0.045 + 0.507 = 0.55` -- under 1.0, but the P-delta amplifier
> lifts the bending term 35% above its naive value, the effect a designer must not drop.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The axial force `P` is a force
(lb); the moment `M` is a moment (in-lb); the area `A` is an area (in^2) and the section modulus `S` a volume^1 (in^3); the
adjusted design values `Fc'`, `Fb'`, the modulus `Emin'`, the applied stresses `fc`, `fb`, and the Euler stress `FcE` are
stresses (psi); the effective length `le` and depth `d` are lengths (in); the interaction value is dimensionless. The
v18/v21 contract: any non-finite input, a non-positive area/section/dimension/design value, or an axial stress at or above
the Euler stress (`fc >= FcE`, buckling) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
NDS 3.9.2 interaction by name; `editionNote` names **the NDS 2018 3.9.2 combined bending-and-axial-compression interaction
`(fc/Fc')^2 + fb/[Fb'(1 - fc/FcE)] <= 1.0`, with `FcE = 0.822 Emin'/(le/d)^2` and the `1 - fc/FcE` P-delta amplifier**,
and states that **this checks uniaxial bending plus concentric axial compression -- it takes the already-adjusted `Fc'`
(including `Cp`) and `Fb'` (including `CL`) as entered (compute them in `column-buckling-wood` and `wood-beam-bending`),
uses the bending axis whose `d` and `le` are supplied, and does not cover biaxial bending, the eccentric-load `fc(6e/d)`
term, or tension-plus-bending (NDS 3.9.1); and this is a design aid, not a substitute for the engineer of record** -- the
structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `wood-combined-bending-axial` -- Wood Beam-Column Interaction (NDS 3.9.2)

```
inputs:
  P_lb      lb     axial compression force
  M_inlb    in-lb  bending moment
  A_in2     in^2   cross-sectional area
  S_in3     in^3   section modulus (bending axis)
  Fc_adj    psi    adjusted Fc' (includes Cp)
  Fb_adj    psi    adjusted Fb' (includes CL)
  Emin_adj  psi    adjusted Emin'
  le_in     in     effective length for buckling (this axis)
  d_in      in     member depth (this axis)

fc  = P_lb / A_in2                              ; axial stress, psi
fb  = M_inlb / S_in3                            ; bending stress, psi
FcE = 0.822 * Emin_adj / (le_in/d_in)^2         ; Euler buckling stress, psi
interaction = (fc/Fc_adj)^2 + fb / (Fb_adj * (1 - fc/FcE))   ; <= 1.0 passes
```

**Pinned worked example (a 4x4 DF-L stud, 3,000 lb axial + 3,000 in-lb bending, 8 ft unbraced).** `P = 3,000`, `M = 3,000`,
`A = 12.25`, `S = 7.15`, `Fc' = 1,150`, `Fb' = 1,350`, `Emin' = 580,000`, `le = 96`, `d = 3.5`: `fc = 245 psi`,
`fb = 420 psi`; `le/d = 27.4`, `FcE = 0.822 x 580,000/27.4^2 = 634 psi`; `interaction = (245/1,150)^2 + 420/[1,350(1 - 245/634)] = 0.045 + 420/(1,350 x 0.613) = 0.045 + 0.507 = 0.55`,
comfortably below 1.0. **Cross-check (add axial load toward buckling, P = 6,000 lb).** `fc = 490 psi`, now `fc/FcE = 0.773`,
so the amplifier `1 - 0.773 = 0.227` nearly quadruples the bending term: `(490/1,150)^2 + 420/[1,350 x 0.227] = 0.181 + 1.371 = 1.55` -- 
a fail, driven almost entirely by the P-delta magnification as the axial load approaches the Euler stress. The non-finite,
non-positive, and `fc >= FcE` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the wood member tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NDS 3.9.2 interaction, `editionNote` naming the
interaction equation, `FcE = 0.822 Emin'/(le/d)^2`, the P-delta amplifier, and the uniaxial, adjusted-values-entered,
not-biaxial caveats); `test/fixtures/worked-examples.json` (the passing stud example + the buckling-approach cross-check);
`test/fixtures/compute-map.js` (`wood-combined-bending-axial` -> `computeWoodCombinedBendingAxial` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `column-buckling-wood` / `wood-beam-bending` /
`wood-tension-member` / `wall-bracing-length`); `data/search/aliases.json` ("beam column", "combined bending axial",
"wood interaction equation", "NDS 3.9.2", "stud bending compression", "P delta wood", "FcE", "eccentric post", "wall stud
wind"); the id appended to the existing construction renderers block in `app.js`; the `// dims:` annotation (`P` force, `M`
moment, `A` area, `S` section modulus, stresses stress, lengths length, interaction dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the P-delta amplifier growth, and the non-positive /
`fc >= FcE` / non-finite error seams. No new module; re-pin `calc-construction.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the amplifier assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `fc` / `fb` / `FcE` / interaction stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (4x4 stud -> interaction 0.55).

## 5. Roadmap position

Closes the NDS wood-member depth batch (v290..v292) in `calc-construction.js`: bearing, tension, and the beam-column
interaction now stand beside pure bending, shear, and compression, so the wood member set covers every basic action. Biaxial
bending, the eccentric-load `6e/d` term, and the tension-plus-bending interaction (NDS 3.9.1) are the deliberate next
follow-ons once the trio lands.
