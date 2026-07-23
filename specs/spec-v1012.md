# roughlogic.com Specification v1012 -- Window Overhang Shading (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-23). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C), no new module, group, or dependency. Inherits spec.md through spec-v1011.md. The shading companion to
> `window-solar-heat-gain`.
>
> **The gap, and the evidence for it.** `window-solar-heat-gain` names its omission in both its note and its citation:
> "Interior shades and overhangs reduce the solar term by a separate shade factor." Nothing computed that factor.
> Alias-index (0 hits across eight probes -- `shade line`, `sun control`, `awning`, `window shading`, `external shade`,
> `fin shade`, `sunlit fraction`, `solar profile`; the 16 `overhang` aliases are all structural or machining),
> compute-map, and nearest-sibling-output checks confirmed no coverage: `computeWindowSolarHeatGain` takes
> `{area_ft2, shgc, psf, u_factor, cltd_f}` and returns `{q_solar, q_cond, q_total}` -- no shade input, no shade
> output. The number this settles: whether the eave you already have actually shades the glass in August.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a negative projection or gap, a non-positive glass
height, or an out-of-range angle returns `{ error }`. A sun below the horizon or behind the wall plane is a valid
PHYSICAL result, not an error: it returns `direct_sun: false` with a zero sunlit fraction and null angles. Citation
discipline (v19/v22): the ASHRAE Handbook-Fundamentals (Fenestration) / ACCA Manual J profile-angle (shade-line)
method by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `window-overhang-shade` -- Window Overhang Shading (Profile Angle and Shade Line)

```
inputs:
  projection_in                overhang projection beyond the wall (in)
  gap_in                       overhang underside down to the glass top (in)
  glass_height_in              glass height (in)
  solar_altitude_deg           sun altitude above the horizon (deg)
  surface_solar_azimuth_deg    horizontal angle sun-to-wall-normal (deg, 0 = straight on)

direct_sun        = altitude > 0 AND |surface-solar azimuth| < 90
tan(profile)      = tan(altitude) / cos(surface-solar azimuth)
shade_line_in     = projection_in x tan(profile)
shaded_height_in  = clamp(shade_line_in - gap_in, 0, glass_height_in)
sunlit_fraction   = 1 - shaded_height_in / glass_height_in
```

**Derivation, not a lookup.** Taking the wall's outward normal as x, the sun direction is
`(cos a cos g, cos a sin g, sin a)` for altitude `a` and surface-solar azimuth `g`. Projecting onto the vertical plane
normal to the wall leaves components `(cos a cos g, sin a)`, so
`tan(profile) = sin a / (cos a cos g) = tan a / cos g`. ASHRAE tabulates shade-line factors by latitude and
orientation; computing the angle from the entered sun position **sidesteps that table entirely**, so no remembered
tabulated constant enters the tile. Sanity check built into the fuzzer: at `g = 0` the profile angle equals the solar
altitude exactly, for every altitude tested.

**Pinned worked example.** 24 in overhang, 6 in gap, 48 in glass, 70 deg summer sun straight on: profile angle
**70 deg**, shade line `24 tan 70 = ` **65.94 in**, which is past `6 + 48`, so the window is **fully shaded**
(sunlit fraction **0**). Cross-check at a 30 deg winter sun, same geometry: shade line `24 tan 30 = ` **13.86 in**,
shaded **7.86 in** of 48, leaving **83.6% sunlit**. That seasonal swing with no moving parts is the entire reason a
fixed overhang works.

**Scope disclosure carried in the output text.** This is the **direct-beam** sunlit fraction. Shaded glazing still
receives diffuse sky and ground-reflected radiation, so multiplying a TOTAL solar gain by this fraction overstates the
reduction; it applies to the beam component. Also assumes an overhang wide enough that end effects are negligible, no
side fins, and no adjacent obstructions.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "construction"]`, beside `window-solar-heat-gain`); a
`tile-meta.js` `_TILES` entry (`C`); a `citations.js` entry (four assumptions, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the summer fully-shaded case plus the winter cross-check);
`test/fixtures/compute-map.js` (`window-overhang-shade` -> `computeWindowOverhangShade`);
`scripts/related-tiles.mjs` (-> `window-solar-heat-gain` / `solar-times` / `manual-j-cooling` /
`envelope-conduction-load`); `data/search/aliases.json` (5 collision-checked search aliases plus 4 question-corpus
phrases), then `node scripts/build-alias-shards.mjs`; a hand-written renderer registered in `HVACSYSTEMS_RENDERERS`
(the module's convention); the id added to the calc-hvacsystems declare list in `app.js`; the `// dims:` annotation
directly above the compute; a `bounds-fuzzer.test.js` block pinning both examples, the profile-angle-equals-altitude
identity at normal incidence across four altitudes, the off-normal increase, the deeper-overhang and no-overhang
directions, all four no-direct-sun branches, and the error seams; regenerated v14 corpus + tile-index +
citation-strings. Home tile count 1,460 -> 1,461.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
worked-examples runner; render + output read to the value (24 in overhang, 70 deg sun -> 70 deg profile, 65.94 in
shade line, fully shaded).

## 5. Roadmap position

Pairs with `window-solar-heat-gain` to close the fenestration cooling-load path, and with `solar-times` (which
supplies the sun position) to make the overhang question answerable end to end. Serves the HVAC designer and the
builder sizing an eave. Deliberately the beam-geometry screen; diffuse radiation, side fins, interior shades, adjacent
obstructions, and the full Manual J stay separate. Fifth tile landed by reading an existing tile's self-declared
limitations -- see spec-v1008 through spec-v1011.
