# roughlogic.com Specification v200 -- Condensate Return Line Sizing (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v199..v203 (plumbing/pipefitting -- hydronic radiant,
> condensate return, and three fabrication/process layout tiles).** In-scope catalog expansion under the
> spec-v106 trades-only charter: the closing tile of the steam-and-condensate cluster opened at v157. Adds
> one tile to **`calc-pipefit.js`** (Group B); no new module, group, or dependency. Inherits spec.md
> through spec-v199.md.
>
> **The gap, and the evidence for it.** The steam cluster sizes the supply main (`steam-pipe-velocity`),
> computes flash (`flash-steam-pct`), and sizes the trap (`steam-trap-sizing`), but stops at the trap. The
> return line downstream is the line everyone undersizes, because the trick is that a condensate return is
> not sized for the liquid -- it is sized for the **flash steam** that re-boils off the condensate at the
> lower return pressure, which occupies hundreds of times the volume of the water. A return sized for the
> liquid floods and water-hammers. The fitter needs the flash mass, its volume at return pressure, and the
> line size that carries it at a return-velocity ceiling, and the catalog computes the flash fraction but
> never turns it into a return size.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
condensate load and the flash mass flow are a mass per time (`M/T`, lb/hr); the flash fraction is
`dimensionless`; the flash-steam specific volume at the return pressure is `L^3/M` (ft^3/lb); the velocity
ceiling is `L/T` (ft/min); the required area is `L^2` (in^2) and the minimum diameter is `L` (in). The
v18/v21 contract: any non-finite input, a non-positive condensate load, specific volume, or velocity
ceiling, or a flash fraction outside [0,1) returns `{ error }`; the divisions are by the guarded-positive
velocity ceiling and time base. Citation discipline (v19/v22): `GOVERNANCE.general` over the
flash-mass-and-continuity sizing method by name; `editionNote` names ASHRAE / Spirax Sarco return-sizing
practice and states that **the return is sized for the flash, the velocity ceiling is lower than a supply
main (roughly 4,000-5,000 ft/min), and a wet, dry, or vacuum return and the lift each change the design**
-- the engineer of record governs the return scheme. Pairs with `flash-steam-pct` for the fraction.

## 2. The tile

### 2.1 `condensate-return-sizing` -- Return Line Size From the Flash Steam

```
inputs:
  condensate_lbhr   M/T            condensate load reaching the return, lb/hr
  flash_fraction    dimensionless  flash fraction at the return pressure (0-1, from flash-steam-pct)
  spec_vol_ft3lb    L^3/M          flash-steam specific volume at the return pressure, ft^3/lb
  vel_ceiling_fpm   L/T            return velocity ceiling, ft/min (default 4,000)

flash_lbhr   = condensate_lbhr x flash_fraction
vol_cfm      = flash_lbhr x spec_vol_ft3lb / 60
req_area_ft2 = vol_cfm / vel_ceiling_fpm                 # guarded: vel_ceiling_fpm > 0
req_dia_in   = sqrt(4 x req_area_ft2 / pi) x 12
# then the smallest nominal pipe whose ID >= req_dia_in
```

**Pinned worked example.** 800 lb/hr of condensate, 13 percent flash to a 0 psig return (flash-steam
specific volume 26.8 ft^3/lb), 4,000 ft/min ceiling: `flash = 800 x 0.13 = 104 lb/hr`;
`vol_cfm = 104 x 26.8 / 60 = 46.5 cfm`; `req_area = 46.5 / 4000 = 0.0116 ft^2 = 1.67 in^2`;
`req_dia = sqrt(4 x 1.67 / pi) = 1.46 in` -> **1-1/2 in** return.
**Cross-check (less flash, smaller return).** Same load but a cooler 7 percent flash:
`flash = 56 lb/hr`; `vol_cfm = 25 cfm`; `req_area = 0.90 in^2`; `req_dia = 1.07 in` -> **1-1/4 in**. The
flash fraction, not the gallons of water, drives the return size.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the flash-mass/continuity method, `editionNote` naming
ASHRAE / Spirax Sarco, the lower-velocity-ceiling and wet/dry/vacuum-return caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`condensate-return-sizing` -> `computeCondensateReturnSizing` in `../../calc-pipefit.js`);
`scripts/related-tiles.mjs` (-> `flash-steam-pct` / `steam-trap-sizing` / `steam-pipe-velocity`);
`data/search/aliases.json` ("condensate return", "return line sizing", "steam return", "flash return",
"wet return", "dry return"); the id appended to the existing pipefit renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, the cross-check, and error seams (non-finite, load/specific-volume/ceiling <= 0, flash fraction
outside [0,1)). Raise the `calc-pipefit.js` size cap by ~20 percent if needed (dated comment).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the flash, volume, and size lines wrap on a
phone); render-no-nan + a11y sweep, output read to the value (800 lb/hr / 13 percent / 26.8 -> 1-1/2 in).

## 5. Roadmap position

Closes the steam-and-condensate cluster (v157 flash, v158 supply main, v159 trap, v200 return). The five
steam tiles now carry a fitter from the boiler to the trap and back. Further steam growth (PRV-station
sizing, vacuum-return pump) stays evidence-driven.
