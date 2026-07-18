# roughlogic.com Specification v987 -- Solar Thermal Collector Output (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group
> B), no new module, group, or dependency. Inherits spec.md through spec-v986.md. Beside the water-heater family
> (`water-heater-recovery`, `water-heater-storage-sizing`) and the pool-heater tiles.
>
> **The gap, and the evidence for it.** The catalog sizes water heaters, pool heaters, and PV output, but nothing
> covers a solar THERMAL collector -- the flat-plate panel that heats domestic water or a pool. Grep confirmed no
> collector-efficiency tile. The number this settles: at a 120 F inlet, 70 F ambient, and 300 Btu/hr-ft^2 of sun a
> typical glazed collector runs about **56% efficient** and makes **6,700 Btu/hr** over 40 sq ft.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut), bounds-fuzzer, worked-example registry, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, an optical efficiency outside (0, 1], a negative loss
coefficient, or a non-positive irradiance or area returns `{ error }`; useful heat clamps to zero past the stagnation
point (efficiency <= 0). Citation discipline (v19/v22): the ASHRAE 93 / Hottel-Whillier-Bliss collector efficiency line
by name (as reported on the SRCC rating), `GOVERNANCE.general`; the note stresses that the collector is least efficient
when hot and dim, that an unglazed pool collector has a high intercept but a steep loss slope, and that the SRCC-rated
intercept and slope, the incidence angle, the flow rate, and the glazing condition govern the real output.

## 2. The tile

### 2.1 `solar-thermal-collector` -- Solar Thermal Collector Output

```
inputs:
  optical_efficiency  y-intercept, FR(tau-alpha), ~0.70, default 0.70
  loss_coeff          slope, FR*UL (Btu/hr-ft^2-F), default 0.85
  inlet_temp_f        fluid inlet temp (F), default 120
  ambient_temp_f      ambient air temp (F), default 70
  irradiance_btu      solar irradiance (Btu/hr-ft^2), default 300
  area_sqft           collector area (sq ft), default 40

efficiency          = optical_efficiency - loss_coeff x (inlet_temp_f - ambient_temp_f) / irradiance_btu
useful_btu_per_sqft = irradiance_btu x max(0, efficiency)
useful_btu_hr       = useful_btu_per_sqft x area_sqft
```

**Pinned worked example.** 0.70 optical, 0.85 loss, 120 F inlet, 70 F ambient, 300 Btu/hr-ft^2, 40 sq ft:
`efficiency = 0.70 - 0.85 x 50/300 = ` **0.558** (55.8%); `per sq ft = 300 x 0.558 = 167.5`; total = **6,700 Btu/hr**.
Cross-check: a colder, dimmer day (140 F inlet, 40 F ambient, 250 Btu/hr-ft^2): `efficiency = 0.70 - 0.85 x 100/250 = `
**0.36** (36.0%); total = **3,600 Btu/hr** -- least efficient exactly when the heat is needed most.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["solar", "plumbing"]`, beside `water-heater-recovery`); a `tile-meta.js`
`_TILES` entry (`B`); a `citations.js` entry (ASHRAE 93 / Hottel-Whillier-Bliss efficiency line, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the colder-day cross-check, pinning the efficiency and
useful heat); `test/fixtures/compute-map.js` (`solar-thermal-collector` -> `computeSolarThermalCollector`, module
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `water-heater-recovery` / `water-heater-storage-sizing` /
`pool-heater-btu`); `data/search/aliases.json` (5 collision-checked aliases: "solar thermal", "solar collector",
"collector efficiency", "solar hot water collector", "flat plate collector"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `PLUMBING_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning both examples, the inlet / irradiance monotonic directions, the stagnation clamp, and the error seams. The
calc-plumbing.js gzip cap and the Group B group shell are watched at build (cap raised for this tile). Home tile count
1,435 -> 1,436.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.70 - 0.85 x 50/300 -> 55.8%, 6,700 Btu/hr).

## 5. Roadmap position

Solar water heating beside the water-heater tiles, serving the solar / plumbing installer (solar, plumbing).
Deliberately the performance estimate; the collector's SRCC-rated intercept and slope, the solar incidence angle, the
flow rate, and the glazing condition govern the real output. Stays evidence-driven. Continues the solar/plumbing sweep
at 1 new spec (v987).
