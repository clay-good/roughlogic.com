# roughlogic.com Specification v352 -- PV Source-Circuit Fuse Sizing (NEC 690.9) (calc-solar.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.123.0). Batch spec-v350..v352 (the PV design trio -- cell-temperature power
> (v350), performance ratio (v351), the source-circuit fuse sizing (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pv-circuit-ampacity` sizes the PV conductor and
> `pv-interconnection-busbar` handles the 120% interconnection rule, but the series overcurrent fuse that protects each PV
> source circuit -- the string fuse sized at 156% of `Isc` and capped by the module's maximum series-fuse rating -- is the
> NEC 690.9 check the catalog does not make. Adds one tile to the existing **`calc-solar.js`** module (Group A); no new
> group, trade, or dependency. Inherits spec.md through spec-v351.md.
>
> **The gap, and the evidence for it.** NEC 690.9(B) sizes the PV source-circuit overcurrent device at not less than 125%
> of 125% of the short-circuit current -- `1.56 x Isc` -- rounded up to a standard rating, and 690.9(B) also requires it to
> be no greater than the module's maximum series fuse rating (from the module label). For a module with `Isc = 10 A` and a
> 20 A maximum series fuse, the required fuse is `1.56 x 10 = 15.6 A`, rounded to a 20 A standard size, which is within the
> 20 A module maximum -- so a 20 A string fuse. Fuses are required once three or more source circuits are paralleled (two
> strings can back-feed a fault into one). This is the string protection a plan reviewer checks; the ampacity tile sizes the
> wire, this tile sizes its fuse.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The module short-circuit
current `Isc`, the required and selected fuse ratings, and the module maximum series-fuse rating are currents (A); the
number of paralleled source circuits is a dimensionless count. The v18/v21 contract: any non-finite input, or an `Isc` or
maximum fuse rating at or below zero, returns `{ error }`; a selected fuse exceeding the module maximum is flagged as
non-compliant. Citation discipline (v19/v22): `GOVERNANCE.general` over the NEC 690.9 PV overcurrent rules by name;
`editionNote` names **the NEC 2023 690.9(B) source-circuit fuse at `1.56 x Isc` (125% of 125%) rounded up to a 240.6
standard rating, the module maximum-series-fuse cap, and that overcurrent protection is required where three or more source
circuits are paralleled (a single or two-string circuit generally does not need it)**, and states that **this returns the
required and selected PV source-circuit fuse and its compliance with the module maximum -- it uses the module `Isc` and the
label's maximum series fuse, applies the standard-size round-up, and does not size the conductor ampacity
(`pv-circuit-ampacity`), the inverter output OCPD, or the DC combiner/disconnect; and this is a design aid, not a substitute
for the AHJ** -- the authority having jurisdiction governs.

## 2. The tile

### 2.1 `pv-string-fusing` -- PV Source-Circuit Fuse Sizing (NEC 690.9)

```
inputs:
  Isc_A       A    module short-circuit current
  max_fuse_A  A    module maximum series fuse rating (from the label)
  n_strings   -    number of paralleled source circuits

req_A = 1.56 * Isc_A                                ; minimum OCPD, A
fuse_A = smallest 240.6 standard rating >= req_A   ; selected fuse
compliant = fuse_A <= max_fuse_A
fuse_required = (n_strings >= 3)                     ; per 690.9
```

240.6(A) standard ratings apply (10, 15, 20, 25, 30, ...). **Pinned worked example (Isc 10 A, 20 A module max, 4 strings).**
`req = 1.56 x 10 = 15.6 A`; the smallest standard rating at or above is `20 A`; `20 <= 20` module maximum, so a **20 A**
string fuse, and with 4 paralleled strings fuses are required. **Cross-check (a higher-current module, Isc 14 A, 25 A
max).** `req = 1.56 x 14 = 21.8 A` -> a `25 A` standard fuse, within the 25 A module maximum. But had the module maximum
been 20 A, the 25 A required fuse would exceed it -- non-compliant, forcing fewer strings per combiner or a different
module, the trap the label check catches. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar","electrical"]`, matching `pv-circuit-ampacity`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NEC 690.9 rules, `editionNote` naming `1.56 x Isc`, the
240.6 round-up, the module-maximum cap, the three-string threshold, and the not-conductor, AHJ-governs caveats);
`test/fixtures/worked-examples.json` (the compliant example + the label-cap cross-check); `test/fixtures/compute-map.js`
(`pv-string-fusing` -> `computePvStringFusing` in `../../calc-solar.js`); `scripts/related-tiles.mjs` (->
`pv-circuit-ampacity` / `pv-interconnection-busbar` / `pv-string-sizing` / `continuous-load-ocpd`);
`data/search/aliases.json` ("PV string fuse", "source circuit fuse", "NEC 690.9", "156 percent Isc", "PV overcurrent",
"module series fuse", "combiner fuse", "string fuse sizing", "solar fuse"); the id appended to the existing solar renderers
block in `app.js`; the `// dims:` annotation (`Isc`/fuse currents current, `n_strings` dimensionless); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `1.56 Isc` and round-up, the module-maximum
compliance flag, the three-string requirement, and the non-positive / non-finite error seams. Use an ordered array of
standard ratings (smallest first). No new module; re-pin `calc-solar.js` on the `check:module-sizes` allowlist. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the round-up and module-cap assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `req` / selected fuse /
compliant stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (Isc 10 -> 15.6 A req, 20 A fuse).

## 5. Roadmap position

Closes the PV design batch (v350..v352) in `calc-solar.js`: cell-temperature power, performance ratio, and source-circuit
fusing round out the module-performance and protection tiles beside the string, ampacity, and interconnection tiles. The
inverter-output OCPD, the DC combiner/disconnect sizing, and a full 690.9 source-to-inverter overcurrent summary are the
deliberate next follow-ons once the trio lands.
