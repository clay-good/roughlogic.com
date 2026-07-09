# roughlogic.com Specification v554 -- Lifting Lug / Padeye Pin-Hole Check (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z, rigging and heavy lift); no new module, group, or dependency. Inherits spec.md through spec-v553.md.
>
> **The gap, and the evidence for it.** The bench has hardware WLL lookups (`shackle-eyebolt-wll`) and spreader beams,
> but nothing checks an engineered lifting lug or padeye -- the pin-connected plate welded to a load. ASME BTH-1 governs
> it, and the catch is that **four failure modes trade off through the hole placement**, so a lug sized for one can fail
> another. Bearing on the pin, tension across the net section beside the hole, and double-plane shear tear-out beyond the
> hole all compete: pushing the hole away from the edge cures tear-out but shrinks the net tension width, and the pin-to-
> hole clearance drives the bearing. A lug sized for gross tension alone tears out at the pin. The tile takes the applied
> load, the plate and hole geometry, the material, and the design factor, and returns each mode's capacity and the
> governing one -- so a lug is checked against every way it can fail, not just the obvious one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The applied load and the
mode capacities are forces (`M L T^-2`, in kip); the plate thickness, hole and pin diameters, edge distance, and plate
width are lengths (`L`, in inches); the yield and ultimate strengths are stresses (`M L^-1 T^-2`, in ksi); the design
factor and the demand-capacity ratio are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive
load, thickness, hole, pin, edge distance, or width, a pin larger than the hole, or a design factor below 1 returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the BTH-1 pin-plate checks by name (ASME BTH-1
Section 3-3.3, pin-connected plates); `editionNote` names the **ASME BTH-1 lifting-lug pin-hole check**, prints the
bearing `Pb = 1.25 x Fy x Dp x t / Nd`, the net-section tension `Pt = Fu x (w - Dh) x t / Nd`, the double-plane shear
tear-out `Psh = 0.70 x Fu x (2 x t x (a + Dp/2 - Dh/2)) / Nd`, and the governing minimum with `DCR = load / governing`,
and states that **the four modes trade off through hole placement (moving the hole from the edge cures tear-out but
shrinks net tension, and the pin-to-hole clearance drives bearing) so a lug sized for gross tension alone can tear out,
the design factor Nd depends on the BTH-1 design category and service class, cheek plates and weld design are separate
checks, and ASME BTH-1 and the engineer of record govern** -- a screening aid, not the engineer of record.

## 2. The tile

### 2.1 `lifting-lug-design` -- Why Four Modes Trade Off Through Where the Hole Sits

```
inputs:
  applied_load_kip   kip   load on the lug (amplified per the lift)
  plate_thick_in     in    plate thickness t
  hole_dia_in        in    hole diameter Dh
  pin_dia_in         in    pin (shackle) diameter Dp
  edge_dist_in       in    distance from hole center to plate edge a
  plate_width_in     in    plate width at the hole w
  fy_ksi             ksi   yield strength
  fu_ksi             ksi   ultimate strength
  design_factor      -     Nd (1.67 Cat A / 2.0 Cat B, times the service-class multiplier)

bearing  = 1.25 x fy x pin_dia x plate_thick / Nd                                          [kip]
tension  = fu x (plate_width - hole_dia) x plate_thick / Nd                                 [kip]
tearout  = 0.70 x fu x (2 x plate_thick x (edge_dist + pin_dia/2 - hole_dia/2)) / Nd        [kip]
governing = min(bearing, tension, tearout)
DCR      = applied_load / governing
```

**Pinned worked example (a 20 kip lift; t = 1.0 in, hole 1.06 in, pin 1.0 in, edge 2.0 in, width 4.0 in, A36 Fy 36 / Fu
58, Nd = 2.0).** Bearing is `1.25 x 36 x 1.0 x 1.0 / 2 = ` **22.5 kip**, net tension is
`58 x (4.0 - 1.06) x 1.0 / 2 = ` **85.3 kip**, and tear-out is
`0.70 x 58 x (2 x 1.0 x (2.0 + 0.5 - 0.53)) / 2 = ` **80.0 kip** -- so **bearing governs at 22.5 kip**, and the 20 kip
lift gives `DCR = 0.89` (adequate). **Cross-check (moving the hole to the edge makes it tear out).** Slide the hole to
`a = 0.4 in` from the edge (same plate): tear-out collapses to
`0.70 x 58 x (2 x 1.0 x (0.4 + 0.5 - 0.53)) / 2 = ` **15.0 kip**, now the governing mode, and the same 20 kip lift gives
`DCR = 1.33` -- the lug **fails** by tearing out at the pin, the exact failure of a hole placed too close to the edge.
The tile returns each mode's capacity, the governing mode, and the DCR.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the bearing-governs example + the
tear-out near-edge cross-check); `test/fixtures/compute-map.js` (`lifting-lug-design` -> `computeLiftingLugDesign` in
`../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `shackle-eyebolt-wll` / `spreader-beam` / `rigging-check`);
`data/search/aliases.json` ("lifting lug", "padeye", "pin connected plate", "asme bth-1", "lug bearing tearout",
"lug design", "hole edge distance lug", "shackle lug"); the id appended to the rigging renderers declare in `app.js`;
the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the three mode capacities, the governing minimum, the tear-out collapse near the edge, and the error seams (non-finite,
non-positive geometry, pin > hole, Nd < 1). Hand-writes its renderer (mirroring the calc-rigging.js `spreader-beam`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the bearing / tension / tear-out / governing stack wraps on a phone); render-no-nan + a11y on the
new tile, output read to the value (the base example -> bearing 22.5 kip, DCR 0.89).

## 5. Roadmap position

Adds the engineered-lug check the rigging bench lacked, beside `shackle-eyebolt-wll` (the hardware) and `spreader-beam`.
A cheek-plate (doubler) contribution to bearing and a weld-to-base design (the fillet that attaches the lug) are
deliberate future follow-ons. Further Group Z growth stays evidence-driven.
