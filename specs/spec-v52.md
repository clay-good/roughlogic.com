# roughlogic.com Specification v52 — Hiking Time, Naismith's Rule (1 New Tile)

> **Implementation status: CLOSED 2026-06-12 (package stamped 0.47.0, a
> minor; catalog 579 -> 580, wiring lint 30 renderer modules / 580 tile-id
> entries).** v52 is a catalog-growth spec in the single-tile-deepening lineage.
> It inherits everything from spec.md through spec-v51.md and changes none of it.
>
> v52 deepens **Group P (Field, Backcountry, and SAR)** with the canonical
> trip-time estimate the group lacked. **No new group, no new module, no new
> dependencies, no telemetry, no AI, US standards only.** It lands in
> `calc-field.js`.
>
> **The gap.** Group P covered navigation (`pacing-distance`, `bearing-conversion`,
> `magnetic-declination`, `utm-conversion`), safety (`slope-avalanche`,
> `lightning-countdown`), planning (`backcountry-needs`), timing (`solar-times`),
> SAR (`search-probability`), and survey (`area-by-coordinates`,
> `traverse-closure`) -- but no estimate of how long a leg will take. Trip-time
> over distance and climb is the first thing a trip leader or SAR planner computes,
> and `pacing-distance` (pace count -> distance) is a different question.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies: a non-positive distance, a negative ascent,
  or a non-finite input returns `{ error }`; a blank pace defaults rather than
  dividing by zero; no tile throws, hangs, or leaks a non-finite output field.
- The v19/v22 citation discipline applies; the entry cites Naismith's rule by name
  and uses `GOVERNANCE.general`.
- The tile id is kebab-case and checked against the 579 live ids: `hiking-time`
  does not collide and does not duplicate an existing tile by concept (§3).

## 2. The tile

### `hiking-time` — Hiking Time, Naismith's Rule (Group P, calc-field.js)

```
base time   = horizontal distance / pace            (default pace 5 km/h or 3 mph)
ascent time = total ascent / (600 m per hour)        (Naismith's ascent penalty)
total       = (base time + ascent time) x terrain/fatigue factor
```

Distance is entered in km or miles, ascent in metres or feet; the result is shown
in decimal hours and h:min, with the flat-and-ascent breakdown. The terrain /
fatigue factor (default 1.0) scales the whole estimate for a heavy pack, rough
ground, or a tired party. Descent is treated as flat (Langmuir's steep-descent
correction is out of scope and noted).

**Worked example (pinned).** 10 km with 600 m of ascent at 5 km/h: base `= 10/5 =
2 hr`, ascent `= 600/600 = 1 hr`, total `= 3 h 0 min`. Cross-checks: a 1.5x
terrain factor gives `4 h 30 min`; 6 mi with 2000 ft of ascent at the default 3
mph gives `2 hr + 609.6/600 = 3.016 hr ≈ 3 h 1 min`.

## 3. Concept-check and wiring

Concept-checked against the 579 live tiles: `pacing-distance` converts a pace
count to distance (not time); `backcountry-needs` is water/calories;
`search-probability` is SAR detection; `solar-times` is daylight windows. No
hiking-time / Naismith / travel-time tile exists. **Ships.**

Per-tile wiring: a `tools-data.js` row (group `P`), `tile-meta.js` `_TILES`,
`citations.js`, `test/fixtures/worked-examples.json`,
`test/fixtures/compute-map.js` (module path `../../calc-field.js`),
`scripts/related-tiles.mjs` (`hiking-time` -> `pacing-distance` /
`backcountry-needs` / `slope-avalanche`), `data/search/aliases.json` (5 aliases),
the `app.js` `FIELD_RENDERERS` declare, the `// dims:` annotation, the regenerated
v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js` block pinning the
worked example, the factor scaling, the mi/ft + default-pace path, and the error
seams. The new row lands in the spec-v25 Group-P appendix section, so the Group-P
original-block citation count assertion is unaffected. `calc-field.js` (89.8% ->
96.8% of its 22 KB cap) and `tools-data.js` (98% of 48000 B) both fit the addition
without a cap bump.

## 4. As-landed verification (gate plan)

The same green bar: `npm run lint` (every gate; the wiring lint must report **30
renderer modules / 580 tile-id entries**; the spec-v49 `check-readme-counts` gate
must agree at 580 tiles / 606 sitemap URLs), `npm test` (the unit suite, +1 test
-> 5,517), `npm run build` (580 tile + 24 group shells, 606-URL sitemap), `npm run
data:verify`, the worked-examples runner (+1 fixture), the 320 px shell audit (580
tile shells), and the full-catalog render-no-nan Chromium sweep plus the a11y gate
(the new tile verified clean, rendered output read to the digit).

## 5. Roadmap position

v52 brings Group P to 12 tiles. `calc-field.js` is now at ~97% of its 22 KB cap
and `tools-data.js` at ~98% of 48000 B, so the next Group-P/cross tile needs a cap
bump on one or both (both lazy-loaded, so spec-v10 §H.2-safe). The under-served
substantive groups remaining are S (Legal, 12 -- largely behind the documented
reviewed-data gate) and T (Lab, 14); the recurring near-cap modules
(`calc-kitchen.js`, `calc-stage.js`, `calc-field.js`, `tools-data.js`) are the
standing split / bump watch list.
