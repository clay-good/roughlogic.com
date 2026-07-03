# roughlogic.com Specification v290 -- Wood Bearing Perpendicular to Grain and Bearing Area Factor Cb (NDS 3.10) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.103.0; proposed 2026-07-02). Batch spec-v290..v292 (the NDS wood-member depth trio -- the checks the
> existing wood beam/column tiles left open: bearing compression perpendicular to grain at a support (this spec), tension
> parallel to grain (v291), and combined bending-plus-axial beam-column interaction (v292).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog checks wood in bending (`wood-beam-bending`,
> `wood-beam-shear`), axial compression (`column-buckling-wood`), and connections (`wood-bolt-connection`), but has no
> bearing-perpendicular-to-grain check -- the crushing of a joist or beam where it lands on a plate or a post, the limit
> state that sets a required bearing length and often governs a narrow bearing. Adds one tile to the existing
> **`calc-construction.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v289.md.
>
> **The gap, and the evidence for it.** Where a member bears on another across the grain, NDS 3.10.2 checks the bearing
> stress `fc_perp = R/(b lb)` against the adjusted design value `Fc_perp' = Fc_perp x Cb`, where `R` is the reaction, `b`
> the bearing width, `lb` the bearing length, and `Cb = (lb + 0.375)/lb` is the bearing-area factor that rewards a short
> bearing not near the member end (NDS 3.10.4). For a 2x joist (`b = 1.5 in`) landing 1.5 in onto a plate and carrying an
> 800 lb reaction with a Douglas Fir-Larch `Fc_perp = 625 psi`, `fc_perp = 800/(1.5 x 1.5) = 356 psi` against
> `Fc_perp' = 625 x (1.875/1.5) = 781 psi` -- a demand/capacity of 0.46, and a required bearing length of only
> `800/(1.5 x 625) = 0.85 in` -- the check a framer skips until the beam crushes into the plate. The bending and shear tiles
> never touch bearing; this is the crushing limit state.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The reaction `R` is a force
(lb); the bearing width `b` and bearing length `lb` are lengths (in); the reference and adjusted bearing design values
`Fc_perp`, `Fc_perp'` are stresses (psi); the applied bearing stress `fc_perp` is a stress (psi); the bearing-area factor
`Cb` and the demand/capacity ratio are dimensionless; the required bearing length is a length (in). The v18/v21 contract:
any non-finite input, or a force/dimension/design value at or below zero, returns `{ error }`; `Cb` applies only for
`lb < 6 in` and not nearer than 3 in to the member end (`Cb = 1.0` otherwise, flagged). Citation discipline (v19/v22):
`GOVERNANCE.general` over the NDS 3.10 bearing provisions by name; `editionNote` names **the NDS 2018 3.10.2 bearing stress
`fc_perp = R/(b lb)` against `Fc_perp' = Fc_perp x Cb`, and the 3.10.4 bearing-area factor `Cb = (lb + 0.375)/lb` for
bearings under 6 in and not within 3 in of the end**, and states that **this checks compression perpendicular to grain at a
bearing -- it uses the reference `Fc_perp` (already adjusted for wet service `CM` and temperature `Ct` if entered as such;
`Fc_perp` is not adjusted by `CD` load duration), applies `Cb` only within its geometric limits, and does not cover angle-
to-grain bearing (the Hankinson formula), the member's bending or shear (`wood-beam-bending`, `wood-beam-shear`), or the
0.04 in deformation-limit alternative; and this is a design aid, not a substitute for the engineer of record** -- the
structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `wood-bearing-perpendicular` -- Wood Bearing Perpendicular to Grain (NDS 3.10)

```
inputs:
  R_lb       lb    reaction / bearing force
  b_in       in    bearing width (member thickness)
  lb_in      in    bearing length along the grain
  Fcperp_psi psi   reference Fc-perp design value
  near_end   -     is the bearing within 3 in of the member end? (yes => Cb = 1.0)

Cb        = (lb_in < 6 AND not near_end) ? (lb_in + 0.375)/lb_in : 1.0
Fcperp_adj= Fcperp_psi * Cb                        ; adjusted bearing value, psi
fc_perp   = R_lb / (b_in * lb_in)                  ; applied bearing stress, psi
DCR       = fc_perp / Fcperp_adj                   ; demand/capacity
lb_req    = R_lb / (b_in * Fcperp_psi)             ; required bearing length (Cb=1 conservative), in
```

**Pinned worked example (a 2x joist, 1.5 in bearing, 800 lb reaction, DF-L Fc-perp 625 psi).** `R = 800`, `b = 1.5`,
`lb = 1.5`, `Fc_perp = 625`, not near the end: `Cb = (1.5 + 0.375)/1.5 = 1.25`; `Fc_perp' = 625 x 1.25 = 781 psi`;
`fc_perp = 800/(1.5 x 1.5) = 356 psi`; `DCR = 356/781 = 0.46`, and the conservative required bearing length is
`800/(1.5 x 625) = 0.85 in` -- the 1.5 in bearing has ample margin. **Cross-check (a heavy 6,000 lb beam reaction on the same
1.5 in width and length).** `fc_perp = 6,000/(1.5 x 1.5) = 2,667 psi` against the same `Fc_perp' = 781 psi`, `DCR = 3.4` --
a fail that demands `6,000/(1.5 x 625) = 6.4 in` of bearing, the case that forces a bearing plate or a wider post. The
non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the wood member tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NDS 3.10 provisions, `editionNote` naming
`fc_perp = R/(b lb)`, `Fc_perp' = Fc_perp Cb`, `Cb = (lb + 0.375)/lb`, and the no-CD-on-perp, within-limits-Cb,
not-angle-to-grain caveats); `test/fixtures/worked-examples.json` (the light-joist example + the heavy-beam cross-check);
`test/fixtures/compute-map.js` (`wood-bearing-perpendicular` -> `computeWoodBearingPerpendicular` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `wood-beam-shear` / `wood-beam-bending` /
`column-buckling-wood` / `deck-beam-post`); `data/search/aliases.json` ("bearing perpendicular to grain", "Fc perp",
"bearing area factor", "Cb factor", "wood crushing", "required bearing length", "joist bearing", "NDS 3.10", "beam bearing
plate"); the id appended to the existing construction renderers block in `app.js`; the `// dims:` annotation (`R` force,
lengths length, stresses stress, `Cb`/`DCR` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the `Cb` geometric-limit branch, and the non-positive / non-finite error seams. No new module;
re-pin `calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `Cb` branch assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Cb` / `Fc_perp'` / `fc_perp` / `DCR` / `lb_req`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (800 lb, 1.5 in -> 356 psi, DCR 0.46).

## 5. Roadmap position

Opens the NDS wood-member depth batch (v290..v292) in `calc-construction.js`, adding bearing beside bending, shear,
compression, and connections. Tension parallel to grain (v291) and the beam-column interaction (v292) follow. Angle-to-grain
bearing (Hankinson), the 0.04 in deformation-limited `Fc_perp` alternative, and a bearing-plate design tile are the
deliberate next follow-ons once the trio lands.
