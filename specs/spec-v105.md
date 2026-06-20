# roughlogic.com Specification v105 -- HVAC Evacuation and Leak-Check Diagnostics: Vacuum Decay Test and Temperature-Corrected Nitrogen Pressure Test (calc-hvacservice.js, Group C, 2 New Tiles)

> **Implementation status: LANDED 2026-06-20 (catalog 667 -> 669; 25 groups; package
> 0.68.0, a minor stamp).** v105 inherits everything from spec.md through spec-v104.md and
> changes none of it. It adds two tiles to the existing **`calc-hvacservice.js`** bench
> (opened by v102) and changes no existing tile's output. **No new module, no new group, no
> new dependencies, no telemetry, no AI, US standards only.** Both tiles keep `group: "C"`
> (a tile's group letter is independent of the module that holds it -- the v28/v70..v104
> split precedent).
>
> **The gap, and the evidence for it.** v102 gave the bench the refrigerant/drain side of a
> service call and v104 the electrical side. The two numbers a tech reads off the gauges
> *before charging a system* -- the evacuation go/no-go and the leak-check go/no-go -- were
> still missing, and both are named in the spec-v104 §5 roadmap. A concept-check of the
> post-v104 live ids found no micron standing-decay (blank-off) test (the everyday "did the
> vacuum hold?") and no temperature-corrected standing pressure test (the everyday "is that
> gauge drop a leak or just the weather?"). The catalog covers the refrigerant circuit deeply
> (`superheat-subcool`, `refrigerant-charge`, `recovery-cylinder`) but not the two
> commissioning verdicts that gate whether the system is ready to charge.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `vacuum-decay-test` is rise/time arithmetic over a vacuum level in
  microns of mercury (a pressure, annotated `M L^-1 T^-2`) and a hold time (`T`), with the
  rise rate annotated `M L^-1 T^-3`. `nitrogen-pressure-test` carries Gay-Lussac's law over
  pressures in psi (`M L^-1 T^-2`) and temperatures (`T`). Every bundled constant -- the
  500-micron default pass ceiling, the 14.7 psi default atmospheric pressure, the 459.67
  Fahrenheit-to-Rankine offset, and the 1 psi default leak tolerance -- is bundled and
  annotated, and each is an editable field.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. For
  `vacuum-decay-test`: a non-positive start level, end level, hold time, or pass ceiling
  returns `{ error }`. For `nitrogen-pressure-test`: a non-positive start pressure or
  atmospheric pressure, a negative end pressure, a negative tolerance, or a temperature at or
  below absolute zero (`F + 459.67 <= 0`) returns `{ error }`. Neither tile can leak a
  `NaN`/`Infinity` numeric field: the only division in either is by a guarded-positive hold
  time or absolute temperature.
- The v19/v22 citation discipline applies. Both tiles use **`GOVERNANCE.general`** over public
  first-principles physics (the rise/time arithmetic; the ideal-gas law). `vacuum-decay-test`
  names the **ACCA Standard 4 / AHRI** 500-micron evacuation field convention by name without
  reproduction; `nitrogen-pressure-test` names **Gay-Lussac's law** (constant-volume ideal
  gas). Neither reproduces a licensed table; the equipment manufacturer and the licensed tech
  govern.

## 2. The tiles

### 2.1 `vacuum-decay-test` -- Vacuum Decay (Blank-Off) Test (Group C, calc-hvacservice.js)

The evacuation commissioning verdict. After the pump pulls the system to a target vacuum, the
tech valves off the pump and watches an electronic micron gauge over a timed window. A vacuum
that holds at or below the pass ceiling means the system is dry and tight; one that climbs is
either residual moisture/outgassing (the rise plateaus) or a leak (it keeps climbing).

```
inputs:
  start_micron         M L^-1 T^-2   vacuum level at valve-off (microns of mercury)
  end_micron           M L^-1 T^-2   vacuum level after the hold
  hold_min             T             hold time (minutes)
  pass_ceiling_micron  M L^-1 T^-2   pass ceiling (default 500)

rise_micron          = end_micron - start_micron
rate_micron_per_min  = rise_micron / hold_min
verdict:
  end_micron <= pass_ceiling_micron -> tight and dry, ok to charge
  else                              -> not ready (moisture if it plateaus, leak if it climbs)
```

**Pinned worked example.** Pull to 300 microns, valve off, after 15 min the gauge reads 450:
rise = 150 microns, rate = 10 microns/min, 450 <= 500 -> tight and dry. **Cross-check:** pull
to 500, after 15 min reads 1200: rise = 700, rate = 46.67 microns/min, 1200 > 500 -> not
ready (a leak or residual moisture). The 500-micron ceiling is editable; some manufacturers
call for a deeper hold.

### 2.2 `nitrogen-pressure-test` -- Nitrogen Pressure Test (Temperature-Corrected) (Group C, calc-hvacservice.js)

The leak-check commissioning verdict. A system charged with dry nitrogen to a test pressure
and held over hours sees the gauge move with ambient temperature alone -- Gay-Lussac's law
says that at a fixed volume `P/T` is constant in absolute units. The tile computes what the
gauge *should* read after the temperature swing with no leak, and reports any pressure lost
below that as the leak.

```
inputs:
  start_psig     M L^-1 T^-2   test pressure at start (psig)
  start_temp_F   T             temperature at start (F)
  end_temp_F     T             temperature at end (F)
  end_psig       M L^-1 T^-2   gauge pressure at end (psig)
  atm_psi        M L^-1 T^-2   atmospheric pressure (default 14.7)
  tolerance_psi  M L^-1 T^-2   leak tolerance band (default 1)

t1_R           = start_temp_F + 459.67           (Rankine)
t2_R           = end_temp_F + 459.67
expected_psig  = (start_psig + atm_psi) x (t2_R / t1_R) - atm_psi
leak_drop_psi  = expected_psig - end_psig         (positive = lost below the corrected value)
gauge_change_psi = end_psig - start_psig          (the raw observed change)
verdict:
  |leak_drop_psi| <= tolerance_psi -> holds (the change is thermal)
  leak_drop_psi  >  tolerance_psi  -> leak of that magnitude; soap-test the joints
  leak_drop_psi  < -tolerance_psi  -> reads above corrected; re-check the gauge/temperatures
```

**Pinned worked example.** 150 psig at 70 F, held until the ambient cools to 50 F, atm 14.7,
tolerance 1: `expected_psig = 164.7 x (509.67 / 529.67) - 14.7 = 143.78 psig`. A gauge reading
144 -> leak_drop -0.22 psi -> holds (the 6 psi gauge drop is purely thermal). **Cross-check:**
the same setup but the gauge reads 138 -> leak_drop 5.78 psi below the corrected value -> a
leak. A sanity case with no temperature change (75 F to 75 F) returns `expected = start` and
`leak_drop = 0` exactly.

## 3. Concept-check and wiring

Concept-checked against the post-v104 live tiles. The refrigerant bench
(`superheat-subcool`, `refrigerant-charge`, `compare-refrigerants`) and the v102 field bench
(`recovery-cylinder`, `condensate-drain`) hold the charge/recovery math but no evacuation
decay verdict and no temperature-corrected pressure test. No live tile computes either. **Both
ship** into the existing `calc-hvacservice.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `C`; trade `["hvac"]`);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`vacuum-decay-test` and
`nitrogen-pressure-test`, both `GOVERNANCE.general`, with the formula string and assumptions
listing every bundled constant); `test/fixtures/worked-examples.json` (both pinned examples
and their cross-checks); `test/fixtures/compute-map.js` (`vacuum-decay-test` ->
`computeVacuumDecayTest`, `nitrogen-pressure-test` -> `computeNitrogenPressureTest`, both in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (`vacuum-decay-test` ->
`nitrogen-pressure-test` / `recovery-cylinder` / `refrigerant-charge`;
`nitrogen-pressure-test` -> `vacuum-decay-test` / `superheat-subcool` / `recovery-cylinder`);
`data/search/aliases.json` (`vacuum-decay-test`: "vacuum decay test", "micron decay", "blank
off test", "evacuation standing test", "500 micron"; `nitrogen-pressure-test`: "nitrogen
pressure test", "standing pressure test", "temperature corrected pressure", "nitrogen leak
check", "gay-lussac"); the two ids appended to the existing `HVACSERVICE_RENDERERS` declare in
`app.js`; the `// dims:` annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins both worked examples and their cross-checks, the
no-temperature-change Gay-Lussac sanity, and every error seam.

**Module note.** The two tiles land in the existing `calc-hvacservice.js`, not a new module:
the bench is the natural home for the evacuation/leak-check side of the same service call, and
it had cap headroom. The six-tile bench builds to ~7.5 KB gzipped, so the
`scripts/check-module-sizes.mjs` cap is raised **6,500 -> 9,000 B** (current + ~20% headroom)
with a dated comment. It remains lazy-loaded and absent from the home-view first-paint
payload. The shared `citations.js` registry cap is bumped **192,000 -> 200,000 B** for the two
new citation entries (the standard registry-growth side-effect, per the v90-v100 precedent).
No other module cap is touched; no source module loses tiles.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates; `check-readme-counts`
agrees at **669 tiles / 25 groups / 53 modules / 696 sitemap URLs**, and the raised
`calc-hvacservice.js` cap is registered); `npm test` (+4 worked-example fixtures and their
cross-checks; the new spec-v105 bounds-fuzzer block; 5,551 unit tests); `npm run build` (669
tile + 25 group shells, regenerated 696-URL sitemap); `npm run data:verify`; the
worked-examples runner; the 320 px shell audit (the micron, rate, and pressure lines all wrap,
not scroll, on a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y
gate, with the rendered output read to the value (300 -> 450 over 15 min -> rise 150, rate 10,
tight; 150 psig at 70 F cooling to 50 F -> expected 143.8 psig, a 144 reading holds).

## 5. Roadmap position

v105 closes the commissioning side of the HVAC field-service bench: the two go/no-go verdicts a
tech reads off the gauges before charging. With v102 (refrigerant/drain), v104 (electrical),
and v105 (evacuation/leak-check), `calc-hvacservice.js` now spans a service call end to end.
Further growth stays evidence-driven (a named gap a tech hits) -- the remaining spec-v104 §5
candidate, a **temperature-split vs target** airflow/charge diagnostic, is deferred because it
needs a manufacturer indoor-coil temperature-split chart keyed on return dry-bulb and wet-bulb
(a licensed/representative-table item) rather than a first-principles formula, and so lands
only when a defensible public table or a clean representative-defaults framing is in hand. The
standing module-cap watch keeps `calc-hvacservice.js` at its raised 9,000 B cap after this
landing.
