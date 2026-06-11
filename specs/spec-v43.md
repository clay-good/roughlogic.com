# roughlogic.com Specification v43 — Tank Volume from Dipstick (1 New Tile)

> **Implementation status: CLOSED 2026-06-11 (package stamped 0.41.0, a
> minor; catalog 574 -> 575, wiring lint 30 renderer modules / 575 tile-id
> entries).** v43 is a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/
> v24/v25/v26/v27/v28/v29/v30/v31/v32/v33/v34/v35/v37/v38/v40/v41. It inherits
> everything from spec.md through spec-v42.md and changes none of it.
>
> v43 deepens **Group G (Cross-Trade Utilities)** with one first-principles,
> hand-verifiable tile the catalog did not yet cover: partial liquid volume of a
> cylindrical tank from a single depth (dipstick) reading. **No new group, no new
> module, no new dependencies, no telemetry, no AI, US standards only.** It lands
> in `calc-cross.js` (the Group G home, at 86% of its cap after the spec-v36 fab
> split freed headroom).
>
> **The gap.** `pipe-volume` computes the volume of a *full* cylinder; the
> catalog's "tank" tiles (`expansion-tank`, `wh-expansion-tank`, `septic-tank`,
> `pressure-tank-drawdown`, `thermal-expansion-volume`) are pressure-vessel and
> drainage sizing tiles, not liquid gauging. A concept-check against the 574 live
> tiles found **no** tile that turns a dipstick reading into gallons. That is the
> everyday question for anyone with a horizontal fuel, water, chemical, or feed
> tank, and the horizontal case is a genuinely non-trivial closed form (a circular
> segment), so it earns a tile.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit: a non-positive
  diameter or length, a negative depth, or a non-finite input returns `{ error }`;
  a depth beyond the tank ceiling clamps to full with a note rather than leaking;
  no tile throws, hangs, or returns a non-finite output field.
- The v19/v22 citation discipline applies to the new `citations.js` entry: it is
  first-principles geometry (public domain), cited as such with the
  governing-authority note.
- The tile id is kebab-case and was checked against the 574 live ids:
  `tank-volume` does not collide and does not duplicate an existing tile by
  concept (see §3).

## 2. The tile

### `tank-volume` — Tank Volume from Dipstick (Group G, calc-cross.js)

For a **horizontal** cylinder of radius `R` and length `L`, a liquid depth `h`
fills a circular segment whose area is

```
A = R^2 · acos((R - h) / R) - (R - h) · sqrt(2Rh - h^2)
V = A · L
```

For a **vertical** cylinder the partial volume is the trivial `V = π · R^2 · h`.
The full-tank volume is `π · R^2 · L` in both orientations, and percent full is
`V / V_full · 100`. Volume is reported in US gallons (`in^3 / 231`), liters, and
cubic feet; dimensions are entered in inches or feet (a unit toggle). Flat ends
are assumed — dished or hemispherical heads hold more and need a head-type
correction, which the notes call out.

**Worked example (pinned).** A 24 in diameter × 48 in long horizontal tank at a
12 in (half) depth: `A = 12^2 · acos(0) - 0 = 226.19 in^2`, `V = 226.19 · 48 =
10857.3 in^3 = 47.00 gal`, of a `π · 12^2 · 48 = 21714.7 in^3 = 94.00 gal` full
tank, so **50.0%**. Cross-checks: the same tank in feet (2 ft × 4 ft, 1 ft depth)
gives the same 47.00 gal; the vertical orientation at depth 12 in of 48 in gives
**25.0%**; a depth beyond the diameter clamps to the full 94.00 gal with a note.

## 3. Concept-check and wiring

Concept-checked against the 574 live tiles before implementing (id-collision-free
≠ concept-free): `pipe-volume` is the full cylinder only; `tankless-gpm`,
`expansion-tank`, `wh-expansion-tank`, `septic-tank`, `pressure-tank-drawdown`,
and `thermal-expansion-volume` are sizing / drawdown tiles, not partial-volume
gauging. No partial / horizontal-tank-volume / dipstick tile exists. **Ships.**

Per-tile wiring: a `tools-data.js` row (a `spec-v43` section after the v41 block,
`group: "G"`), `tile-meta.js` `_TILES`, `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js` (module path
`../../calc-cross.js`), `scripts/related-tiles.mjs` (`tank-volume` →
`pipe-volume` / `unit-converter` / `pump-tdh`), `data/search/aliases.json` (5
aliases), the `app.js` `CROSS_RENDERERS` declare, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js` block
pinning the worked example (both orientations and unit systems) and the error /
clamp seams. The `tools-data.js` registry crossed its gzip cap on the new row, so
its cap is bumped 47000 → 48000 B (it is lazy-loaded, not in the home-view
payload).

## 4. As-landed verification (gate plan)

On landing, the same green bar the recent tile specs cleared: `npm run lint`
(every gate, including the v31 `check-multiline-inputs` gate and the em-dash /
gzip-cap gates; the wiring lint must report **30 renderer modules / 575 tile-id
entries**), `npm test` (the unit suite, +1 test → 5,512), `npm run build`
(575 tile + 24 group shells, 601-URL sitemap), `npm run data:verify`, the worked-
examples runner (+1 fixture), the 320 px shell audit (575 tile shells), and the
full-catalog render-no-nan Chromium sweep plus the a11y gate (the new tile
verified clean, rendered output read to the digit).

## 5. Roadmap position

v43 resumes single-tile catalog growth into a headroom module after the v42
cap-relief split. The standing module-cap watch list carries `calc-mechanic.js`,
`calc-water.js`, `calc-agriculture.js`, `calc-hvac.js`, `calc-electrical.js`, and
the `tools-data.js` registry (now 48000 B). Further first-principles candidates
remain whatever survives a live concept-check; a vertical-tank-only tile is
already subsumed here, and dished-head tank volume would require a head-type
table (a reviewed-data item, deferred).
