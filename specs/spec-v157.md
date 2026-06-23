# roughlogic.com Specification v157 -- Flash Steam Percentage (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v157..v163 (plumbing/pipefitting -- steamfitting, pressure
> piping, and pipe support).** In-scope catalog expansion under the spec-v106 trades-only charter: the
> first of a steam-and-condensate cluster for the pipefitting/steamfitting trade. Adds one tile to
> **`calc-pipefit.js`** (Group B); no new module, group, or dependency. Inherits spec.md through
> spec-v156.md.
>
> **The gap, and the evidence for it.** Steamfitting is half of "pipefitting," yet the catalog has no
> steam tile at all. The water side is deep (boiler distribution, hydronic expansion, recirc) and the gas
> side is deep (six fuel-gas tiles), but live steam and its condensate are absent. The single most common
> steamfitter number is **flash steam**: when condensate drops across a trap from a high pressure to a
> lower one, the sensible heat it can no longer hold re-boils a fraction of the condensate back to steam.
> That fraction drives flash-tank sizing, vent-line sizing, energy-recovery decisions, and the "why is my
> return line full of steam" diagnosis -- and there is nowhere in the catalog to compute it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The two
saturated-liquid enthalpies and the latent heat are an energy per mass (`L^2 T^-2`, Btu/lb); the gauge
pressures are a pressure; the flash fraction is `dimensionless` (reported as a percent). The v18/v21
contract: any non-finite input, a low-side pressure at or above the high-side pressure, or a non-positive
latent heat returns `{ error }`; the only division is by the guarded-positive latent heat `h_fg` at the
low side. Citation discipline (v19/v22): `GOVERNANCE.general` over the flash relation by name;
`editionNote` names the ASME steam tables (the bundled saturated-water enthalpy points) and states that
**this is a thermodynamic-ideal flash fraction** -- real trap behavior, subcooling, and line losses move
the field number, and a flash-recovery vessel is sized from the manufacturer's data.

## 2. The tile

### 2.1 `flash-steam-pct` -- Flash Steam Percentage Across a Pressure Drop

```
inputs:
  hf_high   L^2/T^2   saturated-liquid enthalpy at the high (upstream) pressure, Btu/lb
  hf_low    L^2/T^2   saturated-liquid enthalpy at the low (downstream) pressure, Btu/lb
  hfg_low   L^2/T^2   latent heat of vaporization at the low pressure, Btu/lb

flash_fraction = (hf_high - hf_low) / hfg_low      # guarded: hfg_low > 0, hf_high > hf_low
flash_pct      = flash_fraction x 100
```

The three enthalpies come from the bundled ASME saturated-water table keyed by the entered gauge
pressures (high and low), or are user-supplied for an off-table pressure.

**Pinned worked example.** Condensate at 100 psig (h_f = 309 Btu/lb) flashed to 0 psig / atmospheric
(h_f = 180 Btu/lb, h_fg = 970 Btu/lb): `flash = (309 - 180) / 970 = 0.133` -> **13.3 percent** flashes to
steam (matches the published ~13 percent for 100-to-0 psig).
**Cross-check (smaller drop, less flash).** 50 psig (h_f = 267 Btu/lb) to 0 psig:
`(267 - 180) / 970 = 0.090` -> **9.0 percent**. The fraction scales with the sensible-heat surplus; the
trap and subcooling govern the field value.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting","plumbing"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the flash relation, `editionNote` naming the ASME steam tables
and the ideal-flash caveat); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`flash-steam-pct` -> `computeFlashSteamPct` in `../../calc-pipefit.js`);
`scripts/related-tiles.mjs` (-> `steam-pipe-velocity` / `steam-trap-sizing` / `tankless-gpm`);
`data/search/aliases.json` ("flash steam", "flash percentage", "condensate flash", "flash tank",
"steam trap loss", "secondary steam"); the id appended to the existing pipefit renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning the example, the cross-check, and error seams (non-finite, `hf_low >= hf_high`, `hfg_low <= 0`).
Raise the `calc-pipefit.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js`
cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the percent and the two enthalpy inputs wrap
on a phone); render-no-nan + a11y sweep, output read to the value (100/0 psig -> 13.3 percent).

## 5. Roadmap position

Opens the steam-and-condensate cluster (this, `steam-pipe-velocity` v158, `steam-trap-sizing` v159) that
gives steamfitting a home alongside the established water and gas sides of Group B. Further steam growth
(condensate-return sizing, PRV-station sizing) stays evidence-driven.
