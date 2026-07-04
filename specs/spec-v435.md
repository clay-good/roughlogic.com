# roughlogic.com Specification v435 -- PV Maximum System Voltage (Cold Temperature, NEC 690.7) (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of an NEC 690/705 PV-electrical trio (v435 max system voltage -> v436 PV
> conductor sizing -> v437 interconnection 120% rule). The catalog sizes PV strings and output (`pv-string-fusing`,
> `pv-performance-ratio`, energy yield) but never the cold-temperature maximum system voltage that sets the string length and
> the equipment voltage rating.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A PV module's open-circuit voltage rises as it gets
> colder, so the maximum system voltage occurs at the record-low ambient, not at standard test conditions. NEC 690.7 requires
> `Vmax = Voc * N_series * [1 + beta*(Tmin - 25)]`, where `beta` is the module's `Voc` temperature coefficient (percent per
> deg C, negative) and `Tmin` the lowest expected ambient (deg C); this must stay under the `600 V` (dwelling), `1000 V`, or
> `1500 V` limit. No tile does this. This adds the max-voltage tile to the existing **`calc-solar.js`** module (Group A); no
> new group, trade, or dependency. Inherits spec.md through spec-v434.md.
>
> **The gap, and the evidence for it.** Ten modules of `40 V` `Voc` in series with a `-0.29%/deg C` coefficient at a record
> low of `-10 deg C` reach `Vmax = 40 * 10 * [1 + (-0.0029)*(-10 - 25)] = 400 * 1.1015 = 440.6 V` -- comfortably under the
> `600 V` dwelling limit, so ten in series is fine. Add three more modules and the string would exceed `600 V` in the cold,
> which is exactly the failure a summer-only check misses. No tile does the cold-voltage correction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The module `Voc` is a voltage
(V); the series count is dimensionless; the temperature coefficient is a per-degree fraction; the low temperature is a
temperature (deg C); the maximum system voltage is a voltage (V). The v18/v21 contract: any non-finite input, or a
non-positive `Voc` or series count, returns `{ error }`; the coefficient is entered as a negative fraction (or percent), and
the tile reports the corrected maximum voltage and whether it clears the selected limit. Citation discipline (v19/v22):
`GOVERNANCE.general` over the NEC 690.7 maximum voltage by name; `editionNote` names **NEC 690.7, the cold-temperature
correction `Vmax = Voc * N_series * [1 + beta*(Tmin - 25 deg C)]`, `beta` the module `Voc` temperature coefficient (percent
per deg C, negative), `Tmin` the ASHRAE extreme-minimum ambient, and the `600/1000/1500 V` system-voltage limits -- NEC text
quoted per the CF-01 disclosure**, and states that **this returns the cold-temperature maximum system voltage for series
string sizing, that `Tmin` and `beta` come from the site ASHRAE data and the module datasheet, and that it is a design aid,
not a substitute for the AHJ**.

## 2. The tile

### 2.1 `pv-max-system-voltage` -- PV Maximum System Voltage (Cold Temperature, NEC 690.7)

```
inputs:
  voc_v        V     module open-circuit voltage (STC)
  n_series     -     modules in series
  beta_per_c   -     Voc temperature coefficient (per deg C, negative, e.g. -0.0029)
  tmin_c       C     record low ambient temperature
  limit_v      V     system voltage limit (600 dwelling / 1000 / 1500)

vmax = voc_v * n_series * (1 + beta_per_c * (tmin_c - 25))
ok   = vmax <= limit_v
```

**Pinned worked example (40 V Voc, 10 series, -0.0029/deg C, -10 deg C, 600 V limit).**
`Vmax = 40*10*[1 + (-0.0029)*(-10 - 25)] = 400*1.1015 = 440.6 V`; under `600 V` -> OK. **Cross-check (colder site).** At a
`-25 deg C` low the same string reaches `458 V`, still under `600 V`; but a `13`-module string would exceed it. A
non-positive `Voc` or series count takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `pv-string-fusing`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, NEC 690.7, `editionNote` naming the cold-voltage correction, the
coefficient/`Tmin`, and the voltage limits -- NEC text per CF-01); `test/fixtures/worked-examples.json` (the -10 deg C
example + the -25 deg C cross-check); `test/fixtures/compute-map.js` (`pv-max-system-voltage` ->
`computePvMaxSystemVoltage` in `../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `pv-string-fusing` /
`pv-conductor-sizing` / `pv-performance-ratio` / `pv-string-voltage`); `data/search/aliases.json` ("pv max system voltage",
"cold temperature voc", "690.7", "string voltage sizing", "voc temperature correction", "max pv voltage", "solar string
voltage", "coldest temperature voltage", "600v pv string"); the id appended to the existing solar renderers block in
`app.js`; the `// dims:` annotation (voltages V, coefficient dimensionless, temp temperature); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the limit check, and the non-positive / non-finite error
seams. No new module; re-pin `calc-solar.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+2 fixtures, the new fuzzer block, the limit check, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Vmax / OK output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (40 V, 10 series, -10 C -> 440.6 V).

## 5. Roadmap position

Opens the NEC 690/705 PV-electrical trio: `pv-conductor-sizing` (v436) sizes the wire and `pv-interconnection-120-rule`
(v437) checks the point of connection. A string-length solver (max modules under the voltage limit) is the deliberate next
follow-on.
