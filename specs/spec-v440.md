# roughlogic.com Specification v440 -- Trim Linear Footage and Miters (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-04, 0.151.0; proposed 2026-07-03). Third and final tile of the interior-finish takeoff trio (v438 flooring plank ->
> v439 insulation batt -> v440 trim linear footage). The catalog has area and sheet takeoffs but never the linear-foot
> takeoff for baseboard, casing, and crown -- the running footage and stock pieces a trim carpenter orders and cuts.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Trim is ordered by the linear foot: the room perimeter
> less the door openings, plus a waste allowance, gives the net footage; dividing by the stock length gives the pieces. Each
> inside or outside corner is a `45 deg` miter (and crown adds a compound bevel from its spring angle). No tile does the trim
> takeoff. This adds the trim tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or
> dependency. Inherits spec.md through spec-v439.md.
>
> **The gap, and the evidence for it.** A room with a `70 ft` perimeter and `6 ft` of door openings needs
> `(70 - 6) * 1.10 = 70.4 ft` of baseboard at a `10%` waste allowance, or `ceil(70.4 / 16) = 5` sixteen-foot sticks. Its four
> inside corners are `45 deg` miters; run crown instead and each corner is a compound cut (for a `38 deg` spring angle,
> about a `31.6 deg` miter and `33.9 deg` bevel). No tile does this; a finish carpenter had the room size but not the trim
> footage, piece count, or miter angle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The perimeter and opening
lengths and the stock length are lengths (ft); the waste allowance is dimensionless (percent); the net footage is a length
(ft); the piece and corner counts are dimensionless; the miter and bevel are angles (deg, handled dimensionlessly per the
v14 no-`angle`-base rule). The v18/v21 contract: any non-finite input, or a non-positive perimeter or stock length, or
openings exceeding the perimeter, returns `{ error }`; the piece count is rounded up, and for crown a spring-angle input
returns the flat-miter compound-cut angles. Citation discipline (v19/v22): `GOVERNANCE.general` over the trim takeoff by
name; `editionNote` names **the net footage `= (perimeter - openings) * (1 + waste)`, the pieces `= net / stock_length`, the
`45 deg` inside/outside miter for baseboard/casing, and the crown compound-cut relation (miter `= atan(sin(spring)*tan(45))`,
bevel `= asin(cos(spring)*sin(45))`) with the common `31.6/33.9 deg` for a `38 deg` spring**, and states that **this returns
the trim linear footage, piece count, and corner cut angles, that outside corners and returns add waste, and that it is a
takeoff aid, not a substitute for a measured cut list**.

## 2. The tile

### 2.1 `trim-linear-footage` -- Trim Linear Footage and Miters

```
inputs:
  perimeter_ft   ft    room perimeter
  openings_ft    ft    total width of door openings (no trim below)
  waste_pct      %     waste allowance (default 10)
  stock_len_ft   ft    trim stock length (default 16)
  spring_deg     deg   crown spring angle (optional; 0 = baseboard/casing)

net_ft = (perimeter_ft - openings_ft) * (1 + waste_pct/100)
pieces = ceil(net_ft / stock_len_ft)
miter  = spring_deg > 0 ? atan(sin(spring)*tan(45deg)) : 45
bevel  = spring_deg > 0 ? asin(cos(spring)*sin(45deg)) : 0
```

**Pinned worked example (70 ft perimeter, 6 ft openings, 10% waste, 16 ft stock, baseboard).** `net = (70-6)*1.10 = 70.4 ft`;
`pieces = ceil(70.4/16) = 5`; inside corners are `45 deg` miters. **Cross-check (crown at 38 deg spring).** The same room in
crown gives the same `70.4 ft` but each corner is a compound cut of about `31.6 deg` miter and `33.9 deg` bevel. Openings
exceeding the perimeter, or a non-positive perimeter/stock, takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `board-footage` / `square-footage`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, trim takeoff, `editionNote` naming the net-footage, piece, and
miter/bevel relations); `test/fixtures/worked-examples.json` (the baseboard example + the crown cross-check);
`test/fixtures/compute-map.js` (`trim-linear-footage` -> `computeTrimLinearFootage` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `board-footage` / `square-footage` / `flooring-plank-layout` / `stairs`);
`data/search/aliases.json` ("trim footage", "baseboard calculator", "crown molding", "trim linear feet", "molding
takeoff", "casing footage", "crown compound miter", "trim pieces", "baseboard miter"); the id appended to the existing
construction renderers block in `app.js`; the `// dims:` annotation (lengths length, waste dimensionless, angles
dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the crown
compound cut, and the openings-exceed / non-positive / non-finite error seams. No new module; re-pin `calc-construction.js`
on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the crown angles, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the footage / pieces / miter set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (70 ft, 6 ft openings -> 70.4 ft, 5 pieces).

## 5. Roadmap position

Closes the interior-finish takeoff trio: v438 the floor, v439 the insulation, and v440 the trim. A per-wall cut-list and a
crown spring-angle table (38/45/52 deg) are the deliberate next follow-ons.
