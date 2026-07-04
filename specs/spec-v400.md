# roughlogic.com Specification v400 -- Cone Flat-Pattern Development (Radial Line) (calc-shop.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.140.0; proposed 2026-07-03). Second tile of the fabrication shop-math trio (v399 tolerance stack -> v400 cone flat
> pattern -> v401 spur-gear geometry). `rolled-blank` develops a cylinder to a straight rectangle; a cone develops to a flat
> sector, a completely different layout the catalog cannot produce.**
> In-scope catalog expansion under the spec-v106 trades-only charter. To cut a flat blank that rolls into a right cone (a
> funnel, a cone roof cap, a transition), you develop it by radial-line: the slant height `L = sqrt(R^2 + h^2)` becomes the
> pattern radius, and the flat pattern is a sector whose arc equals the cone's base circumference, so the included sweep
> angle is `theta = 360 * R / L`. `rolled-blank` only handles the cylinder case (`length = pi * D`, a straight strip); a cone
> needs the sector development. This adds the cone tile to the existing **`calc-shop.js`** module (Group G); no new group,
> trade, or dependency. Inherits spec.md through spec-v399.md.
>
> **The gap, and the evidence for it.** A right cone with base radius `R = 6 in` and height `h = 8 in` has slant height
> `L = sqrt(6^2 + 8^2) = 10 in`, so the flat pattern is a sector of radius `10 in` swept `theta = 360 * 6 / 10 = 216 deg`.
> Lay out a `10 in` radius, strike a `216 deg` arc, and rolling it closes into the cone. No tile does this; a sheet-metal
> worker who could develop a cylinder with `rolled-blank` had to lay out a cone by hand or trig.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The base radius `R` and the
vertical height `h` are lengths (in); the slant height and pattern radius are lengths (in); the sweep angle is an angle
(deg, handled dimensionlessly per the v14 no-`angle`-base rule). The v18/v21 contract: any non-finite input, or a
non-positive radius or height, returns `{ error }`; the tile develops a full right cone by default (apex included) and
reports the slant height, the pattern radius, and the sector sweep angle, with a note on the frustum (truncated) case.
Citation discipline (v19/v22): `GOVERNANCE.general` over radial-line cone development by name; `editionNote` names **the
SMACNA / Machinery's Handbook radial-line development, the slant height `L = sqrt(R^2 + h^2)`, the flat-pattern sector radius
`= L`, and the sweep angle `theta = 360 * R / L` (the sector arc equals the base circumference `2*pi*R`)**, and states that
**this returns the flat blank for a full right cone, that a frustum develops as an annular sector between two apex radii,
that seam allowance and metal thickness are added separately, and that it is a layout aid, not a substitute for a nested CAD
flat pattern**.

## 2. The tile

### 2.1 `cone-flat-pattern` -- Cone Flat-Pattern Development (Radial Line)

```
inputs:
  base_radius_in   in   cone base radius
  height_in        in   vertical height (apex to base plane)

slant_L_in     = sqrt(base_radius_in^2 + height_in^2)
pattern_radius = slant_L_in
sweep_deg      = 360 * base_radius_in / slant_L_in
```

**Pinned worked example (R 6 in, h 8 in).** `L = sqrt(36 + 64) = 10 in`; pattern radius `10 in`;
`sweep = 360*6/10 = 216 deg`. **Cross-check (a taller, sharper cone).** `R 6 in`, `h 16 in`: `L = sqrt(36+256) = 17.09 in`;
`sweep = 360*6/17.09 = 126.4 deg` -- a sharper cone opens to a narrower sector. A non-positive radius or height takes the
error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["sheet-metal", "fabrication"]`, beside `rolled-blank`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, radial-line cone development, `editionNote` naming `L = sqrt(R^2+h^2)`,
the sector radius, and `theta = 360*R/L`); `test/fixtures/worked-examples.json` (the 6-8-10 example + the tall-cone
cross-check); `test/fixtures/compute-map.js` (`cone-flat-pattern` -> `computeConeFlatPattern` in `../../calc-shop.js`);
`scripts/related-tiles.mjs` (-> `rolled-blank` / `circular-arc` / `tolerance-stack-rss` / `circle-from-3-points`);
`data/search/aliases.json` ("cone flat pattern", "cone development", "cone layout", "radial line development", "cone
template", "sheet metal cone", "sector angle cone", "frustum development", "cone blank"); the id appended to the existing
shop renderers block in `app.js`; the `// dims:` annotation (radius/height/slant length, sweep dimensionless); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the slant-height relation, and the
non-positive / non-finite error seams. No new module; re-pin `calc-shop.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the slant / radius / sweep output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (R 6, h 8 -> L 10 in, 216 deg).

## 5. Roadmap position

The middle of the fabrication shop-math trio: `tolerance-stack-rss` (v399) sets the fit and `spur-gear-geometry` (v401) lays
out teeth, both shop layout like this cone development. A truncated-cone (frustum) annular-sector development and a
transition (square-to-round) triangulation tile are the deliberate next follow-ons.
