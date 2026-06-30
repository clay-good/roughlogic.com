# roughlogic.com Specification v222 -- PV Inter-Row Spacing and Ground-Coverage Ratio (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v221..v223 (the PV system-design trio -- production, row spacing, and
> inverter match). This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the row layout is set in the field by the solar
> crew laying out a ground mount or a flat-roof ballasted array. Adds one tile to **`calc-solar.js`** (Group A); no new
> module, group, or dependency. Inherits spec.md through spec-v221.md.
>
> **The gap, and the evidence for it.** On any tilted array that is not flush to a sloped roof -- a ground mount, a
> carport, a ballasted flat roof -- the rows shade each other, and the spacing between them is a real design decision
> with a real trade-off: pack the rows tight and you fit more kilowatts on the lot but each row steals morning and
> afternoon sun from the one behind it; spread them out and every panel runs clean but the array sprawls. The geometry
> is fixed and closed-form: the row pitch is the panel's horizontal footprint plus the shadow its top edge throws at the
> lowest sun angle the designer will tolerate, and the ground-coverage ratio (collector length over pitch) is the number
> that drives both the land area and the inter-row shading loss. The catalog has `solar-times` for the sun's position
> but nothing that turns a tilt and a winter-sun angle into a row pitch, so a crew laying out a ground mount has no way
> to set the rows without a rule of thumb.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The module slope length,
the row rise, the row footprint, the shadow length, and the row pitch are a length (`L`, ft); the tilt angle and the
minimum solar profile angle are carried as `dimensionless` (degrees -- the dims lint has no angle base, matching the
existing trig tiles); the ground-coverage ratio is `dimensionless`. The v18/v21 contract: any non-finite input, a
non-positive module length, a tilt outside 0 to 90, or a minimum profile angle outside 0 (exclusive) to 90 -- a profile
angle of zero is a sun on the horizon, which throws an infinite shadow and has no finite pitch -- returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the row-geometry relations by name; `editionNote` names the
**NREL / Sandia PV array row-spacing geometry** (`pitch = L*cos(tilt) + L*sin(tilt)/tan(profile_angle)`,
`GCR = L / pitch`), and states that **the minimum solar profile angle is the winter-design sun elevation at the site
(commonly the solar altitude at 9 a.m. to 3 p.m. on the winter solstice, read from the latitude or from `solar-times`),
the relation assumes due-south rows and a level field (an azimuth offset or a graded slope is a separate correction),
and this is the no-shadow layout geometry, not an annual inter-row shading-loss model** -- a field layout aid, not a
ray-traced yield study.

## 2. The tile

### 2.1 `pv-row-spacing` -- Inter-Row Pitch and Ground-Coverage Ratio

```
inputs:
  module_length_ft  L              collector slope length up the tilt (module or stacked rows), ft
  tilt_deg          dimensionless  array tilt from horizontal, degrees (0-90)
  profile_angle_deg dimensionless  minimum solar profile angle to keep rows unshaded, degrees (winter design sun)

rise_ft     = module_length_ft * sin(tilt_deg)               # height of the row's top edge above its base
base_ft     = module_length_ft * cos(tilt_deg)               # horizontal footprint of the tilted row
shadow_ft   = rise_ft / tan(profile_angle_deg)               # shadow cast beyond the base at the design sun angle
pitch_ft    = base_ft + shadow_ft                            # front-of-row to front-of-next-row spacing
gap_ft      = shadow_ft                                       # clear gap between the back of one row and the next
gcr         = module_length_ft / pitch_ft                    # ground-coverage ratio (collector / pitch)
```

**Pinned worked example (30-degree ground mount, 22-degree winter sun).** A row of modules 6.5 ft along the slope, tilted
30 degrees, laid out to stay unshaded down to a 22-degree solar profile angle: `rise = 6.5 * sin(30) = 6.5 * 0.5 = 3.25
ft`; `base = 6.5 * cos(30) = 6.5 * 0.8660 = 5.63 ft`; `shadow = 3.25 / tan(22) = 3.25 / 0.4040 = 8.04 ft`;
`pitch = 5.63 + 8.04 = 13.67 ft`; `gcr = 6.5 / 13.67 = ` **0.475** (a 13.67 ft row pitch, an 8.0 ft clear gap).
**Cross-check (shallow 10-degree tilt, same winter sun).** Drop the tilt to 10 degrees on the same 6.5 ft module and
22-degree design angle: `rise = 6.5 * sin(10) = 1.13 ft`; `base = 6.5 * cos(10) = 6.40 ft`;
`shadow = 1.13 / tan(22) = 2.79 ft`; `pitch = 6.40 + 2.79 = 9.19 ft`; `gcr = 6.5 / 9.19 = ` **0.707**. The shallower
tilt throws a far shorter shadow, so the rows pack from a 0.475 to a 0.707 ground-coverage ratio -- nearly 50 percent
more kilowatts on the same field. That is the layout trade-off in one number: a low tilt fits more array but each panel
collects less, and a steep tilt collects more per panel but demands the land to spread out.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["solar","electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the row-geometry relations, `editionNote` naming the NREL/Sandia row-spacing geometry with
the profile-angle-from-winter-sun / due-south-level / not-a-shading-model caveats); `test/fixtures/worked-examples.json`
(the 30-degree example + the shallow-tilt cross-check); `test/fixtures/compute-map.js` (`pv-row-spacing` ->
`computePvRowSpacing` in `../../calc-solar.js`); `scripts/related-tiles.mjs` (-> `solar-times` / `pv-energy-yield` /
`pv-string-sizing`); `data/search/aliases.json` ("row spacing", "inter-row spacing", "ground coverage ratio", "gcr",
"pv layout", "panel shading", "row pitch", "solar field spacing"); the id appended to the existing solar renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples and error seams (non-finite, module length <= 0, tilt out of 0 to 90, profile angle out of 0
exclusive to 90). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the horizon-sun error path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the rise / base / shadow / pitch / GCR stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (6.5 ft / 30 deg / 22 deg -> 13.67 ft pitch, 0.475 GCR).

## 5. Roadmap position

The middle of the PV system-design batch (v221..v223). Consumes the winter-sun profile angle that `solar-times`
produces, and its ground-coverage ratio bounds the inter-row shading loss that the performance ratio in `pv-energy-yield`
(v221) budgets for. An azimuth-offset correction and a graded-slope (north/south tilt of the field) sub-mode are
deliberate future follow-ons.
