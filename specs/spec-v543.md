# roughlogic.com Specification v543 -- LED Tape PSU and Voltage-Drop Run (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production); no new module, group, or dependency. Inherits spec.md through spec-v542.md.
>
> **The gap, and the evidence for it.** `voltage-drop` sizes building branch conductors and `power-distro` handles show
> power, but neither answers the constant-voltage LED-strip question every AV and scenic tech hits: how long a run can
> one feed drive before the far end dims and color-shifts, and how big a power supply does it need? A single long strip
> fed from one end drops voltage along its own copper trace, so 12 V strips typically wall out around 16 to 20 feet and
> 24 V strips roughly double that. The catch is that oversizing the power supply does **not** fix the dimming -- the
> voltage drop is in the strip's copper, so the cure is to power-inject or feed both ends. The power supply still wants
> about 20% headroom for inrush and lifespan. The tile takes the strip power per foot, the run length, the supply
> voltage, the strip resistance, and the acceptable end-drop, and returns the total load, the recommended PSU size, the
> end-of-run voltage, and a flag when the run is too long -- so a designer picks a supply and a feed scheme that keep the
> far end bright.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The power per foot is
`M L T^-3` (W/ft); the run length is a length (`L`, in feet); the total load and PSU size are powers (`M L^2 T^-3`, in
watts); the supply and end voltages and the drop are `M L^2 T^-3 I^-1` (volts); the current is `I`; the resistance per
foot is `M L^3 T^-3 I^-2` per foot; the headroom and drop percents are `dimensionless`. The v18/v21 contract: any non-
finite input, a non-positive power per foot, run length, or supply voltage, a negative resistance, or a headroom or
drop tolerance outside `[0, 100)` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the LED-
strip loading relations by name (constant-voltage LED strip loading and voltage drop); `editionNote` names the **LED
tape PSU and voltage-drop run model**, prints `load = power_per_ft x length`, `psu = load / (1 - headroom)`,
`current = load / supply_voltage`, `end_drop = current x (resistance_per_ft x length) / 2`, and
`end_voltage = supply_voltage - end_drop`, and states that **a single end-fed run dims and color-shifts at the far end
because the copper trace drops voltage (12 V strips typically wall out around 16 to 20 ft, 24 V roughly double),
oversizing the PSU does not fix the drop (power-inject or feed both ends instead), the drop uses the uniform-load
approximation (half the full-current drop), the PSU wants about 20% headroom for inrush and lifespan, and the strip
datasheet governs** -- a planning aid, not the manufacturer's spec.

## 2. The tile

### 2.1 `led-tape-run` -- Why a Long LED Strip Dims at the Far End (and a Bigger PSU Does Not Help)

```
inputs:
  power_per_ft_w    W/ft   strip power draw per foot
  run_length_ft     ft     length of the single-fed run
  supply_voltage_v  V      strip supply voltage (12 / 24)
  resistance_per_ft ohm/ft round-trip copper resistance per foot of strip
  headroom_pct      %      PSU headroom (default 20)
  drop_tolerance_pct %     acceptable end-of-run voltage drop (default 10)

load_w      = power_per_ft_w x run_length_ft                                [W]
psu_w       = load_w / (1 - headroom_pct / 100)                             [W]
current_a   = load_w / supply_voltage_v                                     [A]
end_drop_v  = current_a x (resistance_per_ft x run_length_ft) / 2           [V]
end_voltage = supply_voltage_v - end_drop_v                                 [V]
too_long    = (end_drop_v / supply_voltage_v x 100) > drop_tolerance_pct
```

**Pinned worked example (a 4.4 W/ft strip, 16 ft, 12 V, 0.05 ohm/ft, 20% headroom, 10% tolerance).** The load is
`4.4 x 16 = 70.4 W`, so the PSU should be at least `70.4 / 0.8 = ` **88 W**. The current is `70.4 / 12 = 5.87 A`, and
across `0.05 x 16 = 0.8 ohm` of round-trip copper the end-fed uniform-load drop is `5.87 x 0.8 / 2 = ` **2.35 V**,
leaving the far end at `12 - 2.35 = ` **9.65 V** -- a `2.35/12 = 19.6%` drop, well over the 10% tolerance, so the
`too_long` flag fires: this run dims visibly and must be fed from both ends or power-injected. **Cross-check (24 V runs
twice as far).** The same strip on 24 V draws half the current (`2.93 A`) for the same power, so the end drop halves to
`1.17 V` -- a `4.9%` drop, within tolerance, the reason higher-voltage tape reaches roughly double the length. The tile
returns the load, the PSU size, the end voltage, and the too-long flag.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["live-production", "av", "electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 12 V
too-long example + the 24 V cross-check); `test/fixtures/compute-map.js` (`led-tape-run` -> `computeLedTapeRun` in
`../../calc-stage.js`); `scripts/related-tiles.mjs` (-> `voltage-drop` / `power-distro` / `led-video-wall`);
`data/search/aliases.json` ("led tape", "led strip voltage drop", "led strip max run", "constant voltage led", "psu
sizing led", "power injection led", "led tape length", "12v 24v led strip"); the id appended to the stage renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the PSU headroom, the uniform-load end drop, the 24 V halving, the too-long flag, and the error
seams (non-finite, non-positive power / length / voltage, negative resistance, headroom / tolerance out of range). Hand-
writes its renderer (mirroring the calc-stage.js `power-distro` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the load / PSU / end-voltage stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 12 V example -> 88 W PSU, 9.65 V end, too-long).

## 5. Roadmap position

Adds constant-voltage LED-strip planning beside `power-distro` and `led-video-wall`. A power-injection-spacing helper
(how often to re-feed a long run to stay in tolerance) and an addressable-strip data-and-power budget are deliberate
future follow-ons. Further Group N growth stays evidence-driven.
