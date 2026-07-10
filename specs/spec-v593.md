# roughlogic.com Specification v593 -- US-Customary Defaults Everywhere (13 Tile Remediations + check-us-defaults Gate, 0 New Tiles)

> **Status: LANDED (2026-07-10, package 0.180.0). Platform/policy spec.** No new tile, module, or dependency. Inherits spec.md through
> spec-v592.md.
>
> **As-landed deltas.** (1) The gate scans three label surfaces, not one: direct make* calls, per-module ALIASES (any
> `fn("Label", "dom-id")` call shape -- search-track-spacing renders via `_mnF` and evaded the named-function scan), and
> factory `label:` field specs (5 of the 13 audit tiles are factory-rendered). (2) Pre-remediation red = **20 findings
> across 11 tiles**; brake-pad-life and wallpaper-rolls are value-level cases the §4 honest-scope paragraph already
> exempts. (3) The allowlist landed at 47 entries and also carries not-actually-metric waivers the audit table did not
> anticipate: NEC subsection letters "220.61(C)", Loan Estimate section "(C)", ACI span ratios "(l/20)", and seismic
> acceleration "(g)". (4) Remediation followed the §3 mechanics exactly: only liquefaction-screening changed its compute
> signature (depth_ft; fixtures, fuzzer pins, corpus, citation formula/editionNote, and tools-data desc all restated;
> per-foot rd verified against per-meter to 2e-12); the other twelve convert at the renderer boundary with fixtures
> staying correlation-native.
>
> **The gap, and the evidence for it.** Every spec since v106 carries the line *"US standards only,"* but nothing in the
> tree defines what that means for units, and nothing enforces it. A full-catalog audit (2026-07-10, all 56 calc
> modules, ~970 tile compute surfaces) found the catalog ~99% compliant -- and 13 tiles whose happy path faces the US
> user in metric: two unit selects that default to Celsius/kilometres, two meters-or-SI-only input sets, eight tiles
> with a metric field or output embedded in an otherwise US-customary form, and one tile whose units are inches but
> whose default *values* are the Euro product size. The class is live, not historical: the newest offender
> (`flocculation-g-value`, m^3 / deg C / W inputs) landed as spec-v575 the same day as the audit. Without a gate, a
> ~970-tile catalog that adds tiles weekly will re-grow metric defaults one tile at a time. This spec (1) states the
> doctrine, (2) codifies the exception class where metric IS US trade practice, (3) remediates the 13 tiles, and
> (4) adds a lint gate so the property stays true.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. The doctrine (normative)

**Every tile's default reading is the unit a US tradesperson reads on the job.** Concretely:

- **Defaults.** Every input field's label unit, every prefilled value, every example-button fill, and every primary
  output unit is US customary (ft, in, lb, psi, psf, gal, GPM, CFM, mph, deg F, BTU/h, hp, ft-lb, acres) or the US
  code/trade convention for that quantity (§2). Default *values* are US-typical too: a field already labeled in inches
  must not default to the European product dimension.
- **Metric is opt-in, never the default.** Where a tile offers a unit choice (`makeSelect`), the US option carries
  `selected: true` (or is the first option); metric remains available one tap away. Metric may also appear as a
  secondary parenthetical output (the existing `"... lb (... kg)"` pattern) and in dedicated unit-converter tiles,
  which stay US-first in their own defaults (`pressure-convert` already leads with psi).
- **Metric-native correlations convert at the renderer boundary.** Where the published model is metric-native
  (Seed-Idriss rd, SAE J1349, ANSI S1.26 absorption, Camp-Stein G), the renderer converts US inputs to the
  correlation's units (or the compute gains a converted entry path); the citation text keeps quoting the published
  form. What this spec governs is the user-facing default, not the internal math.
- **No capability is removed.** Remediation flips defaults and adds US entry paths; every metric capability a tile
  ships today remains reachable (as the non-default select option or a secondary output).

## 2. The exception class: US-practice metric (allowlist, closed by review)

Metric that IS US trade practice is correct and stays. The audit's sanctioned families, seeded into the §4 allowlist:

| family | examples in the catalog |
|---|---|
| NEC/IEEE electrical | conductor insulation + ambient deg C (NEC 310), motor rise deg C (430.32), IEEE 80 ohm-m / kg |
| power and billing | kW, kWh, W, kVA, kVAR everywhere; kW/ton; solar W/m^2, kWh/m^2/day, deg C temperature coefficients |
| water/wastewater operations | mg/L, mg-min/L CT (and SWTR deg C tables), NTU, uS/cm at 25 deg C, grams/gal alongside MGD+GPM |
| test-pressure references | CFM50 "at 50 Pa," CFM25 (RESNET/IECC), dB re 1 W / 1 m sensitivity |
| product/spec conventions | engine chamber cc, wheel offset ET mm, lens/sensor mm, LED pixel pitch mm, brake pad thickness mm, ASTM C1074 maturity deg C-hr, AWS kJ/in (with kJ/mm secondary) |
| standards defined in SI | TIA-568 90 m link / 100 m channel, dB/km fiber loss, UTM easting/northing, WMM altitude km |
| lab and IH practice | mL, uL, mg, g/mol, M, g/mL; air-sampling pump L/min; baker's percentage / equilibrium cure grams |

The acid test for a new allowlist entry: *would a US tradesperson on this job read this number in this unit off their
own instrument, code table, or product label?* If the honest answer is "only a textbook would," it does not qualify.

## 3. Remediation: the 13 audited tiles

| module | tile | today | v593 default |
|---|---|---|---|
| calc-field.js | `hiking-time` | Distance select defaults **Kilometres**, ascent select **Metres**; example 10 km / 600 m | Miles / Feet selected; example restated in mi/ft; pace note leads with mph |
| calc-treatment.js | `langelier-index` | Temp-unit select defaults **Celsius**, temp prefill 25 | Fahrenheit selected, prefill 77 (mg/L CaCO3 fields stay per §2) |
| calc-treatment.js | `flocculation-g-value` | Basin volume m^3, temp deg C, power W -- SI only | gallons, deg F, hp inputs converted at the boundary; Camp-Stein math and citation unchanged |
| calc-rescue.js | `search-track-spacing` | Sweep width / track spacing / POD spacing in meters only | feet throughout (US ground-SAR practice) |
| calc-restoration.js | `psychrometric` | Atmospheric pressure field hPa, prefill 1013.25 | in Hg, prefill 29.92 (temp deg F / RH % already US) |
| calc-geotech.js | `liquefaction-screening` | `depth_m` in an otherwise psf/g tile | depth in ft; rd restated per-foot (breakpoint 9.15 m = 30 ft; 0.00765 and 0.0267 per-m scale by 0.3048); editionNote states the restatement |
| calc-mechanic.js | `dyno-correction-sae` | Baro mbar (980), inlet temp deg C (30) | in Hg (~28.9) and deg F (86), converted internally to the J1349 metric reference; hp output unchanged |
| calc-mechanic.js | `brake-pad-life` | Outputs KE/stop kJ, rotor rise deg C, wear um (inputs already lb/mph/mi) | ft-lb, deg F, mils primary (metric may remain parenthetical); pad mm fields stay per §2 |
| calc-stage.js | `spl-atmospheric` | Distances m, temp deg C, pressure kPa | ft / deg F / in Hg at the boundary; ANSI S1.26 math unchanged |
| calc-stage.js | `amp-power-spl` | Listening distance m | feet (the dB @ 1 W / 1 m sensitivity reference stays per §2) |
| calc-stage.js | `sound-pressure` | Reference/target distance labeled (m) | labeled (ft) -- the compute uses only the d2/d1 ratio, so this is a relabel |
| calc-stage.js | `time-alignment` | Ambient temp deg C; speed-of-sound shown m/s | deg F input converted internally; ft/ms shown beside m/s (path distances already ft) |
| calc-construction.js | `wallpaper-rolls` | Inch labels but Euro defaults: width 20.5 in, length 396 in, example ditto | US roll defaults (width 27 in, US bolt length); labels keep noting the Euro sizes as the alternative |

Mechanics per tile: the example fixture, the example-button fill, the `test/fixtures/worked-examples.json` rows, and
the bounds-fuzzer pins restate in the new default units wherever the compute signature changes; where conversion lives
in the renderer and the compute keeps its metric-native signature, fixtures may stay correlation-native and only the
renderer/example-button change. Regenerated v14 corpus + tile-index wherever a compute signature moves. `// dims:`
annotations are unit-free and do not change. Tiles landed after the 2026-07-10 audit snapshot are covered by the §4
gate, not this table.

## 4. The gate: `scripts/check-us-defaults.mjs`

A new lint in the `npm run lint` chain, static-scanning every `calc-*.js` renderer source:

- **Select defaults.** Any `makeSelect` option list where the defaulted option (`selected: true`, else the first
  option) has a metric label/value token (Celsius, C, Kilometres, km, Metres, m, kg, kPa, bar, L, mm) while a sibling
  option in the same select is the US counterpart -> fail.
- **Label units.** Any `makeNumber`/field label whose parenthetical unit matches a metric denylist token -- `(m)`,
  `(km)`, `(cm)`, `(mm)`, `(kg)`, `(g)`, `(C)`, `(deg C)`, `(kPa)`, `(hPa)`, `(mbar)`, `(L)`, `(L/min)`, `(mL)`,
  `(m^3)`, `(m/s)`, `(m2)`/`(m^2)` -- without a matching allowlist entry -> fail.
- **The allowlist.** `scripts/us-defaults-allowlist.json`, entries keyed by module file + label substring (or tile
  id), each carrying a one-line justification quoting the §2 family. Seeded from §2 so the post-remediation tree is
  green; additions are reviewed like citations, against the §2 acid test.
- **Honest scope.** The gate is a label-token heuristic: it catches the regression class the audit actually found
  (metric-labeled fields and metric-defaulted selects) and cannot prove semantic correctness of defaults or values
  (the `wallpaper-rolls` Euro-values case is caught by review, not by this gate). Red on today's tree (all 12
  label-level findings trip it), green after remediation.

## 5. Wiring

The 8 remediated modules per §3 with their example fixtures, worked-example rows, and fuzzer pins;
`citations.js` editionNotes where a constant is restated (`liquefaction-screening`) or a conversion is now part of the
tile's story; regenerated corpus/tile-index for signature changes; `scripts/check-us-defaults.mjs` +
`scripts/us-defaults-allowlist.json` + the `package.json` lint-chain entry (README gate count re-pinned +1);
no new tiles, groups, registries, or payload-relevant home changes (relabels ride existing module budgets; any module
crossing its gzip cap takes the standard cap bump in the same commit).

## 6. As-landed verification (gate plan)

`npm run lint` (full chain including the new gate; run once against the pre-remediation tree to prove red on the 12
label findings, then green); `npm test` (restated fixtures + fuzzer pins); `npm run build`; `npm run data:verify`;
worked-examples runner; render-no-nan + a11y scoped to the 13 tiles, output read to the value in the new default
units; 320 px audit of every relabeled input/output line (unit strings lengthen: "in Hg", "ft-lb").

## 7. Roadmap position

Turns the header line every spec already carries -- *US standards only* -- from prose into an enforced invariant, the
same arc check-dead-inputs and check-doc-links followed (a hand-audit that becomes a standing gate). Deliberately out
of scope, recorded for the paper trail: a site-wide metric mode or global unit toggle (evaluated 2026-07-10 and
rejected -- ~970 statically-labeled renderers, no demand signal, and the charter is US-first; per-tile unit selects
defaulting US remain the sanctioned metric affordance, and a future spec can reopen this with evidence). Follow-on
candidates if evidence accumulates: extending the gate to example-fixture values, and a metric-parenthetical secondary
output pattern for the highest-traffic tiles.
