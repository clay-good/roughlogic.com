# roughlogic.com Specification v235 -- Heat-Pump Cold-Temperature Capacity and Auxiliary Heat (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.88.0; was PROPOSED 2026-06-30). Batch spec-v233..v235 (the heat-pump heating-mode trio -- seasonal energy, dual-fuel
> switchover, and cold-temperature capacity). This closes the v233..v235 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the cold-weather capacity check and the auxiliary
> heat sizing are what the HVAC tech does to keep a heat-pump conversion from freezing the customer out on the design
> day. Adds one tile to **`calc-hvac.js`** (Group C); no new module, group, or dependency. Inherits spec.md through
> spec-v234.md.
>
> **The gap, and the evidence for it.** A heat pump's heating capacity falls as the outdoor temperature drops -- exactly
> when the building needs the most heat -- so the number that decides whether a conversion works is the unit's capacity
> at the design temperature against the building's design heating load. Manufacturers rate capacity at AHRI's 47 and 17
> degree points; interpolating between them (and extrapolating to a colder design day) gives the delivered capacity
> where it matters, and the shortfall below the design load is the auxiliary or backup heat the installer must add. Size
> the aux heat short and the house loses temperature on the coldest nights; size the heat pump on its 47-degree rating
> and it is badly undersized at 5 degrees. The catalog has the thermal `balance-point` but nothing that carries the
> capacity down the temperature curve and sizes the backup, so a tech converting a house to a heat pump has no check on
> whether it holds at design.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rated and delivered
capacities and the design heating load and shortfall are a power (Btu/h); the auxiliary heat is a power (kW); the rating
and design temperatures are a temperature (deg F). The bridge 3,412 Btu/h per kW is a named constant. The v18/v21
contract: any non-finite input, a non-positive rated capacity or design load, or equal rating temperatures (a zero
temperature span has no defined slope), returns `{ error }` (a computed capacity that extrapolates below zero is clamped
to zero, and reported). Citation discipline (v19/v22): `GOVERNANCE.general` over the capacity-interpolation and
aux-heat relations by name; `editionNote` names the **AHRI 210/240 low-temperature rating points** (the 47 deg F and
17 deg F integrated heating capacities) and the **linear capacity-versus-temperature interpolation**, and states that
**the two rated points come from the manufacturer's expanded performance data (a cold-climate / variable-capacity unit
holds capacity far better than a linear extrapolation of a single-speed unit suggests -- prefer the published
low-temperature data point over extrapolation when a conversion hinges on it), the design load and design temperature
come from a Manual J, defrost and cycling trim the field capacity, and this is a sizing check, not a performance
guarantee** -- a capacity-and-backup aid, not the manufacturer's rating.

## 2. The tile

### 2.1 `heat-pump-cold-capacity` -- Cold-Temperature Capacity and Auxiliary Heat

```
inputs:
  cap_47_btuh    Btu/h    rated integrated heating capacity at 47 deg F, Btu/h
  cap_17_btuh    Btu/h    rated integrated heating capacity at 17 deg F, Btu/h
  design_temp_f  deg F    outdoor heating design temperature, deg F
  design_load_btuh Btu/h  building design heating load at design_temp_f, Btu/h

slope         = (cap_47_btuh - cap_17_btuh) / (47 - 17)        # Btu/h per deg F
cap_design    = max(0, cap_17_btuh + slope * (design_temp_f - 17))
shortfall     = max(0, design_load_btuh - cap_design)
aux_kw        = shortfall / 3412
covers        = shortfall == 0
```

**Pinned worked example (3-ton cold-climate unit, 5 deg F design).** A heat pump rated 36,000 Btu/h at 47 deg F and
22,000 Btu/h at 17 deg F, a 5 deg F design temperature, and a 30,000 Btu/h design load:
`slope = (36,000 - 22,000) / (47 - 17) = 14,000 / 30 = 466.7 Btu/h per deg F`;
`cap_design = 22,000 + 466.7 * (5 - 17) = 22,000 - 5,600 = 16,400 Btu/h`;
`shortfall = 30,000 - 16,400 = 13,600 Btu/h`; `aux_kw = 13,600 / 3,412 = ` **3.99 kW of auxiliary heat**. At the 5 degree
design day the unit delivers only 16,400 of the 30,000 Btu/h the house needs, so it needs about 4 kW of backup strip
heat -- a very different picture from its 36,000 Btu/h nameplate. **Cross-check (mild climate, 30 deg F design).** The
same unit where the design temperature is 30 deg F: `cap_design = 22,000 + 466.7 * (30 - 17) = 22,000 + 6,067 = 28,067
Btu/h`; `shortfall = max(0, 30,000 - 28,067) = 1,933 Btu/h`; `aux_kw = 1,933 / 3,412 = ` **0.57 kW**. The identical
equipment and load in a milder climate needs almost no backup -- the design temperature, not the nameplate tonnage, is
what decides whether a heat pump stands alone, which is why a unit sized on its 47 degree rating is the classic
cold-climate conversion failure.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the capacity-interpolation and aux-heat relations, `editionNote` naming the AHRI 210/240
low-temperature rating points and the linear interpolation with the use-published-cold-data / Manual-J-load / defrost /
sizing-check caveats); `test/fixtures/worked-examples.json` (the cold-design example + the mild-climate cross-check);
`test/fixtures/compute-map.js` (`heat-pump-cold-capacity` -> `computeHeatPumpColdCapacity` in `../../calc-hvac.js`);
`scripts/related-tiles.mjs` (-> `balance-point` / `heat-pump-seasonal-energy` / `dual-fuel-balance-point`);
`data/search/aliases.json` ("heat pump cold capacity", "auxiliary heat sizing", "backup heat strips", "heat pump design
temperature", "capacity derate cold", "cold climate heat pump", "aux heat kw", "heat pump 17 degree capacity"); the id
appended to the existing hvac renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, capacity / load <= 0,
equal rating temperatures, the covers-with-no-shortfall path, the clamp-to-zero deep-cold path). Raise the
`calc-hvac.js` size cap or split the module if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the covers-with-no-aux path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the slope / design-capacity / shortfall / aux-kW stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (36k/22k at 5 F, 30k load -> 16,400 Btu/h,
3.99 kW aux).

## 5. Roadmap position

Closes the heat-pump heating-mode batch (v233..v235). Supplies the cold-temperature capacity and the COP-vs-temperature
context that `dual-fuel-balance-point` (v234) maps to a switchover temperature, checks that the unit meets the design
load the seasonal energy in `heat-pump-seasonal-energy` (v233) assumes, and complements the thermal `balance-point`. A
published-low-temperature-data-point mode (using a manufacturer's rated 5 deg F capacity instead of extrapolating) and a
defrost-and-cycling field-capacity derate are deliberate future follow-ons.
