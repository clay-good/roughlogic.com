# roughlogic.com Specification v409 -- Cooling Coil Face Velocity and Carryover Check (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the HVAC duct-design trio (v408 Manual D friction rate -> v409 coil face
> velocity -> v410 VAV box airflow). `grille-face-velocity` sizes registers and `filter-pressure-drop` handles filters, but
> nothing sizes the cooling coil itself -- the face velocity that decides whether condensate blows off the fins as water
> carryover.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Air moving too fast across a wet cooling coil strips
> condensate off the fins and carries it downstream, wetting the duct and filters. The coil face velocity is
> `V = CFM / face_area`, and above roughly `500 to 550 fpm` a wet coil risks moisture carryover; the required face area for a
> target velocity is `CFM / velocity`. The catalog sizes grilles and filters but not the coil face. This adds the coil tile
> to the existing **`calc-hvacsystems.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through
> spec-v408.md.
>
> **The gap, and the evidence for it.** A `2000 CFM` air handler with a `24 in` by `18 in` coil (`face area = 3.00 ft^2`)
> runs a face velocity of `2000 / 3.00 = 667 fpm` -- above the `~500 fpm` carryover threshold, so at design cooling it will
> sling water off the coil. Drop the airflow to `1200 CFM` on the same coil and the velocity falls to `400 fpm`, safely
> below the threshold. No tile does this; a designer picking a coil had no face-velocity or carryover check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The airflow is a volumetric
flow (CFM); the coil face width and height are lengths (in); the face velocity is a speed (fpm); the face area is an area
(ft^2). The v18/v21 contract: any non-finite input, or a non-positive airflow or coil dimension, returns `{ error }`; the
tile computes the face area and velocity, flags moisture carryover above the `~500 fpm` wet-coil threshold (selectable, with
`550 fpm` for high-performance drain pans), and reports the required face area for a target velocity. Citation discipline
(v19/v22): `GOVERNANCE.general` over coil face velocity by name; `editionNote` names **the coil face velocity
`V = CFM / face_area`, the `500 to 550 fpm` moisture-carryover threshold for a wet cooling coil, and the required-area
inverse `face_area = CFM / target_velocity`**, and states that **this returns the coil face velocity and the carryover risk,
that it does not compute coil capacity or rows (a coil-selection program does), and that it is a design aid, not a
substitute for the coil manufacturer's rating**.

## 2. The tile

### 2.1 `coil-face-velocity` -- Cooling Coil Face Velocity and Carryover Check

```
inputs:
  cfm             cfm   airflow across the coil
  face_width_in   in    coil face width
  face_height_in  in    coil face height
  threshold_fpm   fpm   carryover threshold (default 500)

face_area_ft2 = (face_width_in * face_height_in) / 144
face_velocity = cfm / face_area_ft2
carryover     = face_velocity > threshold_fpm
```

**Pinned worked example (2000 CFM, 24 in x 18 in coil).** `face area = 24*18/144 = 3.00 ft^2`;
`V = 2000/3.00 = 667 fpm` -> above the `500 fpm` threshold, **carryover risk**. **Cross-check (lower airflow is safe).** At
`1200 CFM` on the same coil, `V = 400 fpm` -> below threshold, no carryover. A non-positive airflow or coil dimension takes
the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `grille-face-velocity` / `filter-pressure-drop`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, coil face velocity, `editionNote` naming
`V = CFM/face_area`, the carryover threshold, and the required-area inverse); `test/fixtures/worked-examples.json` (the
carryover example + the safe cross-check); `test/fixtures/compute-map.js` (`coil-face-velocity` ->
`computeCoilFaceVelocity` in `../../calc-hvacsystems.js`); `scripts/related-tiles.mjs` (-> `grille-face-velocity` /
`filter-pressure-drop` / `cooling-coil-total-load` / `coil-bypass-factor`); `data/search/aliases.json` ("coil face
velocity", "cooling coil velocity", "moisture carryover", "coil face area", "500 fpm coil", "wet coil carryover", "coil
sizing velocity", "face velocity fpm", "condensate carryover"); the id appended to the existing HVAC-systems renderers block
in `app.js`; the `// dims:` annotation (CFM flow, dims length, velocity speed, area area); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the carryover threshold, and the non-positive /
non-finite error seams. No new module; re-pin `calc-hvacsystems.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the carryover flag, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the area / velocity / carryover output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (2000 CFM, 24x18 -> 667 fpm, carryover).

## 5. Roadmap position

The middle of the HVAC duct-design trio: `manual-d-friction-rate` (v408) sets the duct sizing and `vav-box-airflow` (v410)
sizes the terminals, while this tile checks the coil the air crosses. A coil-rows-from-total-load and a coil pressure-drop
companion are the deliberate next follow-ons.
