# roughlogic.com Specification v254 -- Steel Beam Flexural Capacity, Compact and Braced (AISC 360 Ch. F) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.92.0; was PROPOSED 2026-07-01). Batch spec-v254..v256 (the AISC 360 steel-member trio -- the three capacity checks an
> erector, fabricator, or general contractor runs on a rolled W-shape: does it carry the moment, the shear, and the axial
> load. This spec opens the batch with the flexural check.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog already sizes wood beams and columns
> (`beam-loading`, `beam-reactions`, `column-buckling-wood`) and steel *welds* (`fillet-weld-strength`,
> `groove-weld-strength`, both citing AISC 360), but has nothing that checks the *steel member itself*. Adds one tile to a
> new **`calc-steel.js`** Group E cluster (AISC 360 rolled-shape member capacity, beside the wood-framing and welding
> tiles); no new group, trade, or dependency. Inherits spec.md through spec-v253.md.
>
> **The gap, and the evidence for it.** The first question on any steel-framed job is whether the beam holds. AISC 360-22
> Chapter F makes the answer a one-line calculation for the common case -- a compact, laterally-braced I-shape reaches its
> full plastic moment, `Mn = Mp = Fy x Zx`, and the allowable moment is that divided by the safety factor (AISC 360 §F2.1,
> §B3.1/§B3.2). A W18x50 of A992 steel (Fy = 50 ksi, Zx = 101 in^3) develops an allowable moment of about 252 kip-ft --
> the exact value the AISC Steel Construction Manual prints in its beam-design tables. The catalog can compute the wood
> equivalent and the weld that joins the steel, but not this, the single number that decides whether the W-shape on the
> drawing is big enough.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The yield stress `Fy` is a
stress (ksi); the plastic section modulus `Zx` is a length cubed (in^3); the nominal, allowable, and design moments are a
moment (force x length, reported in kip-ft after the in-to-ft divide by 12). The v18/v21 contract: any non-finite input,
or a yield stress or section modulus at or below zero, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the flexural relation by name; `editionNote` names **AISC 360-22 §F2.1 (nominal flexural
strength of a compact, laterally-braced I-shape, `Mn = Mp = Fy x Zx`) and §B3.1/§B3.2 (the resistance factor
`phi_b = 0.90` for LRFD and the safety factor `Omega_b = 1.67` for ASD)**, gives `Fy` a default of **50 ksi (ASTM A992 /
A572 Gr. 50, the standard grade for hot-rolled W-shapes)**, and states that **this covers only the compression-flange
yielding limit state -- it assumes the section is compact per Table B4.1b and the compression flange is continuously
braced or braced at or under `Lp` (§F2.2), so lateral-torsional buckling, flange local buckling, tension-flange yielding,
and shear (v255) are not checked here; take `Zx` from the AISC Manual dimensions tables for the actual shape; and this is
a design aid, not a substitute for a licensed engineer's design** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `steel-beam-flexure` -- Steel Beam Flexural Capacity (Compact, Braced)

```
inputs:
  fy        ksi     specified minimum yield stress (default 50, A992/A572 Gr. 50)
  zx        in^3    plastic section modulus about the axis of bending
  mu        kip-ft  applied required moment to check against (optional, default 0 = capacity only)

mp_kipin   = fy * zx                     ; plastic moment, kip-in
mn_kipft   = mp_kipin / 12               ; nominal moment, kip-ft
ma_kipft   = mn_kipft / 1.67             ; ASD allowable moment (Omega_b = 1.67)
phi_mn     = 0.90 * mn_kipft             ; LRFD design moment (phi_b = 0.90)
util_asd   = mu > 0 ? mu / ma_kipft : -  ; demand/capacity ratio, ASD
```

**Pinned worked example (a W18x50 floor beam, A992).** `Fy = 50 ksi`, `Zx = 101 in^3`: `Mp = 50 x 101 = 5,050 kip-in`;
`Mn = 5,050 / 12 = 420.8 kip-ft`; `Ma = 420.8 / 1.67 = ` **252 kip-ft** allowable (ASD); `phi_b Mn = 0.90 x 420.8 = `
**379 kip-ft** design (LRFD). Both match the AISC Steel Construction Manual Table 3-2 values for a W18x50 to the printed
precision -- the check reproduces the number a steel detailer reads off the tables. A required moment of 200 kip-ft gives
`util = 200 / 252 = 0.79`, so the beam passes with about 21% reserve. **Cross-check (a lighter W12x26).**
`Fy = 50 ksi`, `Zx = 37.2 in^3`: `Mp = 1,860 kip-in`; `Mn = 155 kip-ft`; `Ma = 155 / 1.67 = ` **92.8 kip-ft** allowable;
`phi_b Mn = ` **139.5 kip-ft** design -- again matching Table 3-2 (93.3 / 140 kip-ft to rounding of `Zx`), and showing
that the same grade of steel in a section a fifth the weight carries barely a third of the moment, which is why the shape,
not the grade, sizes the beam.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the flexural relation, `editionNote` naming AISC 360-22 §F2.1 / §B3.1 / §B3.2 with the
compact-and-braced-only, take-Zx-from-the-Manual, and design-aid caveats); `test/fixtures/worked-examples.json` (the
W18x50 example + the W12x26 cross-check); `test/fixtures/compute-map.js` (`steel-beam-flexure` -> `computeSteelBeamFlexure`
in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-beam-shear` / `steel-column-capacity` / `beam-loading`);
`data/search/aliases.json` ("steel beam capacity", "W shape moment", "AISC flexure", "plastic moment", "Mp Fy Zx", "beam
allowable moment", "does the steel beam hold", "AISC chapter F"); the id appended to a new steel renderers declare in
`app.js`; the `// dims:` annotation (`fy` pressure, `zx` length^3, moments force x length); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, `fy <= 0`, `zx <= 0`). Add
the `calc-steel.js` size to the `check:module-sizes` allowlist (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the non-positive `fy`/`zx` error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Mp / Mn / Ma / phi-Mn / utilization stack wraps
on a phone); render-no-nan + a11y sweep, output read to the value (W18x50 at Fy 50 -> 252 kip-ft ASD, 379 kip-ft LRFD).

## 5. Roadmap position

Opens the AISC 360 steel-member batch (v254..v256). The moment check sits beside the shear check `steel-beam-shear` (v255)
-- together the two limit states that size a beam -- and the axial check `steel-column-capacity` (v256). A
lateral-torsional-buckling capacity curve (§F2.2, `Mn` as a function of the unbraced length `Lb` with `Lp` and `Lr`) and a
combined axial-plus-flexure interaction check (Chapter H, §H1.1) are the deliberate next follow-ons once the base member
checks land.
