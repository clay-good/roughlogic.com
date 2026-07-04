# roughlogic.com Specification v437 -- PV Interconnection 120% Busbar Rule (NEC 705.12) (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the NEC 690/705 PV-electrical trio (v435 max system voltage ->
> v436 PV conductor sizing -> v437 interconnection 120% rule). Connecting solar to an existing panel is where most
> residential installs get stuck, and the governing check -- the 120% busbar rule -- has no tile.**
> In-scope catalog expansion under the spec-v106 trades-only charter. When a PV backfeed breaker is added to an existing
> load center, NEC 705.12(B)(3)(2) allows the sum of the main overcurrent device and the PV breaker to reach `120%` of the
> busbar rating: `main_OCPD + PV_OCPD <= 1.2 * busbar_rating`. So the largest PV breaker that fits is
> `1.2 * busbar - main_OCPD`, and if that is negative the panel needs a supply-side connection or a main-breaker derate. No
> tile does this. This adds the interconnection tile to the existing **`calc-solar.js`** module (Group A); no new group,
> trade, or dependency. Inherits spec.md through spec-v436.md.
>
> **The gap, and the evidence for it.** A `200 A` busbar with a `200 A` main breaker allows a PV backfeed breaker of at most
> `1.2 * 200 - 200 = 40 A`, which at `240 V` supports roughly `7.6 kW` of inverter output on the load-side tap. Downsize the
> main to `175 A` and the allowable PV breaker grows to `1.2*200 - 175 = 65 A`, the classic main-breaker-derate trick to fit
> a bigger array. No tile does this; an installer sizing a load-side interconnection had to work the `120%` rule by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The busbar rating, the main
overcurrent device, and the PV breaker are currents (A, dim I). The v18/v21 contract: any non-finite input, or a
non-positive busbar or main rating, returns `{ error }`; the tile computes the allowable PV breaker under the `120%` rule,
flags when it is zero or negative (a supply-side connection or main derate is required), and reports the resulting spare
capacity. Citation discipline (v19/v22): `GOVERNANCE.general` over the NEC 705.12 interconnection rule by name;
`editionNote` names **NEC 705.12(B)(3)(2), the load-side `120%` allowance `main_OCPD + PV_OCPD <= 1.2 * busbar_rating`, the
allowable PV breaker `= 1.2 * busbar - main`, and the alternatives (`705.12(B)(3)(1)` sum rule, `(3)(3)` center-fed/
end-of-busbar, and supply-side `705.11`) -- NEC text quoted per the CF-01 disclosure**, and states that **this returns the
allowable PV backfeed breaker under the 120% rule, that busbar position and label requirements also apply, and that it is a
design aid, not a substitute for the AHJ**.

## 2. The tile

### 2.1 `pv-interconnection-120-rule` -- PV Interconnection 120% Busbar Rule (NEC 705.12)

```
inputs:
  busbar_a   A   panel busbar rating
  main_a     A   main breaker (utility OCPD) rating

allowable_pv = 1.2 * busbar_a - main_a
ok           = allowable_pv > 0
```

**Pinned worked example (200 A busbar, 200 A main).** `allowable PV = 1.2*200 - 200 = 40 A` -> a `40 A` backfeed breaker
fits (about `7.6 kW` at 240 V). **Cross-check (derate the main to fit more).** With a `175 A` main,
`allowable PV = 1.2*200 - 175 = 65 A` -- more room for a bigger array. A `200 A` main on a `150 A` busbar gives
`1.2*150 - 200 = -20 A`, so the `120%` rule fails and a supply-side connection is required. A non-positive busbar or main
takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `pv-string-fusing` / `pv-conductor-sizing`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, NEC 705.12, `editionNote` naming the `120%`
allowance, the allowable-PV-breaker relation, and the alternative connection methods -- NEC text per CF-01);
`test/fixtures/worked-examples.json` (the 200/200 example + the derated-main and failing cross-checks);
`test/fixtures/compute-map.js` (`pv-interconnection-120-rule` -> `computePvInterconnection120Rule` in `../../calc-solar.js`);
`scripts/related-tiles.mjs` (-> `pv-conductor-sizing` / `pv-max-system-voltage` / `service-load-optional` /
`ev-charging-load`); `data/search/aliases.json` ("120 percent rule", "705.12", "pv interconnection", "busbar 120", "solar
backfeed breaker", "load side interconnection", "pv breaker size", "busbar rule solar", "main breaker derate solar"); the id
appended to the existing solar renderers block in `app.js`; the `// dims:` annotation (all currents I); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the three cases, the negative-allowance flag, and the
non-positive / non-finite error seams. No new module; re-pin `calc-solar.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+3 fixtures, the new fuzzer block, the negative-allowance flag, the error paths); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the allowable-PV output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (200 A busbar, 200 A main -> 40 A).

## 5. Roadmap position

Closes the NEC 690/705 PV-electrical trio: v435 the voltage, v436 the conductor, and v437 the point of interconnection. A
center-fed-busbar (705.12(B)(3)(3)) mode and an inverter-output-to-breaker sizing tie-in are the deliberate next follow-ons.
