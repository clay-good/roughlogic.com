# roughlogic.com Specification v939 -- Jockey (Pressure-Maintenance) Pump Sizing (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-firesprinkler.js`** (Group
> F), no new module, group, or dependency. Inherits spec.md through spec-v938.md. Fire-pump system-ops sweep, beside the
> accepted `fire-pump-curve` and `drypipe-air-compressor` tiles.
>
> **The gap, and the evidence for it.** The catalog has the fire-pump curve but nothing sizes the **jockey pump** or its
> staggered pressure-switch settings. Grep confirmed no jockey tile. Every fire-pump job sets a jockey to keep the fire
> pump from starting on leakage. The number this settles: a 750 gpm fire pump takes a **7.5 gpm** jockey with settings of
> **170 / 160 / 155 psi**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
fire-pump tiles: the fire-pump and jockey flows carry `L^3 T^-1`, and the pressures (dimensionless psi offsets) are
dimensionless. The v18/v21 contract: a non-finite or non-positive fire-pump flow or churn pressure, or a negative static
pressure, returns `{ error }`. Citation discipline (v19/v22): the jockey-sizing practice by name (jockey = max(1% of
fire pump, 1 gpm); stop = churn + static; start = stop - 10; fire-pump start = start - 5), `GOVERNANCE.general`; the note
states that the jockey flow is intentionally small so the fire pump does not start on leakage, that its head must exceed
the system max pressure, that the switches are staggered so the jockey acts first, that a too-large jockey can mask a
real flow and keep the fire pump from starting on a fire, and that NFPA 20, the pressure-switch settings, and the AHJ /
stamped fire-pump design govern.

## 2. The tile

### 2.1 `jockey-pump-sizing` -- Jockey (Pressure-Maintenance) Pump Sizing (NFPA 20)

```
inputs:
  fire_pump_gpm    fire pump rated flow (gpm)
  churn_psi        fire pump churn / shutoff pressure (psi)
  min_static_psi   minimum static supply pressure (psi)

jockey_gpm          = max(0.01 x fire_pump_gpm, 1)
jockey_stop_psi     = churn_psi + min_static_psi
jockey_start_psi    = jockey_stop_psi - 10
fire_pump_start_psi = jockey_start_psi - 5
```

**Pinned worked example.** 750 gpm fire pump, 120 psi churn, 50 psi static:
`jockey = max(0.01 x 750, 1) = ` **7.5 gpm**; `stop = 120 + 50 = 170`, `start = 160`, `fire-pump start = ` **155 psi**.
Cross-check: a 500 gpm fire pump gives a `5 gpm` jockey, and a 100 psi churn with 40 psi static sets **140 / 130 / 125
psi** -- the jockey acts in the top band and the fire pump only starts if the jockey cannot hold pressure.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`, beside `drypipe-air-compressor`); a `tile-meta.js` `_TILES` entry
(`F`); a `citations.js` entry (NFPA 20 jockey practice, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
750 gpm example plus the 500 gpm cross-check, pinning the jockey flow and the settings); `test/fixtures/compute-map.js`
(`jockey-pump-sizing` -> `computeJockeyPumpSizing`, module `../../calc-firesprinkler.js`); `scripts/related-tiles.mjs`
(-> `fire-pump-curve` / `sprinkler-system-demand` / `drypipe-air-compressor`); `data/search/aliases.json` (5
collision-checked aliases: "jockey pump", "pressure maintenance pump", "jockey pump sizing", "fire pump start pressure",
"jockey pump settings"), then `node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the `FIRESPRINKLER_RENDERERS`
map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-firesprinkler declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the jockey flow (including the 1 gpm floor), the three staggered settings, and the
error seams (non-positive flow / churn, negative static, non-finite); the Group F audit count in
`test/unit/citations.test.js` bumped if the row lands inside the parsed block. The calc-firesprinkler.js gzip cap is
watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from
home first paint. Home tile count 1,387 -> 1,388.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, any Group F audit bump); `npm run
build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(max(0.01 x 750, 1) -> 7.5 gpm; 120 + 50 -> 170 / 160 / 155 psi).

## 5. Roadmap position

Fire-pump system-ops tile beside `fire-pump-curve`, serving the sprinkler fitter (fire). Deliberately a settings guide;
NFPA 20, the actual pressure-switch settings, and the AHJ / stamped fire-pump design govern. Stays evidence-driven.
Continues the fire-pump system-ops sweep at 1 new spec (v939).
