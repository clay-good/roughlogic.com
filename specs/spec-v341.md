# roughlogic.com Specification v341 -- Cantilever Beam Moment, Shear, and Deflection (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v341..v343 (the mechanics-of-materials trio -- the general
> beam/section tools the simply-supported tile never covers: the cantilever beam (this spec), the cross-section properties
> I/S/r (v342), and the combined axial-plus-bending stress (v343).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `beam-loading` gives moment and deflection for a
> simply supported beam, but a bracket, a balcony joist, a sign arm, or a retaining stem is a cantilever -- fixed at one end,
> free at the other -- with entirely different formulas (moment peaks at the support, deflection grows with the fourth power
> of length). The catalog has no cantilever tile. Adds one tile to the existing **`calc-construction.js`** module (Group E);
> no new group, trade, or dependency. Inherits spec.md through spec-v340.md.
>
> **The gap, and the evidence for it.** A cantilever of length `L` carries its maximum moment and shear at the fixed
> support: for a tip point load `P`, `M = P L`, `V = P`, and the tip deflection `delta = P L^3/(3 E I)`; for a uniform load
> `w`, `M = w L^2/2`, `V = w L`, and `delta = w L^4/(8 E I)`. For a 6 ft steel bracket (`I = 53 in^4`, `E = 29,000 ksi`)
> with a 2,000 lb tip load, `M = 12,000 lb-ft`, `V = 2,000 lb`, and `delta = 2,000 x 72^3/(3 x 29e6 x 53) = 0.16 in` -- the
> numbers that size the bracket and check its droop, and ones the simply supported tile would get badly wrong (a cantilever
> deflects far more than a simple span of the same length and load). This tile gives the cantilever case.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The span `L` is a length
(entered ft, converted to in for deflection); the point load `P` is a force (lb) and the uniform load `w` a force per
length (lb/ft); the modulus `E` is a stress (psi) and the moment of inertia `I` a length^4 (in^4); the moment is a moment
(lb-ft), the shear a force (lb), and the deflection a length (in). The v18/v21 contract: any non-finite input, or a span,
`E`, or `I` at or below zero, returns `{ error }`; point and uniform loads superpose (either may be zero). Citation
discipline (v19/v22): `GOVERNANCE.general` over the cantilever beam formulas by name; `editionNote` names **the cantilever
tip-point-load `M = P L`, `V = P`, `delta = P L^3/(3 E I)`, and uniform-load `M = w L^2/2`, `V = w L`, `delta = w L^4/(8 E I)`
formulas, superposed for combined loading, from the standard beam-formula references (AISC/Roark)**, and states that **this
returns the elastic moment, shear, and tip deflection of a prismatic cantilever with a rigid fixed support -- it superposes
a tip point load and a uniform load (other cases use their own formulas), assumes small elastic deflection and a fully
fixed end (a flexible support deflects more), and does not check the member's bending/shear capacity (`wood-beam-bending`,
`steel-beam-flexure`) or the connection; and this is a design aid, not a substitute for the engineer of record** -- the
structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `cantilever-beam` -- Cantilever Beam Moment, Shear, and Deflection

```
inputs:
  L_ft    ft     cantilever length
  P_lb    lb     tip point load (optional)
  w_plf   lb/ft  uniform load (optional)
  E_psi   psi    modulus of elasticity (29e6 steel, ~1.6e6 wood)
  I_in4   in^4   moment of inertia

L = L_ft*12
M_lbft = P_lb*L_ft + w_plf*L_ft^2/2                          ; max moment at support
V_lb   = P_lb + w_plf*L_ft                                    ; max shear at support
delta  = P_lb*L^3/(3*E_psi*I_in4) + (w_plf/12)*L^4/(8*E_psi*I_in4)   ; tip deflection, in
```

**Pinned worked example (a 6 ft steel bracket, 2,000 lb tip load, I = 53 in^4).** `M = 2,000 x 6 = 12,000 lb-ft`;
`V = 2,000 lb`; `delta = 2,000 x 72^3/(3 x 29e6 x 53) = 0.162 in`. **Cross-check (a 300 plf uniform load instead).**
`M = 300 x 6^2/2 = 5,400 lb-ft`; `V = 300 x 6 = 1,800 lb`; `delta = (300/12) x 72^4/(8 x 29e6 x 53) = 0.055 in` -- a
distributed load of comparable total force makes less moment and a third the deflection of the tip load, because its
resultant acts at mid-span, not the tip. The non-finite and non-positive-`L`/`E`/`I` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching `beam-loading`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the cantilever formulas, `editionNote` naming the point and
uniform `M`/`V`/`delta` forms, the superposition, and the fixed-support, elastic, not-capacity caveats);
`test/fixtures/worked-examples.json` (the tip-load example + the uniform-load cross-check); `test/fixtures/compute-map.js`
(`cantilever-beam` -> `computeCantileverBeam` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`beam-loading` / `beam-reactions` / `section-properties` / `joist-deflection`); `data/search/aliases.json` ("cantilever
beam", "cantilever deflection", "bracket load", "fixed end beam", "cantilever moment", "overhang beam", "balcony joist",
"PL cubed over 3EI", "cantilever formula"); the id appended to the existing construction renderers block in `app.js`; the
`// dims:` annotation (`L` length, `P` force, `w` force/length, `E` stress, `I` length^4, `M` moment, `V` force, `delta`
length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the point/uniform
superposition, the `L^3` vs `L^4` deflection terms, and the non-positive / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the superposition assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `M` / `V` / `delta` stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (6 ft, 2,000 lb tip -> 12,000 lb-ft, 0.16 in).

## 5. Roadmap position

Opens the mechanics-of-materials batch (v341..v343) in `calc-construction.js`, adding the cantilever case to the simply
supported beam tile. The cross-section properties (v342) and combined stress (v343) follow. A propped-cantilever and
fixed-fixed case, a moving/multiple point-load superposition, and a chain into `section-properties` for `I` are the
deliberate next follow-ons once the trio lands.
