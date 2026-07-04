# roughlogic.com Specification v436 -- PV Circuit Conductor Sizing (NEC 690.8) (calc-solar.js, Group A, 1 New Tile)

> **Status: CUT (2026-07-04, dupe of existing tile). NOT LANDED: the NEC 690/705 PV trio duplicates existing PV tiles -- v435 pv-max-system-voltage overlaps pv-string-sizing (cold-Voc max-series, NEC 690.7); v436 pv-conductor-sizing is an exact duplicate of pv-circuit-ampacity (NEC 690.8 156% rule); v437 pv-interconnection-120-rule is an exact duplicate of pv-interconnection-busbar (NEC 705.12 120% busbar rule). The PV/NEC-690 space (10+ tiles) is heavily built out; this trio was proposed without a dupe-check. Caught by a pre-implementation dupe-check. Original proposal below. Second tile of the NEC 690/705 PV-electrical trio (v435 max system voltage ->
> v436 PV conductor sizing -> v437 interconnection 120% rule). `ampacity` and `voltage-drop` are general electrical tiles;
> PV circuits carry a special double `125%` factor that no tile applies -- the reason PV wire always looks oversized.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A PV source or output circuit is sized on two stacked
> `125%` factors: NEC 690.8(A) sets the maximum circuit current at `1.25 * Isc` (the module short-circuit current, allowing
> for irradiance above STC), and 690.8(B) then requires the conductor ampacity to be at least `1.25 *` that continuous
> current, so the minimum ampacity is `1.5625 * Isc` before any temperature or conduit-fill derating. General ampacity tiles
> miss the PV-specific stacking. This adds the PV-conductor tile to the existing **`calc-solar.js`** module (Group A); no new
> group, trade, or dependency. Inherits spec.md through spec-v435.md.
>
> **The gap, and the evidence for it.** A string with `Isc = 10 A` has a maximum circuit current of `1.25 * 10 = 12.5 A`
> (690.8(A)), and the conductor must have an ampacity of at least `1.25 * 12.5 = 15.6 A` (690.8(B)) before derating -- so a
> `10 A` string still needs wire rated past `15 A`. Apply a rooftop temperature derate and the required base ampacity climbs
> further. No tile does this; a designer used the generic ampacity rule and undersized the PV wire.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The short-circuit current is a
current (A, dim I); the maximum circuit current and the minimum conductor ampacity are currents (A); an optional derate
factor is dimensionless. The v18/v21 contract: any non-finite input, or a non-positive `Isc`, or a derate factor outside
`(0, 1]`, returns `{ error }`; the tile reports the `690.8(A)` maximum circuit current and the `690.8(B)` minimum ampacity,
and divides by a temperature/conduit derate when one is given (to get the required table ampacity). Citation discipline
(v19/v22): `GOVERNANCE.general` over the NEC 690.8 conductor sizing by name; `editionNote` names **NEC 690.8(A) maximum
circuit current `= 1.25 * Isc` and 690.8(B) conductor ampacity `>= 1.25 *` the maximum current (so `1.5625 * Isc` before
derating), the alternative `690.8(A)(1)(2)` for large arrays with monitoring, and the temperature/conduit-fill derates of
310.15 -- NEC text quoted per the CF-01 disclosure**, and states that **this returns the PV circuit maximum current and
minimum conductor ampacity, that temperature and conduit-fill derating still apply, and that it is a design aid, not a
substitute for the AHJ**.

## 2. The tile

### 2.1 `pv-conductor-sizing` -- PV Circuit Conductor Sizing (NEC 690.8)

```
inputs:
  isc_a       A    module/string short-circuit current (STC)
  derate      -    combined temperature + conduit-fill derate (optional, default 1.0)

max_current   = 1.25 * isc_a                       (690.8(A))
min_ampacity  = 1.25 * max_current                 (690.8(B); = 1.5625 * Isc)
required_table_ampacity = min_ampacity / derate
```

**Pinned worked example (Isc 10 A).** `max current = 1.25*10 = 12.5 A`; `min ampacity = 1.25*12.5 = 15.6 A`. **Cross-check
(rooftop derate).** With a combined `0.71` derate (high ambient plus conduit fill), the required table ampacity rises to
`15.6/0.71 = 22.0 A`, so the wire must be picked from the `90 deg C` column at that value. A non-positive `Isc` or an
out-of-range derate takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar", "electrical"]`, beside `pv-string-fusing` / `pv-max-system-voltage`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, NEC 690.8, `editionNote` naming the two `125%`
factors, the `1.5625*Isc` result, and the derating note -- NEC text per CF-01); `test/fixtures/worked-examples.json` (the
base example + the derated cross-check); `test/fixtures/compute-map.js` (`pv-conductor-sizing` -> `computePvConductorSizing`
in `../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `pv-string-fusing` / `pv-max-system-voltage` / `ampacity` /
`ambient-ampacity-adjust`); `data/search/aliases.json` ("pv conductor sizing", "690.8", "pv wire size", "1.56 isc", "solar
conductor ampacity", "pv circuit current", "125 percent pv", "solar wire sizing", "pv ampacity"); the id appended to the
existing solar renderers block in `app.js`; the `// dims:` annotation (currents I, derate dimensionless); regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the double-125% stacking, and the non-positive /
out-of-range / non-finite error seams. No new module; re-pin `calc-solar.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, CF-01 disclosure);
`npm test` (+2 fixtures, the new fuzzer block, the derate, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the max-current / min-ampacity output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (Isc 10 A -> 12.5 A, 15.6 A).

## 5. Roadmap position

The middle of the NEC 690/705 PV-electrical trio: `pv-max-system-voltage` (v435) sets the voltage and
`pv-interconnection-120-rule` (v437) the point of connection, while this sizes the conductor. A full temperature-and-
conduit-fill derate chain feeding the required table ampacity is the deliberate next follow-on.
