# roughlogic.com Specification v240 -- Compressed-Air Compression Power (Isentropic) and Energy Cost (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.88.0; was PROPOSED 2026-06-30). Batch spec-v239..v241 (the compressed-air energy trio -- leak cost, compression
> power, and setpoint savings). This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: knowing the horsepower and the running cost to
> make a given airflow is what sizes the compressor and prices the plant air. Adds one tile to **`calc-hvac.js`**
> (Group C); no new module, group, or dependency. Inherits spec.md through spec-v239.md.
>
> **The gap, and the evidence for it.** Every compressed-air number in the plant traces back to one physical quantity:
> the power it takes to compress the air. The leak tile assumes a specific power; the setpoint tile trims a running
> power; but the catalog never computes the compression power itself. The isentropic (adiabatic) work to compress a
> free-air flow from intake to discharge pressure is a closed-form thermodynamic result -- and it is what tells a tech
> whether a 100 cfm demand needs a 20 or a 25 horsepower compressor, what the air actually costs to make per year, and
> how much more a higher discharge pressure draws. The catalog can size the receiver and price the leaks but cannot tell
> anyone the horsepower to compress the air in the first place.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The free-air flow is a
volumetric flow (cfm at intake); the inlet and discharge pressures are a pressure (psia / psig); the theoretical
horsepower is a power (hp); the input power is a power (kW); the run hours are a time (h); the annual energy is an energy
(kWh); the rate and annual cost are currency figures (USD, as the existing economic tiles carry them); the overall
efficiency is `dimensionless`. The specific-heat ratio k = 1.4 for air, the 144/33,000 = 0.004364 unit constant (in.^2
per ft^2 over ft-lb per minute per hp), and 0.746 kW/hp are carried as named constants. The v18/v21 contract: any
non-finite input, a non-positive free-air flow / inlet pressure / run hours, a discharge pressure not above the inlet,
or an overall efficiency outside 0 (exclusive) to 1, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the isentropic-compression relations by name; `editionNote` names the standard **single-stage
adiabatic (isentropic) compression power** (`hp = 0.004364 * P1 * Q * (k/(k-1)) * [(P2/P1)^((k-1)/k) - 1]`, P in psia,
Q in cfm free air, k = 1.4), and states that **this is the ideal single-stage isentropic work (a real compressor needs
more -- the overall efficiency divides the ideal down to the wire, and multi-staging with intercooling beats single
stage above roughly 100 psig), the free-air flow is referenced to the intake conditions, the discharge is the absolute
pressure at the compressor, and this is a sizing and cost estimate, not a compressor selection** -- a first-principles
number, not the manufacturer's rated bhp.

## 2. The tile

### 2.1 `compressed-air-power` -- Isentropic Compression Power and Annual Cost

```
inputs:
  free_air_cfm   cfm            free-air flow at intake, cfm
  inlet_psia     psia           inlet absolute pressure, psia (default 14.7)
  discharge_psig psig           gauge discharge pressure, psig
  overall_eff    dimensionless  overall wire-to-air efficiency (isentropic x mechanical x motor), 0-1 (default 0.75)
  run_hours      h              hours per year (default 4000)
  rate_kwh       USD/kWh        energy rate, $/kWh

k          = 1.4
p2_abs     = discharge_psig + 14.7
theo_hp    = 0.004364 * inlet_psia * free_air_cfm * (k/(k-1)) * ((p2_abs/inlet_psia)^((k-1)/k) - 1)
input_kw   = theo_hp * 0.746 / overall_eff
annual_kwh = input_kw * run_hours
annual_cost= annual_kwh * rate_kwh
```

**Pinned worked example (100 cfm at 100 psig).** Compressing 100 cfm of free air from 14.7 psia intake to 100 psig, at a
0.75 overall efficiency, 4,000 h/yr, $0.10/kWh: `p2_abs = 100 + 14.7 = 114.7 psia`;
`theo_hp = 0.004364 * 14.7 * 100 * 3.5 * ((114.7/14.7)^0.2857 - 1) = 0.004364 * 14.7 * 100 * 3.5 * 0.798 = 17.9 hp`;
`input_kw = 17.9 * 0.746 / 0.75 = 17.8 kW`; `annual_kwh = 17.8 * 4,000 = 71,338 kWh`;
`annual_cost = ` **$7,134 per year** to make that air. The 17.9 theoretical horsepower matches the rule that 100 cfm at
100 psig needs roughly 18 to 22 shaft horsepower. **Cross-check (same flow, 125 psig).** The same 100 cfm compressed to
125 psig instead: `p2_abs = 139.7`; `theo_hp = 0.004364 * 14.7 * 100 * 3.5 * ((139.7/14.7)^0.2857 - 1) = 20.3 hp`;
`input_kw = 20.2 kW`; `annual_cost = ` **$8,065 per year**. Carrying the same airflow 25 psi higher costs 13 percent more
energy for the identical work at the tool -- the compression power climbs with the pressure ratio, which is precisely the
waste that `air-pressure-setpoint-savings` (v241) recovers.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the isentropic-compression relations, `editionNote` naming the single-stage adiabatic compression
power with the ideal-work / overall-efficiency / free-air-intake / multi-stage caveats);
`test/fixtures/worked-examples.json` (the 100-psig example + the 125-psig cross-check); `test/fixtures/compute-map.js`
(`compressed-air-power` -> `computeCompressedAirPower` in `../../calc-hvac.js`); `scripts/related-tiles.mjs`
(-> `air-leak-cost` / `air-pressure-setpoint-savings` / `air-receiver`); `data/search/aliases.json` ("compressed air
power", "compressor horsepower", "air compressor kw", "isentropic compression", "cfm to hp", "compression power",
"air compressor energy", "compressor sizing hp"); the id appended to the existing hvac renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and
error seams (non-finite, flow / inlet / run hours <= 0, discharge not above inlet, overall efficiency out of 0 to 1).
Raise the `calc-hvac.js` size cap or split the module if needed (dated comment). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the discharge-not-above-inlet error path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the theoretical-hp / input-kW /
annual-kWh / annual-$ stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (100 cfm / 100 psig
-> 17.9 hp, $7,134).

## 5. Roadmap position

The middle of the compressed-air energy batch (v239..v241). Supplies the compression power that the `air-leak-cost`
(v239) specific-power figure approximates and that `air-pressure-setpoint-savings` (v241) differentiates across two
discharge pressures, and complements `air-receiver` (the storage side). A two-stage-with-intercooling mode and a
part-load specific-power curve are deliberate future follow-ons.
