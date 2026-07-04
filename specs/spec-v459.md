# roughlogic.com Specification v459 -- Gas Appliance Altitude Derate (NFPA 54) (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of an HVAC field-checks trio (v459 gas appliance altitude derate ->
> v460 duct equivalent diameter -> v461 duct leakage CFM25). `gas-meter-clock` measures an appliance's actual firing rate;
> nothing derates its rated input for altitude, the correction every high-elevation install needs.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Thinner air at altitude carries less oxygen, so a gas
> appliance's input must be derated above `2000 ft`: NFPA 54 reduces the rated input about `4%` per `1000 ft` of elevation
> above `2000 ft`, and the burner orifice is changed to match. `gas-meter-clock` reads the actual rate; nothing computes the
> altitude-corrected rated input. This adds the derate tile to the existing **`calc-hvacservice.js`** module (Group C); no
> new group, trade, or dependency. Inherits spec.md through spec-v458.md.
>
> **The gap, and the evidence for it.** A `100,000 Btu/hr` furnace installed at `6000 ft` derates by
> `4% * (6000 - 2000)/1000 = 16%`, to `100,000 * 0.84 = 84,000 Btu/hr` -- and the orifice must be re-drilled or replaced to
> deliver that lower input cleanly. Fail to derate and the appliance over-fires in thin air, sooting and tripping on high
> limit. No tile does this; a tech at elevation had the meter-clock but not the corrected input.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rated input and the
derated input are powers (Btu/hr); the altitude is a length (ft); the derate is dimensionless (percent). The v18/v21
contract: any non-finite input, or a non-positive rated input or altitude, returns `{ error }`; no derate applies below
`2000 ft`, and the tile reports the derate percent and the corrected input. Citation discipline (v19/v22):
`GOVERNANCE.general` over the gas appliance altitude derate by name; `editionNote` names **NFPA 54 (National Fuel Gas Code)
high-altitude derating, about `4%` reduction of rated input per `1000 ft` above `2000 ft` (`derate = 0.04*(altitude - 2000)/
1000`), the orifice change required to match, and the local high-altitude amendments that can differ -- code text quoted per
the CF-01 disclosure**, and states that **this returns the altitude-corrected rated input for a gas appliance, that the
manufacturer's high-altitude conversion kit and orifice sizing govern, and that it is a field aid, not a substitute for the
appliance instructions or the AHJ**.

## 2. The tile

### 2.1 `gas-appliance-altitude-derate` -- Gas Appliance Altitude Derate (NFPA 54)

```
inputs:
  rated_btuh   Btu/hr   sea-level (rated) input
  altitude_ft  ft       installation elevation
  pct_per_1000 %        derate per 1000 ft above 2000 (default 4)

derate = altitude_ft > 2000 ? pct_per_1000/100 * (altitude_ft - 2000)/1000 : 0
derated_btuh = rated_btuh * (1 - derate)
```

**Pinned worked example (100,000 Btu/hr at 6000 ft).** `derate = 0.04 * (6000-2000)/1000 = 16%`;
`derated = 100,000 * 0.84 = 84,000 Btu/hr`. **Cross-check (below the threshold).** At `1500 ft` the derate is zero and the
input stays `100,000 Btu/hr` -- no correction under `2000 ft`. A non-positive rated input or altitude takes the error path;
the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `gas-meter-clock` / `air-density-correction`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, NFPA 54 altitude derating, `editionNote` naming the `4%`/1000
ft relation, the `2000 ft` threshold, and the orifice note -- code text per CF-01); `test/fixtures/worked-examples.json`
(the 6000 ft example + the below-threshold cross-check); `test/fixtures/compute-map.js` (`gas-appliance-altitude-derate` ->
`computeGasApplianceAltitudeDerate` in `../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `gas-meter-clock` /
`air-density-correction` / `gas-appliance-demand` / `combustion-air`); `data/search/aliases.json` ("altitude derate", "gas
appliance altitude", "high altitude derate", "nfpa 54 altitude", "furnace altitude derate", "4 percent per 1000 ft",
"elevation gas input", "orifice altitude", "derate furnace elevation"); the id appended to the existing HVAC-service
renderers block in `app.js`; the `// dims:` annotation (inputs power, altitude length, derate dimensionless); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the 2000 ft threshold, and the non-positive
/ non-finite error seams. No new module; re-pin `calc-hvacservice.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+2 fixtures, the new fuzzer block, the threshold, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the derate / corrected-input output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (100,000 Btu/hr at 6000 ft -> 84,000 Btu/hr).

## 5. Roadmap position

Opens the HVAC field-checks trio: `duct-equivalent-diameter` (v460) and `duct-leakage-cfm25` (v461) continue the field
theme. An orifice-drill-size-from-derated-input lookup is the deliberate next follow-on.
