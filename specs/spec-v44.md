# roughlogic.com Specification v44 — Circular Arc Layout (1 New Tile)

> **Implementation status: CLOSED 2026-06-11 (package stamped 0.42.0, a
> minor; catalog 575 -> 576, wiring lint 30 renderer modules / 576 tile-id
> entries).** v44 is a catalog-growth spec in the lineage of v15/v16/v17/v20/v23/
> v24/v25/v26/v27/v28/v29/v30/v31/v32/v33/v34/v35/v37/v38/v40/v41/v43. It inherits
> everything from spec.md through spec-v43.md and changes none of it.
>
> v44 deepens **Group G (Cross-Trade Utilities)** with one first-principles,
> hand-verifiable tile the catalog did not yet cover: the radius, arc length, and
> central angle of a circular arc recovered from a measured chord (span) and rise
> (sagitta) at midspan. **No new group, no new module, no new dependencies, no
> telemetry, no AI, US standards only.** It lands in `calc-fab.js` (the Group G
> fabrication & layout bench, at ~79% of its cap), the natural home alongside
> `bolt-circle`, `sine-bar`, `pipe-template-wrap`, and the conduit-bend suite.
>
> **The gap.** `bolt-circle` lays out hole positions on a known circle; the
> conduit and pipe tiles bend to known angles. But the everyday *layout* question
> -- you can measure the span and the rise of a curve in the field, what radius
> reproduces it? -- had no tile. A concept-check against the 575 live tiles found
> no chord / sagitta / arc-from-measurement tile. That is the question for an
> arch, a curved trim or handrail, a sheet-metal radius, or a road curve from
> field shots, and the chord-and-rise -> radius relation is the classic
> looked-up formula, so it earns a tile.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit: a non-positive chord
  or rise, or a non-finite input, returns `{ error }`; no tile throws, hangs, or
  leaks a non-finite output field.
- The v19/v22 citation discipline applies to the new `citations.js` entry: it is
  first-principles circle geometry (public domain), cited as such with the
  governing-authority note.
- The tile id is kebab-case and was checked against the 575 live ids:
  `circular-arc` does not collide and does not duplicate an existing tile by
  concept (see §3).

## 2. The tile

### `circular-arc` — Circular Arc Layout (Group G, calc-fab.js)

Given the chord (span) `c` and the rise (sagitta / middle ordinate) `h` measured
perpendicular at midspan, the arc's radius is

```
R = (c^2 / 4 + h^2) / (2h)
```

The central angle is `θ = 2 · acos((R − h) / R)` (this is valid for both the minor
arc, `h < R`, and the major arc, `h > R`, because the argument goes negative past
the semicircle), and the arc length is `s = R · θ`. The tile reports the radius,
diameter, central angle in degrees, and arc length, and notes the minor /
semicircle / major case and the half-chord offset for laying it out.

**Worked example (pinned).** Chord 24 in, rise 4 in: `R = (12^2 + 4^2) / (2·4) =
160 / 8 = 20 in`; `θ = 2·acos(16/20) = 2·acos(0.8) = 1.28700 rad = 73.7398 deg`;
`s = 20 · 1.28700 = 25.7400 in`. Cross-checks: a chord of 20 in with a rise of 10
in gives `R = 10` (the chord is a diameter), a `180.0 deg` semicircle, arc
`π·10 = 31.4159 in`; a chord of 10 in with a rise of 12 in gives a major arc
(`> 180 deg`).

## 3. Concept-check and wiring

Concept-checked against the 575 live tiles before implementing (id-collision-free
≠ concept-free): `bolt-circle` computes hole coordinates on a known bolt circle;
`pipe-template-wrap` / `pipe-miter-cut` develop pipe templates; `rolling-offset`
and the conduit suite solve fitting/bend triangles. None recovers a circle's
radius from a chord and rise. No chord / sagitta / middle-ordinate / arc-from-
measurement tile exists. **Ships.**

Per-tile wiring: a `tools-data.js` row (a `spec-v44` section after the v43 row,
`group: "G"`), `tile-meta.js` `_TILES`, `citations.js`,
`test/fixtures/worked-examples.json`, `test/fixtures/compute-map.js` (module path
`../../calc-fab.js`), `scripts/related-tiles.mjs` (`circular-arc` → `bolt-circle`
/ `rolling-offset` / `pipe-template-wrap`), `data/search/aliases.json` (5
aliases), the `app.js` `FAB_RENDERERS` declare, the `// dims:` annotation, the
regenerated v14 corpus + tile-index, and a `test/unit/bounds-fuzzer.test.js` block
pinning the worked example (plus the semicircle and major-arc cases and the error
seams). The `tools-data.js` registry fit the new row within its current 48000 B
cap (no bump).

## 4. As-landed verification (gate plan)

On landing, the same green bar the recent tile specs cleared: `npm run lint`
(every gate; the wiring lint must report **30 renderer modules / 576 tile-id
entries**), `npm test` (the unit suite, +1 test → 5,513), `npm run build`
(576 tile + 24 group shells, 602-URL sitemap), `npm run data:verify`, the worked-
examples runner (+1 fixture), the 320 px shell audit (576 tile shells), and the
full-catalog render-no-nan Chromium sweep plus the a11y gate (the new tile
verified clean, rendered output read to the digit).

## 5. Roadmap position

v44 continues single-tile catalog growth into a headroom module. The standing
module-cap watch list carries `calc-mechanic.js`, `calc-water.js`,
`calc-agriculture.js`, `calc-hvac.js`, `calc-electrical.js`, `calc-cross.js` (now
90.5%), and the `tools-data.js` registry (96% of 48000 B, due for another bump
on the next Group-G/cross row). Further first-principles candidates remain
whatever survives a live concept-check; a chord+radius -> rise or radius+angle ->
chord solver mode could extend this tile later if demand warrants.
