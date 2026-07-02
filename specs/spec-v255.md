# roughlogic.com Specification v255 -- Steel Beam Web Shear Capacity (AISC 360 Ch. G) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-01). Batch spec-v254..v256 (the AISC 360 steel-member trio -- moment, shear, and axial
> capacity of a rolled W-shape). This spec continues the batch with the shear check.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: a beam that passes the moment check can still fail in
> shear at the ends, where the reaction is highest and the moment is zero -- short heavily-loaded spans and coped or
> notched ends are governed by the web, not the flange. Adds one tile to the **`calc-steel.js`** Group E cluster (beside
> `steel-beam-flexure`); no new module, group, trade, or dependency. Inherits spec.md through spec-v254.md.
>
> **The gap, and the evidence for it.** AISC 360-22 Chapter G reduces web shear to `Vn = 0.6 x Fy x Aw x Cv1`, where the
> web area `Aw = d x tw` and, for the great majority of rolled I-shapes, the web shear coefficient `Cv1 = 1.0` and the
> shear is checked against the more generous `Omega_v = 1.50` (`phi_v = 1.00`) of §G2.1(a). A W18x50 (d = 17.99 in,
> tw = 0.355 in) of A992 steel carries an allowable shear of about 128 kips -- again the exact value printed beside its
> moment in the AISC Manual beam tables. The catalog now checks the steel beam's moment (v254) but not its shear, so it
> cannot yet tell a fabricator whether a stiff short span or a coped connection is web-limited.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The yield stress `Fy` is a
stress (ksi); the section depth `d` and web thickness `tw` are lengths (in); the web area `Aw` is an area (in^2); the web
shear coefficient `Cv1` is `dimensionless`; the nominal, allowable, and design shears are forces (kips). The v18/v21
contract: any non-finite input, or a yield stress, depth, or web thickness at or below zero, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the shear relation by name; `editionNote` names **AISC 360-22
§G2.1 (`Vn = 0.6 x Fy x Aw x Cv1`, with `Aw = d x tw`) and §B3.1/§B3.2**, gives the bundled defaults as editable
(`Fy = 50 ksi`; `Cv1 = 1.0`; `Omega_v = 1.50` / `phi_v = 1.00` for rolled I-shapes meeting the web-slenderness limit
`h/tw <= 2.24 x sqrt(E/Fy)` of §G2.1(a), which nearly all standard W-shapes do), and states that **a web that exceeds
that slenderness limit takes the general `Omega_v = 1.67` / `phi_v = 0.90` and a `Cv1 < 1.0` from §G2.1(b) (not computed
here -- verify `h/tw` against the limit for the actual shape), tension-field action and transverse stiffeners are a
separate provision, this is the web shear of an unreinforced rolled section only (block shear at a coped end and the
connection itself are checked elsewhere), and this is a design aid, not a licensed engineer's design** -- the engineer of
record's stamped design governs. With `E = 29,000 ksi` and `Fy = 50 ksi`, the limit is `2.24 x sqrt(29000/50) = 53.9`.

## 2. The tile

### 2.1 `steel-beam-shear` -- Steel Beam Web Shear Capacity

```
inputs:
  fy        ksi     specified minimum yield stress (default 50, A992/A572 Gr. 50)
  d         in      overall section depth
  tw        in      web thickness
  cv1       -       web shear coefficient (default 1.0; < 1.0 only for slender webs, G2.1(b))
  omega_v   -       ASD safety factor (default 1.50, rolled I-shapes per G2.1(a); use 1.67 otherwise)
  vu        kips    applied required shear to check against (optional, default 0 = capacity only)

aw         = d * tw                      ; web area, in^2
vn         = 0.6 * fy * aw * cv1         ; nominal shear, kips
phi_v      = omega_v == 1.50 ? 1.00 : 0.90   ; paired LRFD factor for the chosen safety factor
va         = vn / omega_v                ; ASD allowable shear
phi_vn     = phi_v * vn                  ; LRFD design shear
util_asd   = vu > 0 ? vu / va : -        ; demand/capacity ratio, ASD
```

**Pinned worked example (a W18x50, A992).** `Fy = 50 ksi`, `d = 17.99 in`, `tw = 0.355 in`, `Cv1 = 1.0`,
`Omega_v = 1.50`: `Aw = 17.99 x 0.355 = 6.39 in^2`; `Vn = 0.6 x 50 x 6.39 x 1.0 = 191.6 kips`; `Va = 191.6 / 1.50 = `
**128 kips** allowable (ASD); `phi_v Vn = 1.00 x 191.6 = ` **192 kips** design (LRFD). Both match the AISC Manual Table 3-2
shear values for a W18x50, and the web slenderness `h/tw` of a W18x50 (about 45.2) is under the 53.9 limit, confirming the
`Omega_v = 1.50` choice. **Cross-check (a W12x26).** `Fy = 50 ksi`, `d = 12.22 in`, `tw = 0.230 in`: `Aw = 2.81 in^2`;
`Vn = 0.6 x 50 x 2.81 x 1.0 = 84.3 kips`; `Va = 84.3 / 1.50 = ` **56.2 kips** allowable; its `h/tw` (about 47.2) is still
under 53.9, so the 1.50 factor holds. The W12x26 carries less than half the W18x50's shear on a web less than half as
thick, which is why a stubby, heavily-loaded W12 can be shear-controlled where a deeper section would not be.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the shear relation, `editionNote` naming AISC 360-22 §G2.1 / §B3.1 / §B3.2 with the
slenderness-limit / general-factor / block-shear-elsewhere / design-aid caveats); `test/fixtures/worked-examples.json`
(the W18x50 example + the W12x26 cross-check); `test/fixtures/compute-map.js` (`steel-beam-shear` -> `computeSteelBeamShear`
in `../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-beam-flexure` / `steel-column-capacity` /
`fillet-weld-strength`); `data/search/aliases.json` ("steel beam shear", "web shear", "AISC chapter G", "Vn shear
capacity", "0.6 Fy Aw", "beam end reaction check", "coped beam shear", "steel shear allowable"); the id appended to the
steel renderers declare in `app.js`; the `// dims:` annotation (`fy` pressure, `d`/`tw` length, `aw` area, shears force);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite,
`fy <= 0`, `d <= 0`, `tw <= 0`) plus the `omega_v` -> `phi_v` pairing (1.50/1.00 and 1.67/0.90). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the non-positive-input error paths and the factor pairing); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Aw / Vn / Va / phi-Vn /
utilization stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (W18x50 -> 128 kips ASD,
192 kips LRFD).

## 5. Roadmap position

Continues the AISC 360 steel-member batch (v254..v256). Completes the beam pair with `steel-beam-flexure` (v254) -- moment
plus shear are the two limit states that size a rolled beam -- and precedes the axial member `steel-column-capacity`
(v256). A slender-web `Cv1` computation (§G2.1(b), for deep plate girders) and a beam end-reaction / coped-section block
shear check are deliberate future follow-ons.
