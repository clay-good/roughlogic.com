# roughlogic.com Specification v433 -- Product Pull-Down Load (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.150.0; proposed 2026-07-03). Second tile of the walk-in refrigeration trio (v432 box heat load -> v433 product
> pull-down -> v434 evaporator TD). `walk-in-cooler-load` takes the product load as a given input; this tile computes it --
> the heat to cool (and, for a freezer, freeze) the product from its entering temperature to storage over the pull-down
> time.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Warm product entering a cooler or freezer is often the
> biggest load. Cooling it above freezing is `m * cp_above * (T_enter - T_storage)`; freezing it adds the latent heat of
> fusion `m * hif` and the sensible heat below freezing `m * cp_below * (T_freeze - T_storage)`. Spread over the pull-down
> hours, that gives the Btu/hr the coil must add to the box load. `walk-in-cooler-load` asked for this number but nothing
> produced it. This adds the pull-down tile to the existing **`calc-refrigerant.js`** module (Group C); no new group, trade,
> or dependency. Inherits spec.md through spec-v432.md.
>
> **The gap, and the evidence for it.** Cooling `2,000 lb` of produce (`cp = 0.9 Btu/lb-F`) from `80 deg F` to a `35 deg F`
> cooler removes `2000 * 0.9 * 45 = 81,000 Btu`; over a `24 hr` pull-down that is `81,000 / 24 = 3,375 Btu/hr` added to the
> box load. Freeze the same product to `0 deg F` and the latent heat dominates: about `358,800 Btu` total (`~14,950 Btu/hr`),
> more than four times the cooling-only case. No tile does this; the box-load tile could not see the product it was asked to
> hold.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The product mass is a mass
(lb); the specific heats are Btu/lb-F; the latent heat of fusion is Btu/lb; the temperatures are temperatures (deg F); the
pull-down time is a time (hr); the total heat is an energy (Btu) and the rate a power (Btu/hr). The v18/v21 contract: any
non-finite input, or a non-positive mass or pull-down time, returns `{ error }`; the tile adds the below-freezing latent and
sensible terms only when the storage temperature is below the product freezing point, and reports the total Btu and the
Btu/hr rate. Citation discipline (v19/v22): `GOVERNANCE.general` over the product refrigeration load by name; `editionNote`
names **the ASHRAE Refrigeration Handbook product load, the above-freezing sensible `m*cp_above*(T_enter - T_storage)`, the
latent heat of fusion `m*hif`, the below-freezing sensible `m*cp_below*(T_freeze - T_storage)`, and the pull-down rate as the
total over the allowed hours**, and states that **this returns the product cooling/freezing load and its hourly rate, that
specific heats and freezing points come from ASHRAE product tables, and that it is a sizing aid, not a substitute for a full
refrigeration load calculation**.

## 2. The tile

### 2.1 `product-pull-down-load` -- Product Pull-Down Load

```
inputs:
  mass_lb        lb        product mass
  cp_above       Btu/lb-F  specific heat above freezing
  t_enter_f      F         entering product temperature
  t_storage_f    F         storage (target) temperature
  t_freeze_f     F         product freezing point (optional, for freezers)
  hif_btu_lb     Btu/lb    latent heat of fusion (optional)
  cp_below       Btu/lb-F  specific heat below freezing (optional)
  hours          hr        pull-down time

if t_storage_f >= t_freeze_f (or no freezing):
  q = mass_lb * cp_above * (t_enter_f - t_storage_f)
else:
  q = mass_lb*cp_above*(t_enter_f - t_freeze_f) + mass_lb*hif_btu_lb + mass_lb*cp_below*(t_freeze_f - t_storage_f)
rate_btuh = q / hours
```

**Pinned worked example (2000 lb produce, cp 0.9, 80 -> 35 deg F, 24 hr).** `Q = 2000*0.9*45 = 81,000 Btu`;
`rate = 81,000/24 = 3,375 Btu/hr`. **Cross-check (freezing dominates).** Freezing the same product to `0 deg F`
(`freeze 28`, `hif 120`, `cp_below 0.45`): `Q = 2000*0.9*52 + 2000*120 + 2000*0.45*28 = 358,800 Btu` (`~14,950 Btu/hr`) --
the latent term is the bulk of it. A non-positive mass or pull-down time takes the error path; the non-finite seam is
covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `walk-in-cooler-load`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, ASHRAE product load, `editionNote` naming the sensible/latent/sensible terms and
the pull-down rate); `test/fixtures/worked-examples.json` (the cooling example + the freezing cross-check);
`test/fixtures/compute-map.js` (`product-pull-down-load` -> `computeProductPullDownLoad` in `../../calc-refrigerant.js`);
`scripts/related-tiles.mjs` (-> `walk-in-cooler-load` / `evaporator-td-dtd` / `refrigeration-cop` / `refrigerant-mass-flow`);
`data/search/aliases.json` ("product load", "product pull down", "product cooling load", "freezing load", "pull down time",
"product refrigeration load", "latent heat fusion food", "product heat removal", "cooling load food"); the id appended to
the existing refrigerant renderers block in `app.js`; the `// dims:` annotation (mass mass, specific heats/latent energy per
mass, temps temperature, time time, energy energy, rate power); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the freezing-branch switch, and the non-positive / non-finite error
seams. No new module; re-pin `calc-refrigerant.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the branch switch, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Q / rate output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (2000 lb, 80->35 F, 24 hr -> 81,000 Btu, 3,375 Btu/hr).

## 5. Roadmap position

The middle of the walk-in refrigeration trio: it supplies the product component `walk-in-cooler-load` (v432) needs, and
`evaporator-td-dtd` (v434) selects the coil for the total. An ASHRAE product-property table lookup (cp, freezing point, hif)
is the deliberate next follow-on.
