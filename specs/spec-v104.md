# roughlogic.com Specification v104 -- HVAC Field-Service Electrical Diagnostics: Equipment Circuit Sizing and Run-Capacitor Check (calc-hvacservice.js, Group C, 2 New Tiles)

> **Implementation status: LANDED 2026-06-20 (catalog 665 -> 667; 25 groups; package
> 0.67.0, a minor stamp).** v104 inherits everything from spec.md through spec-v103.md and
> changes none of it. It adds two tiles to the existing **`calc-hvacservice.js`** bench
> (opened by v102) and changes no existing tile's output. **No new module, no new group, no
> new dependencies, no telemetry, no AI, US standards only.** Both tiles keep `group: "C"`
> (a tile's group letter is independent of the module that holds it -- the v28/v70..v100
> split precedent).
>
> **The gap, and the evidence for it.** The v102 HVAC field-service bench holds the
> refrigerant/drain side of a service call (`condensate-drain`, `recovery-cylinder`). But the
> two numbers a tech or installer reaches for on the *electrical* side of the same call were
> missing. A concept-check of the post-v103 live ids for `mca`, `mocp`, `440`, and
> `capacitor` returned nothing: no tile sizes the branch circuit a condenser nameplate
> demands (the everyday "is this breaker and wire right for this unit?"), and no tile does the
> in-circuit run-capacitor check (the everyday "is this cap still good?"). The catalog covers
> the electrical *system* deeply (Group A: `breaker-sizing`, `wire-ampacity`, `ev-charger-load`,
> the conduit and box suites) and the HVAC *refrigeration* side deeply, but not the NEC 440
> equipment-circuit math that lives at the seam, nor the capacitor bench check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `hvac-equipment-circuit` is all-current arithmetic (amperes scaled
  by dimensionless code factors), annotated with `I`; `run-capacitor-microfarad` carries the
  capacitive-reactance relation, annotated with voltage `M L^2 T^-3 I^-1`, current `I`, and
  capacitance `M^-1 L^-2 T^4 I^2`. Every bundled constant -- the 1.25 / 1.75 / 2.25 NEC 440
  factors, the NEC 240.6(A) standard device sizes, the `1e6 / (2 x pi x 60) ~= 2652`
  capacitance constant, and the +/-6% capacitor tolerance -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. For
  `hvac-equipment-circuit`: a non-positive compressor RLA, or a negative fan/other/breaker
  amperage, returns `{ error }`. For `run-capacitor-microfarad`: a non-positive rating,
  voltage, or current, or a tolerance outside `[0, 100)` percent, returns `{ error }`.
- The v19/v22 citation discipline applies. `hvac-equipment-circuit` uses
  **`GOVERNANCE.electrical`** (the NEC is the law and the licensed electrician governs) and
  names **NEC 2023 (NFPA 70) 440.33, 440.22(A), and 240.6(A)** without reproduction.
  `run-capacitor-microfarad` uses **`GOVERNANCE.general`** (public capacitive-reactance
  physics; the licensed tech governs) and names the first-principles reactance relation and
  the common +/-6% run-capacitor convention. Neither reproduces a licensed table.

## 2. The tiles

### 2.1 `hvac-equipment-circuit` -- HVAC Equipment Circuit (MCA / MOCP) (Group C, calc-hvacservice.js)

The branch circuit a condenser or heat pump nameplate demands, the NEC 440 way: the minimum
circuit ampacity to size the conductor, the maximum overcurrent device, and the start
ceiling, with an optional check of the installed breaker.

```
inputs:
  compressor_rla_A     I    compressor rated-load amps (RLA), the largest motor
  fan_fla_A            I    condenser-fan full-load amps (default 0)
  other_load_A         I    any other motors / loads on the circuit (default 0)
  installed_breaker_A  I    the installed breaker, to check (optional; default 0 = skip)

largest              = max(compressor_rla_A, fan_fla_A, other_load_A)
others               = (compressor_rla_A + fan_fla_A + other_load_A) - largest
mca_A                = 1.25 * largest + others                 # NEC 440.33
mocp_A               = roundDownToStd(1.75 * largest + others) # NEC 440.22(A), a ceiling
mocp_max_A           = roundDownToStd(2.25 * largest + others) # the 225% start allowance
min_conductor_A      = mca_A
```

Outputs: the MCA (size the conductor to carry at least it), the MOCP at 175% taken to the
next NEC 240.6(A) standard size *down* (175% is a ceiling, so round down -- never up), the
225% ceiling reported separately (permitted only where the 175% size will not start the
equipment), and a verdict on the installed breaker (within the maximum / allowed-only-to-start
/ too large). The note states the NEC 440.33 MCA basis, the 440.22(A) round-down rule, that
RLA is the nameplate rated-load amps (not LRA), and that the stamped nameplate MCA/MOCP and
the AHJ govern.

**Worked example (pinned).** A compressor with RLA 20 A and a condenser fan at 1.5 A: MCA =
1.25 x 20 + 1.5 = **26.5 A**; MOCP = 1.75 x 20 + 1.5 = 36.5, rounded down to the **35 A**
standard size; the 225% ceiling = 2.25 x 20 + 1.5 = 46.5 -> **45 A**. A 35 A installed
breaker is within the nameplate maximum. This matches a real split-system nameplate (MCA
26.5, MOCP 35). Cross-check (RLA 32 + fan 2.3): MCA = **42.3 A**, MOCP = 1.75 x 32 + 2.3 =
58.3 -> **50 A**, ceiling = 74.3 -> **70 A**. Degenerate inputs (compressor_rla_A <= 0, any
negative amperage, non-finite) return an error.

### 2.2 `run-capacitor-microfarad` -- Run Capacitor Microfarad Check (Group C, calc-hvacservice.js)

The in-circuit capacitance test a tech runs at the unit: the measured microfarad from the
volts and amps on the running capacitor, compared to the nameplate rating and a tolerance
band.

```
inputs:
  rated_uf             cap  nameplate capacitor rating (microfarad)
  measured_volts_V     V    measured voltage across the capacitor (unit running)
  measured_amps_A      I    measured current through a capacitor lead (clamp)
  tolerance_pct        -    acceptance tolerance (percent; default 6 for run capacitors)

measured_uf          = 1e6 * measured_amps_A / (2 * pi * 60 * measured_volts_V)
                       (~= 2652 * amps / volts at 60 Hz)
low_uf               = rated_uf * (1 - tolerance_pct / 100)
high_uf              = rated_uf * (1 + tolerance_pct / 100)
pct_of_rated         = measured_uf / rated_uf * 100
```

Outputs: the measured capacitance, the percent of rating, the tolerance band, and a verdict
(within tolerance -- good / below -- weak, replace / above -- replace). The basis is the
capacitive reactance `Xc = 1 / (2 x pi x f x C)`, so the current the cap passes is
`I = V / Xc = V x 2 x pi x f x C`, and `C = I / (2 x pi x f x V)`; at 60 Hz that is the
`~2652 x amps / volts` field rule. The note states how to take the reading (amps by clamp on
a lead, volts across the terminals with the unit running), that run capacitors are commonly
held to +/-6% (start capacitors wider), that a low reading is a weak cap that runs the motor
hot, and to discharge the capacitor before handling.

**Worked example (pinned).** A 45 uF run capacitor measuring 6.2 A at 370 V: measured =
2652 x 6.2 / 370 = **44.4 uF** (98.8% of rating), within the 42.3-47.7 uF band -- good.
Cross-check (the same cap drawing only 3.0 A at 370 V): measured = 2652 x 3.0 / 370 = **21.5
uF**, well below the 42.3 uF floor -- a weak cap, replace. Degenerate inputs (rated_uf <= 0,
measured_volts_V <= 0, measured_amps_A <= 0, tolerance_pct outside [0, 100), non-finite)
return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v103 live tiles. Group A holds the electrical-system math
(`breaker-sizing` a single load's OCPD, `wire-ampacity` the conductor table, `ev-charger-load`
the 125%-continuous EVSE circuit, `motor-feeder-multiple` the NEC 430 multi-motor feeder)
but no NEC 440 *HVAC-equipment* MCA/MOCP, which uses the 440.33 / 440.22 method (125% of the
largest motor, 175% round-down OCPD) rather than the 430 feeder rules. Group C holds the
refrigeration and airflow math (`superheat-subcool`, `cfm-per-ton`, `shr-latent`,
`refrigerant-charge`) but no capacitor check. No live tile computes either number. **Both
ship** into the existing `calc-hvacservice.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `C`; both trades
`["hvac", "electrical"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`hvac-equipment-circuit` -> `GOVERNANCE.electrical`, NEC 2023 440.33 / 440.22(A) / 240.6(A),
`run-capacitor-microfarad` -> `GOVERNANCE.general`, first-principles reactance; the formula
string and assumptions listing every bundled constant); `test/fixtures/worked-examples.json`
(both pinned examples and their cross-checks); `test/fixtures/compute-map.js`
(`hvac-equipment-circuit` -> `computeHvacEquipmentCircuit`, `run-capacitor-microfarad` ->
`computeRunCapacitorMicrofarad`, both in `../../calc-hvacservice.js`);
`scripts/related-tiles.mjs` (`hvac-equipment-circuit` -> `breaker-sizing` / `wire-ampacity` /
`ev-charger-load`; `run-capacitor-microfarad` -> `ohms-law` / `motor-vd-starting` /
`superheat-subcool`); `data/search/aliases.json` (`hvac-equipment-circuit`: "mca", "mocp",
"minimum circuit ampacity", "max overcurrent protection", "condenser breaker size", "nec 440
nameplate"; `run-capacitor-microfarad`: "run capacitor", "microfarad test", "capacitor
check", "weak capacitor", "dual run capacitor"); the two ids appended to the existing
`HVACSERVICE_RENDERERS` declare in `app.js`; the `// dims:` annotations; and the regenerated
v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both worked examples,
the MOCP round-down to a standard size, the within/below verdict paths, and every error seam.

**Module note.** The two tiles land in the existing `calc-hvacservice.js` (opened by v102),
not a new module: the bench is the natural home for the electrical side of the same service
call, and it had cap headroom. The four-tile bench builds to ~5.4 KB gzipped, so the
`scripts/check-module-sizes.mjs` cap is raised **4,000 -> 6,500 B** (current + ~20% headroom)
with a dated comment. It remains lazy-loaded and absent from the home-view first-paint
payload. No other module cap is touched; no source module loses tiles.

## 4. As-landed verification (gate plan satisfied)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates; `check-readme-counts`
agrees at **667 tiles / 25 groups / 53 modules / 694 sitemap URLs**, and the raised
`calc-hvacservice.js` cap is registered); `npm test` (+4 worked-example fixtures and their
cross-checks; the new spec-v104 bounds-fuzzer block; 5,550 unit tests); `npm run build` (667
tile + 25 group shells, regenerated 694-URL sitemap); `npm run data:verify`; the
worked-examples runner; the 320 px shell audit (the MCA / MOCP / capacitance lines all wrap,
not scroll, on a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y
gate, with the rendered output read to the value (RLA 20 + fan 1.5 -> MCA 26.5 A, MOCP 35 A,
ceiling 45 A; a 45 uF cap at 6.2 A / 370 V -> 44.4 uF, within band).

## 5. Roadmap position

v104 closes the electrical side of the HVAC field-service bench with the two numbers a tech
hits on a service call. Further growth should stay evidence-driven (a named gap a tech hits)
-- candidates include an **evacuation / vacuum decay** verdict (a held micron rise over a
timed window), a **nitrogen pressure-test temperature correction** (holding pressure vs
ambient swing), and a **temperature-split vs target** airflow/charge diagnostic; none ships
without the field need. The standing module-cap watch keeps `calc-hvacservice.js` at its
raised 6,500 B cap after this landing.
