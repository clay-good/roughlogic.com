# roughlogic.com Specification v934 -- Dry-Pipe / Preaction Air Compressor CFM (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-firesprinkler.js`** (Group
> F), no new module, group, or dependency. Inherits spec.md through spec-v933.md. Fire-sprinkler system-ops sweep, beside
> the accepted `fire-pump-curve` and `sprinkler-system-demand` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes sprinkler demand and the fire pump but nothing sizes the
> **dry-pipe air compressor**. Grep confirmed no compressor tile. Every dry or preaction system needs a compressor that
> restores air within the NFPA 13 time limit. The number this settles: a 400-gal dry system to 40 psi in 30 minutes
> needs about **4.85 CFM** of free air.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
fire-sprinkler tiles: the dry volume and system volume carry `L^3`, the restore time carries `T`, the compressor output
carries `L^3 T^-1` (CFM), and the normal pressure is dimensionless (it enters only as the ratio P/14.7). The v18/v21
contract: a non-finite or non-positive dry volume, normal pressure, or restore time returns `{ error }`. Citation
discipline (v19/v22): the free-air relation by name (free air = (gal/7.48) x (psig/14.7) / minutes),
`GOVERNANCE.general`; the note states that NFPA 13 requires the normal air pressure be restored within about 30 minutes
(60 for some systems), that the free air is the system volume times the gauge-to-atmospheric ratio over the restore
time, that a listed automatic air-maintenance device (not a shop compressor) is required and nitrogen mitigates
corrosion, and that the pipe schedule, the pressure setting, and NFPA 13 / the AHJ govern.

## 2. The tile

### 2.1 `drypipe-air-compressor` -- Dry-Pipe / Preaction Air Compressor CFM

```
inputs:
  dry_volume_gal        dry-side system volume (gal, from the pipe schedule)
  normal_pressure_psig  normal air pressure (psig, default 40)
  restore_minutes       NFPA 13 restore time (min, default 30)

system_ft3   = dry_volume_gal / 7.48
free_air_cfm = system_ft3 x (normal_pressure_psig / 14.7) / restore_minutes
```

**Pinned worked example.** 400-gal dry system, 40 psi, 30 min:
`system = 400 / 7.48 = 53.5 ft^3`; `free air = 53.5 x (40 / 14.7) / 30 = ` **4.85 CFM** -- spec the next larger listed
unit. Cross-check: a 750-gal system at the same pressure and time is `100.3 x (40/14.7) / 30 = ` **9.09 CFM**, and a 60
minute restore allowance would halve either figure -- the CFM scales with the system volume and inversely with the
allowed restore time.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`, beside `smoke-detector-spacing-count`); a `tile-meta.js` `_TILES`
entry (`F`); a `citations.js` entry (NFPA 13 free-air relation, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 400-gal example plus the 750-gal cross-check, pinning the volume and CFM);
`test/fixtures/compute-map.js` (`drypipe-air-compressor` -> `computeDrypipeAirCompressor`, module
`../../calc-firesprinkler.js`); `scripts/related-tiles.mjs` (-> `fire-pump-curve` / `sprinkler-system-demand` /
`sprinkler-head-layout`); `data/search/aliases.json` (5 collision-checked aliases: "dry pipe air compressor", "sprinkler
air compressor", "air maintenance device sizing", "restore air pressure sprinkler", "preaction compressor cfm"), then
`node scripts/build-alias-shards.mjs`; a `_simpleRenderer` in the `FIRESPRINKLER_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-firesprinkler declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the system volume and CFM across two volumes and a 60-min restore, plus the error seams (non-positive volume /
pressure / time, non-finite); the Group F audit count in `test/unit/citations.test.js` bumped if the row lands inside the
parsed block. The calc-firesprinkler.js gzip cap is raised 7000 -> 8500 with a ledger note. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,382 ->
1,383.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, any Group F audit bump); `npm run
build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build
(cap raise); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((400/7.48) x (40/14.7) / 30 -> 4.85 CFM).

## 5. Roadmap position

Fire-sprinkler system-ops tile beside `fire-pump-curve`, serving the sprinkler fitter (fire). Deliberately a sizing
estimate; a listed air-maintenance device, the compressor rating at pressure, NFPA 13, and the AHJ govern. Stays
evidence-driven. Continues the fire-sprinkler system-ops sweep at 1 new spec (v934).
