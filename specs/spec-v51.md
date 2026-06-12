# roughlogic.com Specification v51 — Stage Lighting Beam and Throw (1 New Tile)

> **Implementation status: CLOSED 2026-06-12 (package stamped 0.46.0, a
> minor; catalog 578 -> 579, wiring lint 30 renderer modules / 579 tile-id
> entries).** v51 is a catalog-growth spec in the single-tile-deepening lineage.
> It inherits everything from spec.md through spec-v50.md and changes none of it.
>
> v51 deepens **Group N (Stage and Live Production)** with the one pillar of live
> production the catalog had not covered: **lighting**. **No new group, no new
> module, no new dependencies, no telemetry, no AI, US standards only.** It lands
> in `calc-stage.js`.
>
> **The gap.** Group N already had audio (`spl-distance`, `spl-atmospheric`,
> `decibel-converter`, `speaker-impedance`, `amp-power-spl`, `time-alignment`),
> rigging (`truss-capacity`, `rigging-check`), power (`power-distro`,
> `neutral-imbalance`), and control (`dmx-planner`). The fourth department on every
> show -- lighting -- had no tile. A lighting designer's everyday math is the beam
> size at a throw and the brightness at the stage, and nothing computed it.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to the new tile. (Illuminance and luminous flux are
  outside the M/L/T base set, the `lux-to-footcandle` precedent; the `// dims:`
  annotation marks the photometric quantities dimensionless.)
- The v18/v21 tile contract applies: a beam angle outside (0, 180), a non-positive
  throw, a non-positive intensity, or a non-finite input returns `{ error }`; no
  tile throws, hangs, or leaks a non-finite output field.
- The v19/v22 citation discipline applies; the entry uses the Group N
  `GOVERNANCE.rigging` variant (the production-floor governance the group shares).
- The tile id is kebab-case and was checked against the 578 live ids:
  `lighting-beam` does not collide and does not duplicate an existing tile by
  concept (see §3).

## 2. The tile

### `lighting-beam` — Stage Lighting Beam and Throw (Group N, calc-stage.js)

From a fixture's beam angle and the throw distance to the target:

```
beam (pool) diameter = 2 x throw x tan(beam angle / 2)
center illuminance    E = candela / distance^2          (inverse-square law)
candela from lumens   I = lumens / (2*pi*(1 - cos(beam angle / 2)))
```

Illuminance is reported in both footcandles (`candela / feet^2`) and lux
(`candela / metres^2`); `1 fc = 10.764 lux`. The intensity source is a select: the
published center-beam candela, or the fixture's total lumens spread over the beam
cone (an average-over-the-cone estimate, flagged as such). Distance is feet or
metres.

**Worked example (pinned).** A 20-degree fixture at a 30 ft throw with 100,000 cd:
beam diameter `= 2 x 30 x tan(10 deg) = 10.5796 ft`; illuminance `= 100000 / 30^2
= 111.11 fc = 1196 lux`. The inverse-square behaviour is the headline intuition:
double the throw to 60 ft and the illuminance quarters to 27.8 fc. Cross-check
(lumens mode): a 20-degree fixture rated 20,000 lm gives `20000 / (2*pi*(1 -
cos(10 deg))) = 209,500 cd`, so `2095 lux` at 10 m.

## 3. Concept-check and wiring

Concept-checked against the 578 live tiles. The existing `lux-to-footcandle`
(Group A) does the **architectural lumen method** -- the average maintained
illuminance over a room area from a luminaire flux budget, coefficient of
utilization, and light-loss factor. It computes no beam diameter, no throw, and no
inverse-square point illuminance. `lighting-beam` is the **theatrical point-source
model** for a single aimed fixture: a genuinely distinct computation and audience,
sharing only the incidental lux/footcandle unit. The other Group N tiles are
audio, rigging, power, and control. **Ships.**

Per-tile wiring: a `tools-data.js` row (group `N`), `tile-meta.js` `_TILES`,
`citations.js`, `test/fixtures/worked-examples.json`,
`test/fixtures/compute-map.js` (module path `../../calc-stage.js`),
`scripts/related-tiles.mjs` (`lighting-beam` -> `dmx-planner` / `truss-capacity`
/ `power-distro`), `data/search/aliases.json` (5 aliases), the `app.js`
`STAGE_RENDERERS` declare, the `// dims:` annotation, the regenerated v14 corpus +
tile-index, and a `test/unit/bounds-fuzzer.test.js` block pinning the worked
example, the inverse-square halving, the lumens->candela derivation, and the error
seams. `calc-stage.js` crossed its gzip cap on the new tile, so its cap is bumped
17000 -> 18500 B (lazy-loaded, not in the home-view payload). The new row lands in
the spec-v24 Group-N appendix section, so the Group-N original-block citation
count assertion is unaffected.

## 4. As-landed verification (gate plan)

The same green bar: `npm run lint` (every gate; the wiring lint must report **30
renderer modules / 579 tile-id entries**; the spec-v49 `check-readme-counts` gate
must agree at 579 tiles / 605 sitemap URLs), `npm test` (the unit suite, +1 test
-> 5,516), `npm run build` (579 tile + 24 group shells, 605-URL sitemap), `npm run
data:verify`, the worked-examples runner (+1 fixture), the 320 px shell audit (579
tile shells), and the full-catalog render-no-nan Chromium sweep plus the a11y gate
(the new tile verified clean, rendered output read to the digit).

## 5. Roadmap position

v51 brings Group N to 12 tiles and completes its four production departments
(audio, lighting, rigging, power + control). The standing module-cap watch list
carries `calc-kitchen.js` (94%), `calc-stage.js` (now ~93% of the new 18.5 KB
cap), and `tools-data.js` (97% of 48000 B). The under-served substantive groups
remaining for future tile hunts are P (Field/SAR, 11), S (Legal, 12), and T
(Lab, 14); the legal group's gaps largely sit behind the documented
reviewed-data gate.
