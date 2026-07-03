# roughlogic.com Specification v348 -- Grille/Register Face Velocity and Free-Area Sizing (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.122.0). Batch spec-v347..v349 (the duct-and-airflow trio -- duct heat gain
> (v347), the grille face velocity and sizing (this spec), the air-density correction (v349)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `duct-sizing` sizes the duct, but the supply register
> or return grille at the end of it is sized differently -- by the face velocity through its net free area, which sets both
> the noise and the throw. A grille's free area is only a fraction of its gross size, the distinction the catalog never
> makes. Adds one tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits
> spec.md through spec-v347.md.
>
> **The gap, and the evidence for it.** Air passes through only the open part of a grille, so the face velocity is the
> airflow over the net free area: `V_face = CFM / A_free`, with `A_free = A_gross x free_area_ratio` (about 0.7 to 0.8 for a
> stamped grille, higher for bar grilles). Sizing works either way -- the required gross area for a target face velocity is
> `A_gross = CFM/(V_face x free_area_ratio)`. For 400 CFM at a 500 fpm target through a grille with a 0.75 free-area ratio,
> `A_free = 400/500 = 0.80 ft^2` and `A_gross = 0.80/0.75 = 1.07 ft^2 = 154 in^2`, so a 12 x 12 in grille (144 in^2 gross)
> runs at `400/(1.0 x 0.75) = 533 fpm` -- inside the ~400 to 750 fpm supply band that keeps a register quiet while still
> throwing air into the room. Too small and it whistles; too big and the air dumps and stratifies. `duct-sizing` handles the
> trunk; this tile handles the terminal.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The airflow is a volumetric
flow (cfm); the gross and free areas are areas (ft^2, also reported in^2); the free-area ratio is a dimensionless fraction;
the face velocity is a speed (fpm); the noise/throw band label is categorical. The v18/v21 contract: any non-finite input,
a flow or area at or below zero, or a free-area ratio outside `0 < ratio <= 1` returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the face-velocity relations by name; `editionNote` names **the face velocity
`V_face = CFM / A_free`, the free area `A_free = A_gross x free_area_ratio` (~0.7 to 0.8 stamped grille), the sizing inverse
`A_gross = CFM/(V_face x ratio)`, and the ASHRAE/manufacturer velocity bands (supply ~400 to 750 fpm, return ~300 to 600
fpm)**, and states that **this returns the face velocity and the required grille size -- it uses the entered free-area
ratio (from the manufacturer's catalog; it varies by model and blade type), the velocity bands are guidance for noise (NC)
and throw (which also depend on the specific diffuser's performance data), and it does not compute the throw, drop, or NC
rating; and this is a selection aid** -- the diffuser manufacturer's performance data govern.

## 2. The tile

### 2.1 `grille-face-velocity` -- Grille/Register Face Velocity and Free-Area Sizing

```
inputs:
  cfm         cfm    airflow
  ratio       -      free-area ratio (default 0.75)
  mode        -      face-velocity(from a gross size) | size(from a target velocity)
  A_gross_ft2 ft^2   gross grille area (mode 1)
  V_target    fpm    target face velocity (mode 2)

A_free = A_gross_ft2 * ratio
V_face = cfm / A_free                              ; mode 1: face velocity, fpm
A_gross_req = cfm / (V_target * ratio)             ; mode 2: required gross area, ft^2
band = supply/return velocity-band label
```

**Pinned worked example (400 CFM, size for a 500 fpm supply, ratio 0.75).** `A_gross_req = 400/(500 x 0.75) = 1.07 ft^2 = 154 in^2`
-- a 12 x 14 in grille. Checked the other way, a 12 x 12 (1.0 ft^2 gross) grille at 400 CFM runs
`V_face = 400/(1.0 x 0.75) = 533 fpm`, inside the supply band. **Cross-check (a return grille at the same flow).** Return
grilles run slower (quieter): sizing 400 CFM to a 400 fpm return target gives `A_gross = 400/(400 x 0.75) = 1.33 ft^2 = 192 in^2`
(a larger 12 x 16 grille) -- the reason returns are always bigger than supplies for the same airflow. The non-finite,
non-positive, and out-of-range-ratio error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, matching `duct-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the face-velocity relations, `editionNote` naming `V_face = CFM/A_free`,
`A_free = A_gross x ratio`, the sizing inverse, the velocity bands, and the enter-ratio, not-throw/NC caveats);
`test/fixtures/worked-examples.json` (the supply-sizing example + the return cross-check); `test/fixtures/compute-map.js`
(`grille-face-velocity` -> `computeGrilleFaceVelocity` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (->
`duct-sizing` / `duct-heat-gain` / `air-changes-hour` / `outdoor-air-ventilation`); `data/search/aliases.json` ("grille
size", "register sizing", "face velocity", "free area grille", "diffuser sizing", "return grille size", "supply register
velocity", "grille CFM", "air outlet sizing"); the id appended to the existing hvac renderers block in `app.js`; the
`// dims:` annotation (`cfm` volumetric flow, areas area, `ratio` dimensionless, `V_face` speed); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the two modes, the free-area-ratio effect, and the
non-positive / out-of-range-ratio / non-finite error seams. No new module; re-pin `calc-hvac.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the two-mode assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `A_free` / `V_face` (or `A_gross_req`) stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (400 CFM, 500 fpm -> 154 in^2 gross).

## 5. Roadmap position

Middle of the duct-and-airflow batch (v347..v349) in `calc-hvac.js`, adding the terminal sizing to the duct tiles. The
air-density correction (v349) follows. A throw/drop/NC estimate from a diffuser performance table, a slot-diffuser variant,
and a room-air-distribution (ADPI) check are the deliberate next follow-ons once the trio lands.
