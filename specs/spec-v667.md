# roughlogic.com Specification v667 -- LED Tape Max Run Before the Far End Dims (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N,
> live-production / AV), no new module, group, or dependency. Inherits spec.md through spec-v666.md.
>
> **The gap, and the evidence for it.** Spec-v543 (`led-tape-run`) runs the constant-voltage LED-strip drop forward:
> given a run length, it returns the load, PSU size, end-of-run voltage, and a too-long flag. The design question a
> lighting tech actually asks is the inverse -- **how far can I run this tape before the far end dims past what I will
> accept**. The forward tile makes you guess a length and re-check the flag; the inverse solves it directly. From the
> tile's own uniform-load model `drop_pct = power_per_ft x resistance_per_ft x length^2 / (2 x voltage^2) x 100`,
> setting `drop_pct = tolerance` gives `len_max = voltage x sqrt(2 x (tolerance/100) / (power_per_ft x
> resistance_per_ft))`. The number this settles: a **4.4 W/ft**, **12 V** strip at **0.05 ohm/ft** walls out at about
> **11.4 ft** for a 10% drop, and a **24 V** strip reaches about **22.9 ft** -- the "12 V walls out ~16-20 ft, 24 V
> roughly double" rule the forward tile states, now returned as a number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`led-tape-run` sibling: the power per foot is `M L T^-3` (W/ft), the supply voltage is `M L^2 T^-3 I^-1` (V), the
round-trip resistance and the drop tolerance are `dimensionless`, and the returned run length is `L` (ft). The v18/v21
contract: any non-finite input, or a non-positive power / voltage / resistance (a zero-resistance strip has no far-end
drop to bound the run), or a tolerance outside (0, 100), returns `{ error }`. Citation discipline (v19/v22):
constant-voltage LED-strip voltage drop solved for the run length, by name; the note states that **the run scales with
the voltage (12 V walls out ~16-20 ft, 24 V roughly double), oversizing the PSU does not extend it -- power-inject or
feed both ends -- the drop uses the uniform-load approximation (half the full-current drop), and the strip datasheet
governs**.

## 2. The tile

### 2.1 `led-tape-max-run` -- LED Tape Max Run Before the Far End Dims

```
inputs:
  power_per_ft_w      W/ft   strip power (> 0)
  supply_voltage_v    V      12 or 24 (> 0)
  resistance_per_ft   ohm/ft round-trip trace resistance (> 0)
  drop_tolerance_pct  %      acceptable end drop, 0 < tol < 100 (default 10)

len_max = supply_voltage_v x sqrt(2 x (drop_tolerance_pct/100) / (power_per_ft_w x resistance_per_ft))   [ft]
```

**Pinned worked example (a 4.4 W/ft 12 V strip).** ppf = 4.4, V = 12, R = 0.05, tol = 10%:
`len_max = 12 x sqrt(2 x 0.10 / (4.4 x 0.05)) = 12 x sqrt(0.9091) = ` **11.44 ft**; feeding 11.44 ft back through
`led-tape-run` gives a `drop_pct` of **10.0%** exactly, the tolerance. **Cross-check (24 V doubles the reach).** Same
strip on 24 V: `len_max = 24 x sqrt(0.9091) = ` **22.88 ft** -- exactly double, since the run scales linearly with the
voltage while the drop scales with the square of the length.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["live-production", "av", "electrical"]`, beside `led-tape-run`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (constant-voltage LED drop solved for length, `GOVERNANCE.general`,
the note per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`led-tape-max-run` -> `computeLedTapeMaxRun` in `../../calc-stage.js`); `scripts/related-tiles.mjs` (-> `led-tape-run`
/ `voltage-drop` / `power-distro` / `led-video-wall`, and the forward tile links back); `data/search/aliases.json`
("how far can i run led tape", "max led tape run length", "led strip run limit", plus adjacent rows, all distinct from
the forward tile's aliases); `STAGE_RENDERERS["led-tape-max-run"]` via the module's `_r` renderer factory (mirroring
`led-tape-run`) and the id added to the calc-stage declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both
examples, the 24 V doubling, the round-trip through `computeLedTapeRun` (asserting the drop value, not the too-long flag,
which sits on the float boundary at the max run), and the error seams. Group N has no exact audit-count assertion
covering this section, so no count bump. The calc-stage.js gzip cap is expected to hold (verify at build). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 11.4 ft max run at 12 V, 10% drop).

## 5. Roadmap position

Pairs the forward LED-tape tile (`led-tape-run`, drop from length) with its inverse (length from the tolerance), the two
halves of the strip-run question. Further Group N growth stays evidence-driven.
