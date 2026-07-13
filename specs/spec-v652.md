# roughlogic.com Specification v652 -- Gas-Meter Clock Target Time (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacservice.js`**
> (Group C, hvac), no new module, group, or dependency. Inherits spec.md through spec-v651.md.
>
> **The gap, and the evidence for it.** The `gas-meter-clock` tile (spec-v110) works forward: you time a meter
> revolution and it returns the actual firing rate. The setup question is the reverse -- before clocking, "what
> stopwatch reading means the appliance is on rate?" Inverting the sibling's `cfh = (3600/sec) x dial` and
> `rate = cfh x HV` gives the on-rate time `sec = 3600 x dial x HV / target rate`. First-principles, no table. The
> pinned example: a 100,000 BTU/hr furnace on a 1 cf dial at 1030 BTU/cf should clock **37.1 s** -- and the tile
> reports the +/-5% on-rate window (35.3 to 39.0 s) so a faster revolution reads as overfired, a slower one as
> underfired.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target rate is
`M L^2 T^-3` (BTU/hr), the dial size is `L^3` (cf), the heating value is `M L^-1 T^-2` (BTU/cf), the seconds per
revolution are `T`, and the target flow is `L^3 T^-1` (cfh). The `3600 s/hr` (`_SEC_PER_HR`) constant and the
default `1030 BTU/cf` heating value are the same ones `gas-meter-clock` already uses. The v18/v21 contract: any
non-finite input, or a non-positive target rate, dial size, or heating value, returns `{ error }`. Citation
discipline (v19/v22): the meter-clocking arithmetic solved for the on-rate time, the inverse of the meter-clock
tile, by name; the note states that **sec = 3600 x dial x HV / target rate, a faster revolution is overfired and a
slower one underfired, the reported window is the +/-5% band, and clocking is done with every other gas appliance
off** -- the equipment rating plate and the licensed tech govern.

## 2. The tile

### 2.1 `gas-meter-clock-target` -- The Stopwatch Reading a Meter Should Show on Rate

```
inputs:
  target_input_btuh      BTU/hr   target / nameplate firing rate (> 0)
  dial_size_cf           cf/rev   test-dial size (> 0)
  heating_value_btu_cf   BTU/cf   fuel heating value (> 0; 1030 nat gas, ~2500 LP)

cfh_target        = target_input_btuh / heating_value_btu_cf
sec_per_rev       = 3600 x dial_size_cf / cfh_target   (= 3600 x dial x HV / target)
on-rate window    = sec_per_rev / 1.05 (fast, +5%) to sec_per_rev / 0.95 (slow, -5%)
```

**Pinned worked example.** `target = 100,000 BTU/hr`, `dial = 1 cf`, `HV = 1030 BTU/cf`:
`cfh = 100,000/1030 = 97.1 cfh`, `sec = 3600 x 1 / 97.1 = ` **37.1 s**; the on-rate window is **35.3 to 39.0 s**.
**Cross-check (dial scales the time).** A 2 cf dial doubles the time to **74.2 s** for the same rate.
**Cross-check (exact inverse of the meter clock).** The fuzzer feeds the 37.1 s back through `gas-meter-clock` at
the same dial and heating value and recovers the 100,000 BTU/hr target.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `gas-meter-clock`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (meter-clock arithmetic inverted, the note per §1); `test/fixtures/worked-examples.json` (the
pinned example plus the dial cross-check); `test/fixtures/compute-map.js` (`gas-meter-clock-target` ->
`computeGasMeterClockTarget`); `scripts/related-tiles.mjs` (<-> `gas-meter-clock`, `furnace-temp-rise`,
`combustion-air`, `gas-appliance-demand`); `data/search/aliases.json` ("gas meter clock target", "on rate meter
time", "what should the meter clock", plus question rows, all collision-checked);
`HVACSERVICE_RENDERERS["gas-meter-clock-target"]` via the `_simpleRenderer` factory (field DOM ids = the input
keys) and the id added to the calc-hvacservice declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact
inverse round-trip through `computeGasMeterClock`, the dial and rate scaling, and the error seams. The two
`index.html` home-count spots go 1,100 -> 1,101 (check-readme-counts gates them). The calc-hvacservice.js gzip cap
is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 37.1 s, window 35.3-39.0 s).

## 5. Roadmap position

Completes the meter-clocking pair: `gas-meter-clock` (clocked time -> actual rate) and now `gas-meter-clock-target`
(target rate -> the on-rate time), exact inverses through the same clocking arithmetic. Further Group C growth stays
evidence-driven.
