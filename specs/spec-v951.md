# roughlogic.com Specification v951 -- Wenner 4-Pin Soil Resistivity (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v950.md. Grounding-design sweep, upstream of the
> accepted `grounding-electrode` (Dwight / IEEE 142) tile.
>
> **The gap, and the evidence for it.** The catalog computes driven-rod / grid resistance from soil resistivity (the
> Dwight `grounding-electrode` tile), but that tile takes resistivity as an INPUT -- nothing turns the actual field
> measurement (a Wenner 4-pin earth test) INTO the resistivity. Grep confirmed no Wenner / soil-resistivity / four-pin
> tile. Every grounding job starts with this test. The number this settles: a **10 ft** spacing reading 5 ohms is
> **95.8 ohm-m**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since resistivity is a compound unit), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive probe
spacing or meter reading returns `{ error }`. Citation discipline (v19/v22): the Wenner four-electrode method by name
(IEEE 81 / ASTM G57), `GOVERNANCE.general`; the note states that rho = 2 pi a R holds when the electrode depth is small
compared with the spacing, that the spacing a sets the effective depth so a set of readings maps resistivity vs depth,
and that resistivity swings with moisture / temperature / season -- the design uses the worst credible value and the
IEEE 81 / ASTM G57 method and the engineer govern.

## 2. The tile

### 2.1 `soil-resistivity-wenner` -- Wenner 4-Pin Soil Resistivity (IEEE 81 / ASTM G57)

```
inputs:
  probe_spacing_ft     equal probe spacing a (ft), default 10
  meter_resistance_ohm earth-tester reading R (ohms), default 5

a_m = probe_spacing_ft x 0.3048
resistivity_ohm_m  = 2 x pi x a_m x meter_resistance_ohm
resistivity_ohm_cm = resistivity_ohm_m x 100
```

**Pinned worked example.** 10 ft spacing (3.048 m), 5 ohm reading: `rho = 2 x pi x 3.048 x 5 = ` **95.8 ohm-m** (9,575
ohm-cm, the ohm-cm value the grounding-electrode tile takes). Cross-check: a wider **20 ft** spacing at 2 ohms is
`2 x pi x 6.096 x 2 = ` **76.6 ohm-m** -- the wider spacing samples deeper soil, and repeating at increasing spacings
maps resistivity versus depth.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `pv-ac-output-circuit`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (Wenner / IEEE 81 / ASTM G57, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the 10 ft example plus the 20 ft cross-check, pinning the resistivity); `test/fixtures/compute-map.js`
(`soil-resistivity-wenner` -> `computeSoilResistivityWenner`, module `../../calc-electrical.js`); `scripts/related-
tiles.mjs` (-> `grounding-electrode` / `max-grid-resistance-for-touch` / `step-touch-voltage`); `data/search/aliases.json`
(5 collision-checked aliases: "soil resistivity", "wenner test", "4-pin soil test", "earth resistivity", "soil
resistivity test"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `ELECTRICAL_RENDERERS` map
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-
fuzzer.test.js` block pinning the base resistivity, the ohm-cm conversion, the linearity in spacing and reading, and the
error seams. The calc-electrical.js gzip cap and the Group A group shell are watched at build. Home tile count 1,399 ->
1,400.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(10 ft / 5 ohm -> 95.8 ohm-m).

## 5. Roadmap position

Grounding design beside `grounding-electrode`, serving the electrician / grounding tech (electrical). Deliberately the
apparent-resistivity field reduction; the IEEE 81 / ASTM G57 test method, the seasonal moisture range, and the engineer
of record govern the design value. Feeds the Dwight grounding-electrode tile directly. Stays evidence-driven. Continues
the electrical field-test sweep at 1 new spec (v951).
