# roughlogic.com Specification v281 -- Steel Beam Lateral-Torsional Buckling Capacity (AISC 360 Ch. F2) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v281..v283 (the steel members-and-connections depth trio --
> the checks the compact-braced flexure tile and the shear tile explicitly defer: lateral-torsional buckling of an
> unbraced beam (this spec, the LTB the `steel-beam-flexure` tile says it excludes), block-shear rupture at a coped or
> bolted end (v282, the check `steel-beam-shear` names as separate), and the tension member's yield/rupture with shear lag
> (v283).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `steel-beam-flexure` computes only the "compact +
> braced plastic plateau (no LTB)" moment; a beam whose compression flange is not continuously braced buckles sideways at a
> lower moment, and that reduction is the single most common reason a steel beam that "passes" the plastic check still
> fails. Adds one tile to the existing **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits
> spec.md through spec-v280.md.
>
> **The gap, and the evidence for it.** AISC 360 Section F2 grades a doubly-symmetric compact I-shape by its unbraced length
> `Lb` against two limits: `Lp = 1.76 ry sqrt(E/Fy)` (below which the full plastic moment `Mp = Fy Zx` develops) and
> `Lr` (above which buckling is elastic). Between them the nominal moment falls linearly,
> `Mn = Cb [Mp - (Mp - 0.7 Fy Sx)(Lb - Lp)/(Lr - Lp)] <= Mp`; beyond `Lr` it is `Mn = Fcr Sx <= Mp` with the elastic
> critical stress `Fcr = Cb pi^2 E/(Lb/rts)^2 sqrt(1 + 0.078 (J c/(Sx ho))(Lb/rts)^2)`. For a W18x50 in A992 (`Zx = 101`,
> `Sx = 88.9`, `ry = 1.65`, `rts = 1.98`, `J = 1.24`, `ho = 17.4`, giving `Lp = 5.83 ft`, `Lr = 16.9 ft`, `Mp = 421 kip-ft`)
> braced only every 10 ft with `Cb = 1.0`, the moment drops to `Mn = 360 kip-ft` (ASD 215.6, LRFD 324) -- a real cut from
> the 421 kip-ft the braced tile reports. `steel-beam-flexure` gives the braced ceiling; this tile gives the moment the
> actual bracing allows.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The section properties
`Zx`, `Sx` (in^3), `ry`, `rts`, `ho` (in), and `J` (in^4) come from the AISC Manual; `Fy` is a stress (ksi); the unbraced
length `Lb` is a length (entered in ft, converted to in for the slenderness); `Cb` is the dimensionless lateral-torsional
modification factor (default 1.0, conservative); the nominal, ASD-allowable (`/1.67`), and LRFD-design (`x0.90`) moments are
moments (reported in kip-ft). The v18/v21 contract: any non-finite input, or any section property or length at or below zero,
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 F2 LTB provisions by name;
`editionNote` names **the AISC 360-22 Section F2 limits `Lp = 1.76 ry sqrt(E/Fy)` and `Lr`, the inelastic
`Mn = Cb[Mp - (Mp - 0.7 Fy Sx)(Lb-Lp)/(Lr-Lp)] <= Mp`, and the elastic `Fcr = Cb pi^2 E/(Lb/rts)^2 sqrt(1 + 0.078(Jc/(Sx ho))(Lb/rts)^2)`
with `E = 29,000 ksi` and `c = 1` for a doubly-symmetric shape**, and states that **this covers doubly-symmetric compact
I-shapes bending about the strong axis (the F2 case) -- it does not cover noncompact or slender flanges/webs (F3-F5),
channels or singly-symmetric shapes, or the `Lr` closed form itself (entered from the Manual or computed from J and Cw in a
follow-on), and assumes the entered `Cb` matches the moment diagram; and this is a design aid, not a substitute for the
engineer of record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `steel-beam-ltb` -- Steel Beam Lateral-Torsional Buckling Capacity (AISC 360 F2)

```
inputs:
  Fy      ksi    yield stress (50 for A992)
  Zx      in^3   plastic section modulus
  Sx      in^3   elastic section modulus
  ry      in     weak-axis radius of gyration
  rts     in     effective radius for LTB
  J       in^4   torsional constant
  ho      in     distance between flange centroids
  Lb_ft   ft     unbraced length of the compression flange
  Cb      -      LTB modification factor (default 1.0)

E    = 29000 ksi ; c = 1 (doubly symmetric)
Mp   = Fy * Zx                                   ; kip-in
Mr   = 0.7 * Fy * Sx                             ; kip-in (elastic-branch anchor)
Lp   = 1.76 * ry * sqrt(E / Fy) / 12             ; ft
Lr   = (from AISC Manual, or the F2-6 closed form) ; ft
if Lb <= Lp:  Mn = Mp
elif Lb <= Lr: Mn = min(Cb*(Mp - (Mp - Mr)*(Lb_ft - Lp)/(Lr - Lp)), Mp)
else:          Lb=12*Lb_ft; Fcr = Cb*pi^2*E/(Lb/rts)^2 * sqrt(1 + 0.078*(J*c/(Sx*ho))*(Lb/rts)^2)
               Mn = min(Fcr*Sx, Mp)
Mn_kft = Mn/12 ; ASD = Mn_kft/1.67 ; LRFD = 0.90*Mn_kft
```

**Pinned worked example (a W18x50 in A992 braced every 10 ft, Cb = 1.0).** `Fy = 50`, `Zx = 101`, `Sx = 88.9`, `ry = 1.65`,
`rts = 1.98`, `J = 1.24`, `ho = 17.4`, `Lb = 10 ft`, `Cb = 1.0`: `Mp = 5,050 kip-in = 420.8 kip-ft`; `Lp = 5.83 ft`,
`Lr = 16.9 ft`; since `5.83 < 10 < 16.9` the inelastic branch governs, `Mn = 1.0[5,050 - (5,050 - 3,111.5)(10 - 5.83)/(16.9 - 5.83)] = 4,320 kip-in = 360.0 kip-ft`,
ASD `= 215.6 kip-ft`, LRFD `= 324.0 kip-ft` -- a 14% cut from the braced 420.8. **Cross-check (stretch the bracing to
20 ft, past `Lr`).** Same shape, `Lb = 20 ft > 16.9 ft`, so the elastic branch runs: `Lb/rts = 240/1.98 = 121.2`,
`Fcr = 1.0 * pi^2 * 29,000 / 121.2^2 * sqrt(1 + 0.078 (1.24/(88.9 x 17.4)) 121.2^2) = 27.0 ksi`, `Mn = 27.0 x 88.9 = 2,399 kip-in = 199.9 kip-ft`,
ASD `= 119.7 kip-ft` -- less than half the braced moment, the LTB cliff that forces a brace or a heavier section. The
non-finite and non-positive-property error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching `steel-beam-flexure`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 F2 provisions, `editionNote` naming `Lp`, the
inelastic linear branch, the elastic `Fcr`, `E = 29,000 ksi`, `c = 1`, and the doubly-symmetric-compact-only, entered-`Lr`,
entered-`Cb` caveats); `test/fixtures/worked-examples.json` (the 10 ft inelastic example + the 20 ft elastic cross-check);
`test/fixtures/compute-map.js` (`steel-beam-ltb` -> `computeSteelBeamLtb` in `../../calc-steel.js`);
`scripts/related-tiles.mjs` (-> `steel-beam-flexure` / `steel-beam-shear` / `steel-column-capacity` / `steel-block-shear`);
`data/search/aliases.json` ("lateral torsional buckling", "LTB", "unbraced length beam", "Lp Lr", "Cb factor", "steel beam
bracing", "AISC F2", "beam buckling moment", "compression flange bracing"); the id appended to the existing steel renderers
block in `app.js`; the `// dims:` annotation (`Fy` stress, `Zx`/`Sx` volume^1 as section modulus, `Lb` length, `Cb`
dimensionless, moments as moment); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the three-zone branch selection (Lp / Lr thresholds), the `Cb` scaling capped at `Mp`, and the non-finite /
non-positive-property error seams. No new module; re-pin `calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the zone-branch assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Lp` / `Lr` / `Mn` / ASD / LRFD stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (W18x50 at Lb=10 ft -> 360 kip-ft, ASD 215.6).

## 5. Roadmap position

Opens the steel members-and-connections depth batch (v281..v283) in `calc-steel.js` and closes the LTB gap
`steel-beam-flexure` names. Block-shear rupture (v282) and the tension member (v283) follow. The `Lr` F2-6 closed form from
`J` and `Cw`, the noncompact/slender flange reductions (F3), and channel/singly-symmetric shapes are the deliberate next
follow-ons once the trio lands.
