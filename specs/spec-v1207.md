# roughlogic.com Specification v1207 -- Coefficient of Consolidation cv from an Oedometer Curve (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1206.md.
>
> **The gap, and the evidence for it.** The `consolidation-time-rate` and `consolidation-degree` tiles both take the
> coefficient of consolidation `cv` as a required input, and both notes end with "the engineer of record and the
> site-specific cv from an oedometer test govern." Nothing in the catalog produced cv -- the strongest kind of gap: an
> input several tiles demand that no tile computes. cv is obtained from the oedometer (ASTM D2435) time-settlement curve
> by one of the two standard curve-fitting methods; this adds that step.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a method other than `casagrande`/`taylor`, a drainage other than
`double`/`single`, a non-positive fitting time, or a non-positive specimen height returns `{ error }`. Citation
discipline (v19/v22): the Terzaghi time factors (T50 = 0.197, T90 = 0.848) and the cv = Tv Hdr^2/t relation as compiled
in Das / Holtz-Kovacs / Terzaghi, by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** -- the two time
factors are standard soil-mechanics constants, and the fitting times t50/t90 are the user's own oedometer readings.

## 2. The tile

### 2.1 `coefficient-of-consolidation` -- Coefficient of Consolidation cv from Oedometer Curve

```
Tv   = 0.197 (Casagrande, t50)  or  0.848 (Taylor, t90)   theoretical time factor
Hdr  = H / 2 (two-way drainage)  or  H (one-way)           specimen drainage path (in)
cv   = Tv * Hdr^2 / t                                       coefficient of consolidation (in^2/min)
cv_ft2_day = cv_in2_min * 10                                (1 in^2/min = 10 ft^2/day)
cv_cm2_s   = cv_in2_min * (6.4516 / 60)                     (1 in^2 = 6.4516 cm^2, 1 min = 60 s)
```

**Inputs:** fitting `method` (`casagrande` log-time uses t50, `taylor` sqrt-time uses t90), the fitting time
`t_fit_min` (min), the specimen height `specimen_height_in` (in), and the specimen `drainage` (`double`/`single`).

**Outputs:** cv in `cv_ft2_day` (the unit the two consolidation-time tiles consume), `cv_in2_min` and `cv_cm2_s` (lab
units), the time factor `tv`, and the specimen drainage path `hdr_in`.

## 3. Worked example

`method = casagrande, t_fit_min = 5, specimen_height_in = 1.0, drainage = double`:

```
Hdr = 1.0 / 2 = 0.5 in
cv  = 0.197 * (0.5)^2 / 5 = 0.197 * 0.25 / 5 = 0.00985 in^2/min
    = 0.0985 ft^2/day = 1.0591e-3 cm^2/s
```

Read by Taylor's sqrt-time method instead (t90 = 20 min on the same curve): cv = 0.848 * 0.25 / 20 = 0.0106 in^2/min =
0.106 ft^2/day -- a touch higher, as Taylor's fit usually runs. One-way (single) drainage uses the full specimen height
for Hdr, which is 4x the cv of two-way drainage for the same fitting time.

## 4. Limitations

One load increment; cv varies with the stress level, so it is reported for several increments. The Hdr here is the small
TEST SPECIMEN's drainage path, not the field layer -- the field Hdr is what feeds `consolidation-time-rate` and
`consolidation-degree`. A design aid; the oedometer data and the geotechnical engineer of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1207` pins both methods (Tv 0.197/0.848), the drainage-path and unit conversions
  (single = 4x double, in^2/min -> ft^2/day and cm^2/s), the inverse-with-time and square-with-height scaling, the feed
  into `consolidation-time-rate`, and the error seams (bad method/drainage, non-positive time/height, non-finite).
- Two worked-example rows in `test/fixtures/worked-examples.json` (the Casagrande example and the Taylor cross-check).
- Formula checked against the standard oedometer curve-fitting relations (Das / Holtz-Kovacs / Terzaghi).
