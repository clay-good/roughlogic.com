# roughlogic.com Specification v234 -- Dual-Fuel Economic Switchover (Heat Pump vs Gas Balance Point) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.88.0; was PROPOSED 2026-06-30). Batch spec-v233..v235 (the heat-pump heating-mode trio -- seasonal energy, dual-fuel
> switchover, and cold-temperature capacity). This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the switchover setpoint is what the HVAC tech
> programs into a dual-fuel thermostat. Adds one tile to **`calc-hvac.js`** (Group C); no new module, group, or
> dependency. Inherits spec.md through spec-v233.md.
>
> **The gap, and the evidence for it.** A dual-fuel (hybrid) system pairs a heat pump with a gas furnace and hands off
> between them, and the setpoint for that handoff is an economic decision, not just a thermal one. As the outdoor
> temperature falls, the heat pump's COP drops, so its cost to deliver a Btu rises, until at some COP the gas furnace
> becomes the cheaper source. That crossover COP is fixed by the electric rate, the gas rate, and the furnace
> efficiency, and the outdoor temperature where the heat pump's COP falls to it is the economic switchover point the
> thermostat should use. Set it too warm and the customer burns gas that the heat pump could have delivered cheaper; set
> it too cold and they run the heat pump into its expensive low-COP range. The catalog has the thermal `balance-point`
> but nothing that finds the dollars-driven switchover, so a tech programming a dual-fuel thermostat is guessing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The delivered-heat cost
figures are a currency per energy (USD per MMBtu); the coefficient of performance is `dimensionless`; the AFUE is a
`dimensionless` fraction; the rates are currency figures (USD). The bridge 1 MMBtu = 293.07 kWh and 10 therms per MMBtu
delivered are carried as named constants. The v18/v21 contract: any non-finite input, a non-positive electric or gas
rate, an AFUE outside 0 (exclusive) to 1, or a heat-pump COP not greater than zero, returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the delivered-cost and switchover relations by name; `editionNote` names
the standard **delivered-Btu fuel-cost comparison** (heat-pump `$/MMBtu = 293.07 / COP * rate_kwh`, gas
`$/MMBtu = 10 / AFUE * rate_therm`, switchover COP where the two are equal), and states that **the switchover COP maps
to an outdoor temperature only through the specific unit's COP-vs-temperature curve (from the AHRI ratings or the
manufacturer's data, entered separately or read from `heat-pump-cold-capacity`), the comparison is on operating cost
only (it ignores equipment wear, defrost, and comfort), the gas side uses the delivered AFUE, and this is an economic
setpoint aid, not a controls-commissioning procedure** -- a thermostat-setpoint number, not a stamped sequence of
operation.

## 2. The tile

### 2.1 `dual-fuel-balance-point` -- Economic Heat-Pump / Gas Switchover

```
inputs:
  rate_kwh    USD/kWh     electric rate, $/kWh
  rate_therm  USD/therm   gas rate, $/therm
  afue        fraction    gas furnace AFUE, 0-1 (default 0.95)
  cop_now     dimensionless  heat-pump COP at the current / evaluated outdoor condition

gas_per_mmbtu = 10 / afue * rate_therm                 # delivered $ per MMBtu from the furnace
hp_per_mmbtu  = 293.07 / cop_now * rate_kwh            # delivered $ per MMBtu from the heat pump at cop_now
cop_switch    = 293.07 * rate_kwh / gas_per_mmbtu      # COP at which heat pump cost = gas cost
verdict       = hp_per_mmbtu <= gas_per_mmbtu
                  ? "Run the heat pump -- it is the cheaper source at this COP"
                  : "Switch to gas -- below the economic switchover COP the furnace is cheaper"
```

**Pinned worked example (COP 2.5, average rates).** Electricity at $0.15/kWh, gas at $1.50/therm through a 95 percent
furnace, with the heat pump running a COP of 2.5 at the current outdoor temperature:
`gas_per_mmbtu = 10 / 0.95 * 1.50 = $15.79/MMBtu`; `hp_per_mmbtu = 293.07 / 2.5 * 0.15 = $17.58/MMBtu`;
`cop_switch = 293.07 * 0.15 / 15.79 = 2.78`. The heat pump at COP 2.5 delivers heat for **$17.58/MMBtu** against the
furnace's **$15.79**, and its COP (2.5) is below the **2.78** switchover, so **switch to gas**. **Cross-check (milder
day, COP 3.2).** The same rates on a milder day where the heat pump holds a COP of 3.2:
`hp_per_mmbtu = 293.07 / 3.2 * 0.15 = $13.74/MMBtu`; the switchover COP is unchanged at 2.78, and the heat pump's 3.2 is
above it, so **run the heat pump** -- it now beats the furnace ($13.74 vs $15.79). The single switchover COP of 2.78 is
the setpoint: program the thermostat to hand off to gas at whatever outdoor temperature drops this unit below it, and
the customer always burns the cheaper fuel.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the delivered-cost and switchover relations, `editionNote` naming the delivered-Btu fuel-cost
comparison with the COP-curve-maps-to-temperature / operating-cost-only / delivered-AFUE / setpoint-aid caveats);
`test/fixtures/worked-examples.json` (the COP-2.5 example + the milder-day cross-check); `test/fixtures/compute-map.js`
(`dual-fuel-balance-point` -> `computeDualFuelBalancePoint` in `../../calc-hvac.js`); `scripts/related-tiles.mjs`
(-> `heat-pump-seasonal-energy` / `balance-point` / `heat-pump-cold-capacity`); `data/search/aliases.json` ("dual fuel",
"hybrid heat", "economic balance point", "heat pump switchover", "gas switchover temperature", "dual fuel setpoint",
"heat pump vs furnace crossover", "hybrid heat balance point"); the id appended to the existing hvac renderers declare
in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples and error seams (non-finite, non-positive rate, AFUE out of 0 to 1, COP <= 0, both verdict paths). Raise the
`calc-hvac.js` size cap or split the module if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, both verdict paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the gas-$/MMBtu / hp-$/MMBtu / switchover-COP / verdict
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value ($0.15 / $1.50 / COP 2.5 -> 2.78 switchover,
switch to gas).

## 5. Roadmap position

The middle of the heat-pump heating-mode batch (v233..v235). Turns the fuel comparison in `heat-pump-seasonal-energy`
(v233) into a thermostat switchover setpoint, and consumes the COP-versus-temperature relationship that
`heat-pump-cold-capacity` (v235) supplies. A COP-curve-to-temperature lookup (mapping the switchover COP straight to an
outdoor temperature) and a carbon-intensity switchover mode are deliberate future follow-ons.
