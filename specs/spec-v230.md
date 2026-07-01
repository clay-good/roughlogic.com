# roughlogic.com Specification v230 -- VFD Energy Savings on a Centrifugal Load (Affinity Cube Law) (calc-service.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v230..v232 (the electrical energy-cost-savings trio -- the retrofit
> business cases an electrician or energy auditor sells: a variable-frequency drive on a pump or fan, an LED lighting
> retrofit, and power-factor correction against a demand bill). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the VFD retrofit is scoped, sold, and installed by
> the electrician. Adds one tile to **`calc-service.js`** (Group A, alongside the existing `pf-correction`); no new
> module, group, or dependency. Inherits spec.md through spec-v229.md.
>
> **The gap, and the evidence for it.** The catalog has the physics of the affinity laws (`affinity-laws`: flow scales
> with speed, power with the cube of speed) and a motor's operating cost at one duty (`motor-operating-cost`), but
> nothing that turns them into the number that sells a variable-frequency drive: the annual kilowatt-hours and dollars
> it saves. A centrifugal pump or fan throttled to part flow with a valve or damper keeps drawing near-full power, but
> the same machine slowed by a VFD draws the cube of the speed ratio, so at 60 percent flow it uses roughly a fifth of
> the power. The savings is that gap, integrated over how many hours the load actually runs at each flow -- and the
> whole case turns on the load profile, which is exactly why a rule-of-thumb "VFDs save energy" is not a number a
> customer will sign. The catalog can state the cube law but cannot cost it against a duty cycle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The full-load power is a
power (kW); the hours per flow bin are a time (h); the annual energy figures are an energy (kWh); the flow fractions are
`dimensionless`; the energy rate and the dollar savings are a currency-per-energy and a currency (USD, carried the way
the existing economic tiles carry dollars). The v18/v21 contract: any non-finite input, a non-positive full-load power,
a negative hours value, or a flow fraction outside 0 to 1, returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the affinity-cube energy relations by name; `editionNote` names the **centrifugal affinity
laws** (`P / P_full = (Q / Q_full)^3` for a fixed system curve) and the **US DOE motor-systems / pump-system energy
method**, and states that **the cube law holds for a centrifugal pump or fan on a friction-dominated system (a large
static-head component flattens the curve and reduces the savings), the baseline here is full-speed operation for the
same hours (a throttled or dampered constant-speed device saves a little on its own, so the VFD delta versus a throttle
is smaller than versus full speed), VFD and motor losses at low speed trim a few points off the ideal, and this is a
screening estimate, not a metered measurement-and-verification** -- a proposal number, not a settled utility rebate.

## 2. The tile

### 2.1 `vfd-energy-savings` -- VFD Retrofit Energy and Cost Savings

```
inputs:
  full_load_kw   kW             motor input power at full speed / full flow, kW
  frac_a         dimensionless  flow fraction of bin A (0-1), default 1.00
  hours_a        h              hours per year at bin A
  frac_b         dimensionless  flow fraction of bin B (0-1), default 0.75
  hours_b        h              hours per year at bin B
  frac_c         dimensionless  flow fraction of bin C (0-1), default 0.50
  hours_c        h              hours per year at bin C
  rate_kwh       USD/kWh        energy rate, $/kWh

vfd_kwh    = full_load_kw * (frac_a^3 * hours_a + frac_b^3 * hours_b + frac_c^3 * hours_c)
full_kwh   = full_load_kw * (hours_a + hours_b + hours_c)
saved_kwh  = full_kwh - vfd_kwh
saved_usd  = saved_kwh * rate_kwh
```

**Pinned worked example (20 kW pump, three-bin duty).** A 20 kW centrifugal pump running 2,000 h at full flow, 3,000 h
at 80 percent, and 2,000 h at 60 percent, at $0.12/kWh:
`vfd_kwh = 20 * (1.0^3 * 2,000 + 0.8^3 * 3,000 + 0.6^3 * 2,000) = 20 * (2,000 + 1,536 + 432) = 20 * 3,968 = 79,360 kWh`;
`full_kwh = 20 * 7,000 = 140,000 kWh`; `saved_kwh = 140,000 - 79,360 = 60,640 kWh`;
`saved_usd = 60,640 * 0.12 = ` **$7,277 per year** (a 43 percent cut). **Cross-check (a pump that mostly runs full).**
The same 20 kW pump but 6,000 h at full flow and only 1,000 h at 80 percent:
`vfd_kwh = 20 * (6,000 + 0.512 * 1,000) = 20 * 6,512 = 130,240 kWh`; `full_kwh = 140,000 kWh`;
`saved_kwh = 9,760 kWh`; `saved_usd = ` **$1,171 per year**. The identical drive on the identical pump saves six times
less -- the load profile, not the horsepower, is the business case, and a machine that runs at full flow is a poor VFD
candidate no matter how big it is.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the affinity-cube energy relations, `editionNote` naming the affinity laws and the DOE
motor/pump-system method with the friction-dominated / full-speed-baseline / drive-losses / screening-only caveats);
`test/fixtures/worked-examples.json` (the three-bin example + the runs-full cross-check); `test/fixtures/compute-map.js`
(`vfd-energy-savings` -> `computeVfdEnergySavings` in `../../calc-service.js`); `scripts/related-tiles.mjs`
(-> `affinity-laws` / `motor-operating-cost` / `fan-motor-bhp`); `data/search/aliases.json` ("vfd savings", "variable
frequency drive", "variable speed drive", "affinity law energy", "pump energy savings", "fan energy savings", "cube
law savings", "vfd payback"); the id appended to the existing service renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams
(non-finite, full-load power <= 0, negative hours, flow fraction out of 0 to 1). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the single-bin path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the VFD-kWh / full-kWh / saved-kWh / saved-$ stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (20 kW / 2000-3000-2000 h -> 60,640 kWh, $7,277).

## 5. Roadmap position

Opens the electrical energy-cost-savings batch (v230..v232). Turns the `affinity-laws` physics and the
`motor-operating-cost` duty into a retrofit business case, and sits beside `lighting-retrofit-savings` (v231) and
`power-factor-billing-savings` (v232). A static-head system-curve correction (which reduces the cube-law savings on a
high-static system) and an eight-bin flow-duration profile are deliberate future follow-ons.
