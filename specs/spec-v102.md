# roughlogic.com Specification v102 -- HVAC Field-Service Bench: Condensate Drain Sizing and Recovery-Cylinder 80% Fill (New Module calc-hvacservice.js, Group C, 2 New Tiles)

> **Implementation status: LANDED 2026-06-19 (catalog 661 -> 663; 25 groups; landed
> together with v101 + v103 as the field-service design bench pass, package 0.66.0, a
> minor stamp).** v102 inherits everything from spec.md through spec-v101.md and
> changes none of it. It adds two tiles to **Group C (HVAC)** and changes no existing tile's
> output. **No new group, no new dependencies, no telemetry, no AI, US standards only.**
> Both tiles land in a new **`calc-hvacservice.js`** bench (the field-service and
> startup/recovery work a tech does at the unit), keeping `calc-hvac.js` off its cap -- see
> the §3 module note.
>
> **The gap, and the evidence for it.** Group C is deep (50 rows) on the load, airflow,
> refrigerant-circuit, and building-systems side: `manual-j-cooling`, `duct-sizing`,
> `superheat-subcool`, `refrigerant-charging`, `cfm-per-ton`, `chiller-tons`, and the rest.
> But two everyday *field-service* numbers a tech needs at the unit are missing. There is no
> **condensate drain** tile: the gallons-per-hour a coil sheds, the minimum drain-line size
> for the tonnage, and the fall over a run at the code slope. A concept-check of the
> post-v101 live ids for `condensate` returned nothing. And there is no **recovery-cylinder
> fill** tile: the maximum net refrigerant a recovery cylinder may hold under the 80% fill
> rule, from the cylinder's stamped water capacity and the refrigerant's liquid density, and
> how much headroom is left. A concept-check for `recovery` matched only
> `water-heater-recovery` (a plumbing tile). These are daily numbers a service tech reaches
> for at the condensate line and at the recovery machine.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `condensate-drain` carries a cooling capacity (tons) times a rate
  (pints per ton-hour) over a dimensionless pints-per-gallon to a volume rate (gallons per
  hour), and a slope (inches per foot) times a length (feet) to a fall (inches);
  `recovery-cylinder` carries a mass (pounds of water capacity) times a dimensionless
  fill-fraction times a dimensionless liquid specific gravity to a mass (pounds of
  refrigerant). Every constant -- the 8 pints per gallon, the 8.34 lb-per-gallon water basis
  for specific gravity, and the 0.80 DOT fill fraction -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. For
  `condensate-drain`: a non-positive tonnage or pints-per-ton-hour returns `{ error }`; a
  negative run length or slope returns `{ error }` (zero run is valid -- the rate and size
  still report). For `recovery-cylinder`: a non-positive water capacity or refrigerant
  density returns `{ error }`; a negative current charge returns `{ error }`; when the
  current charge meets or exceeds the 80% maximum the action is **"do not fill"** and the
  remaining capacity is exactly zero (a valid result, not an error).
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (these are
  field-service arithmetic; the code and the equipment data govern). Sources are named,
  never reproduced: the **IMC 307.2** condensate provisions (the drain-size-by-capacity
  steps of 307.2.2 and the not-less-than-1/8-inch-per-foot slope of 307.2.5 are stated, not
  quoted; the per-ton condensate *rate* is an editable field estimate, since actual
  condensate tracks the latent load and indoor humidity, not a code value); and the **DOT /
  AHRI 700 / EPA Section 608** recovery-cylinder practice (the 80% maximum fill, the stamped
  water-capacity and tare basis, and the never-mix-refrigerants rule). The note states the
  product nameplate, the cylinder stamp, and the AHJ govern.
- Tile ids are kebab-case and checked against the post-v101 live ids. Neither collides with
  `water-heater-recovery` (Group B plumbing), `refrigerant-charging` (Group C), or any other
  live tile (see Section 3).

## 2. The tiles

### 2.1 `condensate-drain` -- Condensate Rate, Drain Size, and Slope (Group C, calc-hvacservice.js)

The gallons-per-hour a coil produces, the minimum drain-line size for the tonnage, and the
fall over a run, the way a tech sizes and pitches the line.

```
inputs:
  tons               -    cooling capacity (tons of refrigeration)
  pints_per_ton_hr   -    condensate rate estimate (pints per ton-hour; default 3)
  run_ft             L    horizontal drain run (ft; default 0)
  slope_in_per_ft    -    pitch (in per ft; default 0.125 = 1/8 in per ft)

rate_pints_hr = tons * pints_per_ton_hr
rate_gph      = rate_pints_hr / 8
min_size_in   = IMC 307.2.2 step:  tons <= 20 -> 0.75; 20 < tons <= 40 -> 1.0;
                40 < tons <= 90 -> 1.25; 90 < tons <= 125 -> 1.5; tons > 125 -> 2.0
fall_in       = run_ft * slope_in_per_ft
```

Outputs: the condensate rate in pints per hour and gallons per hour, the minimum drain pipe
size for the tonnage, and the fall over the entered run at the pitch. The note line states:
condensate production tracks the *latent* load and indoor humidity -- the per-ton rate here
is a field estimate (about 2 to 4 pints per ton-hour is common in humid cooling), not a
code value; the drain size steps come from IMC 307.2.2 by equipment capacity; the line
slopes not less than 1/8 in per foot toward the discharge (IMC 307.2.5); a draw-through coil
needs a proper trap to break the negative pressure; and the AHJ and the equipment manual
govern.

**Worked example (pinned).** A 3-ton residential split at 3 pints per ton-hour: rate = 3 x
3 = **9 pints/hr** = 9 / 8 = **1.125 gph**; tonnage <= 20 so the minimum drain is **3/4
in**; over a 20 ft run at 1/8 in per foot the fall is 20 x 0.125 = **2.5 in**. Cross-check
(a 30-ton rooftop unit): rate = 30 x 3 = 90 pints/hr = **11.25 gph**; 20 < 30 <= 40 so the
minimum drain is **1 in**. Cross-check (a 100-ton chiller): rate = **37.5 gph**; 90 < 100
<= 125 so the minimum drain is **1-1/2 in**. Degenerate inputs (tons <= 0, pints_per_ton_hr
<= 0, a negative run or slope, non-finite) return an error.

### 2.2 `recovery-cylinder` -- Recovery-Cylinder 80% Fill (Group C, calc-hvacservice.js)

The maximum net refrigerant a recovery cylinder may legally hold under the 80% fill rule,
from the stamped water capacity and the refrigerant's liquid density, plus the headroom
left.

```
inputs:
  water_capacity_lb  M    cylinder water capacity, WC, stamped on the cylinder (lb)
  refrig_density_lb_gal  -  refrigerant liquid density at storage temp (lb/gal; from the PT/property sheet)
  current_net_lb     M    refrigerant already in the cylinder (lb; default 0)
  fill_fraction      -    maximum fill fraction (default 0.80)

specific_gravity = refrig_density_lb_gal / 8.34
max_net_lb       = fill_fraction * water_capacity_lb * specific_gravity
remaining_lb     = max(0, max_net_lb - current_net_lb)
pct_full         = current_net_lb / max_net_lb * 100
action           = current_net_lb >= max_net_lb ? "do not fill" : "ok to fill"
```

Outputs: the maximum net refrigerant weight at the 80% rule, the remaining capacity, the
percent full, and the fill/do-not-fill action. The note line states: the 80% rule leaves
room for liquid expansion with temperature -- never fill past it; water capacity (WC) and
tare are stamped on the cylinder, and the *net* refrigerant is the gross on the scale minus
the tare; liquid density varies with refrigerant and temperature, so read it from the
property sheet; never mix refrigerants in a recovery cylinder, and use only a cylinder rated
and in-date for recovery; EPA Section 608 governs handling.

**Worked example (pinned).** A 50 lb WC cylinder, R-410A liquid at 9.0 lb/gal, 30 lb
already recovered: specific gravity = 9.0 / 8.34 = **1.079**; max net = 0.80 x 50 x 1.079 =
**43.2 lb**; remaining = 43.2 - 30 = **13.2 lb**; percent full = 30 / 43.2 = **69.5%**;
action **ok to fill**. Cross-check (a denser refrigerant at 12.0 lb/gal, same WC, empty):
max net = 0.80 x 50 x (12.0 / 8.34) = 0.80 x 50 x 1.439 = **57.6 lb**. Cross-check (the
first cylinder already holding 45 lb): 45 >= 43.2, so action **do not fill**, remaining
**0**. Degenerate inputs (water_capacity_lb <= 0, refrig_density_lb_gal <= 0, a negative
current charge, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the post-v101 live tiles. `water-heater-recovery` (Group B) is a
plumbing recovery-rate tile (gallons per hour a water heater reheats), unrelated to a
refrigerant recovery cylinder. `refrigerant-charging` and `refrigerant-charge` (Group C) set
the *operating* charge of a system, not the fill limit of a recovery cylinder. No live tile
sizes a condensate drain or applies the 80% cylinder-fill rule. **Both ship** into the new
`calc-hvacservice.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `C`; `condensate-drain`
trades `["hvac"]`, `recovery-cylinder` trades `["hvac", "refrigeration"]`); `tile-meta.js`
`_TILES`; a `citations.js` entry (the `GOVERNANCE.general` governance from Section 1; the
formula string; assumptions listing every bundled constant -- the 8 pints per gallon, the
IMC 307.2.2 size steps and the 1/8-in-per-foot slope, the 8.34 lb-per-gallon water basis,
and the 0.80 fill fraction -- naming IMC 307.2 and the DOT/AHRI 700/EPA 608 recovery
practice without reproduction); `test/fixtures/worked-examples.json` (every pinned example
and cross-check); `test/fixtures/compute-map.js` (`condensate-drain` ->
`../../calc-hvacservice.js`; `recovery-cylinder` -> `../../calc-hvacservice.js`);
`scripts/related-tiles.mjs` (`condensate-drain` -> `cfm-per-ton` / `manual-j-cooling` /
`duct-sizing`; `recovery-cylinder` -> `refrigerant-charging` / `refrigerant-pt` /
`compare-refrigerants`); `data/search/aliases.json` (e.g. `condensate-drain`: "condensate",
"drain pan", "condensate line size", "drain slope", "ac drain"; `recovery-cylinder`:
"recovery cylinder", "80 percent fill", "recovery tank", "refrigerant recovery", "do not
overfill"); a new `HVACSERVICE_RENDERERS` declare in `app.js` carrying both ids; the
`// dims:` annotations; and the regenerated v14 corpus + tile-index. A
`test/unit/bounds-fuzzer.test.js` block pins both worked examples, the IMC size steps at
their boundaries (20 / 40 / 90 / 125 tons), the do-not-fill branch, and every error seam.

**Module note.** `calc-hvac.js` sits at ~40.4 KB gzipped against its 43,500 B cap (~93%,
already in WARN territory), so two more Group C tiles do not belong there. Per spec-v10
§H.1 the preferred remediation at a brushing cap is a per-bench split, the pattern used by
v74 (`calc-velocity.js`), v81 (`calc-hvacsystems.js`), and v89 (`calc-refrigerant.js`).
This spec creates **`calc-hvacservice.js`**, a new HVAC field-service bench, with a cap of
**4,000 B** (current + ~20% headroom; the two small tiles build to roughly 2 to 3 KB
gzipped). It is lazy-loaded and not in the home-view first-paint payload. Group letter (`C`)
is independent of the module; both tiles keep `group: "C"`.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size, wiring,
sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **663 tiles** and the matching sitemap URL count, and the
new `calc-hvacservice.js` cap is registered in `scripts/check-module-sizes.mjs`); `npm test`
(+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer block); `npm run
build` (663 tile shells, regenerated sitemap); `npm run data:verify`; the worked-examples
runner; the 320 px shell audit (the rate / size / fall lines and the max-net / remaining /
percent-full lines all wrap, not scroll, on a phone); and the full-catalog render-no-nan
Chromium sweep plus the a11y gate, with the rendered output read to the value (3 tons at 3
pints/ton-hr -> 1.125 gph, 3/4 in drain; a 50 lb WC cylinder of 9.0 lb/gal R-410A -> 43.2
lb max net, 13.2 lb remaining at 30 lb in).

## 5. Roadmap position

v102 opens an HVAC field-service bench with the two service numbers the load/airflow/circuit
tiles did not cover. Further growth should stay evidence-driven (a named gap a tech hits) --
candidates include a **condensate-trap depth** for a draw-through coil (deliberately
deferred here because the trap-leg geometry varies by manufacturer and would need a clearly
bounded, single-source rule before it ships), a **system evacuation/triple-evacuation time**
estimate, and a **nitrogen-purge / standing-pressure leak-test** helper; none ships without
the field need. The standing module-cap watch adds `calc-hvacservice.js` after this landing
and keeps `calc-hvac.js` on the split-watch list.
