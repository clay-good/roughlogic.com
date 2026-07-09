# roughlogic.com Specification v546 -- Wind Force on Solid Freestanding Wall / Sign (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, the construction bench); no new module, group, or dependency. Inherits spec.md through spec-v545.md.
>
> **The gap, and the evidence for it.** The bench has wind pressure tiles for enclosed buildings (`wind-mwfrs-pressure`,
> `wind-cc-pressure`, `wind-on-load`), but a freestanding wall, monument sign, or pylon is a different ASCE 7 case
> (Section 29.3, "other structures"), and lumping it in with a building wall mis-loads it. The catch is the force
> coefficient. For a solid freestanding sign, `Cf` is a **net** two-face coefficient (roughly 1.2 to 2.0 depending on
> the aspect and clearance ratios), not the `+/- GCp` of a building wall, and it rises for tall, narrow signs. Two more
> traps: the Case B loading applies the resultant at a `0.2B` eccentricity, producing the torsion that actually sizes
> the post foundation, and a wide sign (`B/s >= 2`) picks up a Case C strip loading. The tile takes the velocity
> pressure, the solid area, and the geometry-derived `Cf`, and returns the design wind force and the Case B eccentric
> moment -- the numbers that size the sign structure and its footing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The velocity pressure is a
pressure (`M L^-1 T^-2`, in psf); the solid area is an area (`L^2`, in ft^2); the width is a length (`L`, in ft); the
wind force is a force (`M L T^-2`, in lb); the eccentric moment is `M L^2 T^-2` (in lb-ft); the gust factor and the
force coefficient are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive velocity pressure,
solid area, width, or force coefficient, or a gust factor outside `(0, 2]` returns `{ error }`. Citation discipline
(v19/v22): `ASCE` over Section 29.3; `editionNote` names **ASCE 7-22 Section 29.3 (solid freestanding walls and signs)**,
prints `F = qh x G x Cf x As` and the Case B eccentric moment `M = F x 0.2 x B`, and states that **Cf here is a net
two-face force coefficient from Figure 29.3-1 as a function of the aspect ratio B/s and the clearance ratio s/h (not the
+/- GCp of a building wall), it rises for tall narrow signs, Case B applies the resultant at a 0.2B eccentricity (the
torsion that sizes the post and footing) and a wide sign (B/s >= 2) adds a Case C strip loading, and the ASCE 7 figures
and the engineer of record govern** -- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `wind-solid-sign` -- The Net Two-Face Coefficient and 0.2B Torsion a Building-Wall Tile Misses

```
inputs:
  velocity_pressure_psf  psf   qh (from V, exposure, Kz -- or entered directly)
  gust_factor            -     G (0.85 rigid default)
  force_coefficient      -     Cf from Fig 29.3-1 (net, ~1.2 to 2.0 by B/s and s/h)
  solid_area_ft2         ft2   As, the solid area of the sign / wall
  width_ft               ft    B, the horizontal width (for the Case B eccentricity)

F_lb        = velocity_pressure_psf x gust_factor x force_coefficient x solid_area_ft2   [lb]
moment_caseB = F_lb x 0.2 x width_ft                                                      [lb-ft]  eccentric (torsion)
```

**Pinned worked example (qh = 17 psf, G = 0.85, Cf = 1.35, As = 64 ft^2, B = 8 ft).** The design wind force is
`17 x 0.85 x 1.35 x 64 = ` **1,248 lb**, and the Case B eccentric moment about the sign's vertical axis is
`1,248 x 0.2 x 8 = ` **1,997 lb-ft** -- the torsion that, not the straight force, sizes the single post and its footing.
**Cross-check (a tall narrow sign draws a higher coefficient).** A tall, narrow sign whose geometry pushes `Cf` to
`1.80` on the same qh and area: `F = 17 x 0.85 x 1.80 x 64 = ` **1,664 lb** -- a third more force from the shape alone,
the reason the aspect and clearance ratios must set Cf rather than a flat building-wall value. The tile returns the
design wind force and the Case B eccentric moment.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`ASCE`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the base example + the tall-
narrow cross-check); `test/fixtures/compute-map.js` (`wind-solid-sign` -> `computeWindSolidSign` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `wind-mwfrs-pressure` / `wind-cc-pressure` /
`wind-pressure`); `data/search/aliases.json` ("wind on sign", "freestanding wall wind", "asce 7 29.3", "solid sign
wind", "pylon sign wind", "monument sign wind load", "case b eccentricity", "net force coefficient sign"); the id
appended to the construction renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-
index; a `bounds-fuzzer.test.js` block pinning both examples, the F = qh G Cf As relation, the 0.2B eccentric moment,
and the error seams (non-finite, non-positive qh / area / width / Cf, gust out of range). Hand-writes its renderer
(mirroring the calc-construction.js `wind-mwfrs-pressure` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the force / moment stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the base example -> 1,248 lb, 1,997 lb-ft).

## 5. Roadmap position

Adds the ASCE 7 "other structures" wind case beside the enclosed-building tiles (`wind-mwfrs-pressure`,
`wind-cc-pressure`). A Cf-from-geometry helper (interpolating Figure 29.3-1 from B/s and s/h) and an open-sign (with
gaps) reduction are deliberate future follow-ons. Further Group E growth stays evidence-driven.
