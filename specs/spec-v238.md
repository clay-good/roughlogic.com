# roughlogic.com Specification v238 -- Battery C-Rate: Deliverable Power and Discharge Duration (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.88.0; was PROPOSED 2026-06-30). Batch spec-v236..v238 (the grid-tied battery-economics trio -- TOU arbitrage, peak
> shaving, and the C-rate power limit). This closes the v236..v238 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: matching the battery's power to the inverter and
> the load is the sizing check the solar and electrical trade makes on every storage job. Adds one tile to
> **`calc-solar.js`** (Group A); no new module, group, or dependency. Inherits spec.md through spec-v237.md.
>
> **The gap, and the evidence for it.** The two value tiles in this batch both assume a battery can deliver the power
> they ask of it, but a battery's power is not its energy: the C-rate caps how fast the pack can discharge, and the
> inverter caps how much of that reaches the panel. A 40 kilowatt-hour pack rated at half-C can only push 20 kilowatts
> no matter how large the load, and if it sits behind a 15 kilowatt inverter, 15 kilowatts is all that comes out. That
> deliverable power, and the hours the usable energy lasts at it, are what decide whether a battery can actually carry a
> peak-shave target or a backup load. The catalog has the battery's energy (`battery-runtime`, `off-grid-battery`) but
> never its power limit, so a designer can specify a shave or a backup the pack physically cannot deliver.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The nameplate and usable
capacities are an energy (kWh); the C-rate power, the inverter rating, and the deliverable power are a power (kW); the
discharge time is a time (h); the C-rate is a per-hour rate (1/h, so 0.5C is half the nameplate energy per hour); the
depth of discharge is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive nameplate capacity or
C-rate, a depth of discharge outside 0 (exclusive) to 1, or a negative inverter rating, returns `{ error }` (an inverter
rating of zero means "no inverter limit" and the C-rate power governs). Citation discipline (v19/v22):
`GOVERNANCE.general` over the C-rate relations by name; `editionNote` names the standard **battery C-rate definition**
(power `= nameplate * C`, full discharge time `= 1 / C`, and the deliverable power is the lesser of the C-rate power and
the inverter rating), and states that **the continuous C-rate is the sustained rating not the brief surge rating (a pack
delivers more for seconds than for an hour), the usable energy uses the depth of discharge, high discharge rates lose a
few points of capacity and add heat, and this is a nameplate power check, not a cell-level thermal model** -- a
power-and-duration aid, not the manufacturer's discharge curve.

## 2. The tile

### 2.1 `battery-c-rate` -- Deliverable Power and Discharge Duration

```
inputs:
  nameplate_kwh   kWh            battery nameplate energy, kWh
  c_rate          1/h            continuous discharge C-rate (0.5 = 0.5C), default 0.5
  dod             dimensionless  usable depth of discharge, 0-1 (default 0.90)
  inverter_kw     kW             inverter/PCS continuous rating, kW (default 0 = no inverter limit)

c_rate_power_kw   = nameplate_kwh * c_rate
deliverable_kw    = inverter_kw > 0 ? min(c_rate_power_kw, inverter_kw) : c_rate_power_kw
usable_kwh        = nameplate_kwh * dod
discharge_time_h  = usable_kwh / deliverable_kw
inverter_limited  = inverter_kw > 0 && inverter_kw < c_rate_power_kw
```

**Pinned worked example (40 kWh pack, 0.5C, 15 kW inverter).** A 40 kWh pack rated at 0.5C behind a 15 kW inverter,
90 percent usable: `c_rate_power = 40 * 0.5 = 20 kW` (the cells can deliver 20 kW);
`deliverable = min(20, 15) = 15 kW` (the inverter is the bottleneck); `usable = 40 * 0.90 = 36 kWh`;
`discharge_time = 36 / 15 = ` **2.4 hours** at the 15 kW limit. The pack could push 20 kW but the 15 kW inverter caps
it, so it runs longer at lower power. **Cross-check (1C, no inverter limit).** The same 40 kWh pack rated at 1C with the
inverter limit removed: `c_rate_power = 40 * 1.0 = 40 kW`; `deliverable = 40 kW`; `usable = 36 kWh`;
`discharge_time = 36 / 40 = ` **0.9 hours**. Doubling the C-rate and removing the inverter cap doubles the deliverable
power and empties the same usable energy in a third of the time -- which is exactly the trade a designer must make: a
high-C pack and a big inverter carry a large peak-shave or backup load, but only briefly, while a low-C pack behind a
small inverter delivers less power for longer. The energy is the same 36 kWh either way; the C-rate and the inverter set
how fast it comes out.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical","solar"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the C-rate relations, `editionNote` naming the C-rate definition with the
continuous-not-surge / usable-DoD / high-rate-derate / nameplate-check caveats); `test/fixtures/worked-examples.json`
(the inverter-limited example + the 1C cross-check); `test/fixtures/compute-map.js` (`battery-c-rate` ->
`computeBatteryCRate` in `../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `battery-peak-shaving` /
`battery-runtime` / `battery-tou-arbitrage`); `data/search/aliases.json` ("c-rate", "c rate", "battery power", "battery
discharge rate", "inverter limit battery", "deliverable power", "discharge duration", "battery kw"); the id appended to
the existing solar renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, nameplate / C-rate <= 0, DoD out of 0
to 1, negative inverter rating, the no-inverter-limit and inverter-limited paths). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the inverter-limited and no-limit paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the C-rate-power / deliverable /
usable / discharge-time stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (40 kWh / 0.5C /
15 kW -> 15 kW deliverable, 2.4 h).

## 5. Roadmap position

Closes the grid-tied battery-economics batch (v236..v238). Supplies the deliverable-power ceiling that bounds how much
of the `battery-tou-arbitrage` (v236) discharge and the `battery-peak-shaving` (v237) target a pack can actually deliver,
and complements `battery-runtime` (the energy-side duration) with the power-side limit. A surge (short-duration) C-rate
mode and a high-rate capacity derate are deliberate future follow-ons.
