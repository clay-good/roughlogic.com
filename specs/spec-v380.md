# roughlogic.com Specification v380 -- Shrinkage and Temperature Reinforcement (ACI 318-19 24.4) (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.133.0; proposed 2026-07-03). Third and final tile of the concrete-material-properties trio (v378 Ec -> v379 modulus
> of rupture -> v380 shrinkage/temperature steel). The catalog sets slab thickness for deflection (`rc-slab-min-thickness`)
> and computes flexural steel (`rc-beam-flexure`), but never the minimum shrinkage-and-temperature reinforcement a one-way
> slab needs in the direction perpendicular to the main bars.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Concrete shrinks as it cures and moves with
> temperature; without a minimum steel ratio in the non-structural direction it cracks widely. ACI 318-19 §24.4.3.2 sets the
> minimum shrinkage-and-temperature reinforcement ratio at `0.0018` of the gross concrete area for Grade 60 deformed bars
> (`0.0020` for Grade 40/50, and never less than `0.0014`), and §24.4.3.3 caps the bar spacing at the lesser of `5h` or
> `18 in`. This adds the minimum-reinforcement tile to the existing **`calc-concrete.js`** module (Group E); no new group,
> trade, or dependency. Inherits spec.md through spec-v379.md.
>
> **The gap, and the evidence for it.** For a `6 in` one-way slab, per `12 in` design strip, `Ag = 12 * 6 = 72 in^2` and the
> Grade 60 minimum is `As = 0.0018 * 72 = 0.130 in^2/ft` -- about `#4 at 18 in` or `#3 at 10 in`. The maximum spacing is the
> lesser of `5h = 30 in` and `18 in`, so `18 in` governs. Grade 40/50 raises the ratio to `0.0020` and `As = 0.144 in^2/ft`.
> No tile computes this; a slab designed only with `rc-slab-min-thickness` and `rc-beam-flexure` is missing the transverse
> steel that keeps it from cracking.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The slab thickness `h` and
the design-strip width `b` are lengths (in); the reinforcement ratio is dimensionless; the minimum area `As,min` is an area
(in^2, reported per strip and per foot); the maximum spacing is a length (in). The v18/v21 contract: any non-finite input,
or a non-positive `h` or `b`, returns `{ error }`; the reinforcement ratio is chosen from the grade (`0.0018` for Grade 60,
`0.0020` for Grade 40/50) with the `0.0014` floor enforced. Citation discipline (v19/v22): `GOVERNANCE.general` over the ACI
shrinkage-and-temperature provision by name; `editionNote` names **ACI 318-19 §24.4.3.2, the minimum ratios `0.0018`
(Grade 60), `0.0020` (Grade 40/50), the `0.0014` floor, `As,min = ratio * b * h` on the gross section, and the §24.4.3.3
maximum spacing of the lesser of `5h` and `18 in`**, and states that **this returns the minimum shrinkage-and-temperature
reinforcement for a one-way slab in the direction perpendicular to the flexural steel, that it is a minimum (structural
demand may govern), and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `concrete-shrinkage-temperature-steel` -- Shrinkage and Temperature Reinforcement (ACI 318-19)

```
inputs:
  h_in      in   slab thickness
  b_in      in   design strip width (default 12)
  grade_ksi ksi  reinforcement grade (60 -> 0.0018; 40 or 50 -> 0.0020)

ratio       = (grade_ksi >= 60) ? 0.0018 : 0.0020     (never below 0.0014)
as_min_in2  = ratio * b_in * h_in                      in^2 (per strip)
s_max_in    = min(5 * h_in, 18)                         in
```

**Pinned worked example (6 in slab, 12 in strip, Grade 60).** `Ag = 12 * 6 = 72 in^2`;
`As,min = 0.0018 * 72 = 0.130 in^2/ft`; `s_max = min(5*6, 18) = min(30, 18) = 18 in` -- roughly `#4 at 18 in`.
**Cross-check (Grade 40/50).** The ratio rises to `0.0020` and `As,min = 0.0020 * 72 = 0.144 in^2/ft`; the spacing cap is
unchanged. A thin `3 in` slab gives `s_max = min(15, 18) = 15 in`, where `5h` governs instead of the `18 in` cap. The
non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`, beside `rc-slab-min-thickness` / `concrete-modulus-of-rupture`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ACI 318-19 §24.4, `editionNote` naming the
`0.0018`/`0.0020`/`0.0014` ratios, `As,min = ratio*b*h`, and the lesser-of-`5h`-or-`18 in` spacing);
`test/fixtures/worked-examples.json` (the Grade 60 example + the Grade 40/50 cross-check + the thin-slab spacing case);
`test/fixtures/compute-map.js` (`concrete-shrinkage-temperature-steel` -> `computeConcreteShrinkageTemperatureSteel` in
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `rc-slab-min-thickness` / `concrete-modulus-of-rupture` /
`rc-beam-flexure` / `rebar-lap-splice`); `data/search/aliases.json` ("shrinkage temperature steel", "temperature and
shrinkage reinforcement", "minimum slab steel", "0.0018 ag", "s and t reinforcement", "slab minimum reinforcement", "aci
24.4", "distribution steel slab", "transverse slab steel"); the id appended to the existing concrete renderers block in
`app.js`; the `// dims:` annotation (h/b/spacing length, ratio dimensionless, area area); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the three cases, the grade ratio selection, the `5h`-vs-`18 in`
governing switch, and the non-positive / non-finite error seams. No new module; re-pin `calc-concrete.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+3 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the `As,min` / `s_max` pair wraps on a phone); render-no-nan +
a11y sweep, output read to the value (6 in / Grade 60 -> 0.130 in^2/ft, 18 in).

## 5. Roadmap position

Closes the concrete-material-properties trio: v378 stiffness, v379 cracking stress, v380 minimum shrinkage/temperature
steel. Together with `rc-slab-min-thickness` they complete a one-way-slab first pass (thickness, main steel, transverse
minimum). An ACI 318 §24.2 deflection tile consuming `Ec` and `fr`, and a maximum-crack-control-spacing tile (§24.3.2), are
the deliberate next follow-ons.
