# roughlogic.com Specification v370 -- Masonry Lintel Arching Load (Triangular Load Over an Opening) (calc-masonry.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v368..v370 (the masonry loading/detailing trio -- wall dead
> load (v368), veneer anchor spacing (v369), the lintel arching load (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: a lintel over an opening in a masonry wall does not
> carry the whole wall above it -- the masonry arches over the opening, so the lintel carries only the triangle of masonry
> within the arch, plus any load applied inside that triangle. This arching-action load reduction, standard in masonry
> design, has no tile; a designer who loads a lintel with the full wall height oversizes it badly. Adds one tile to the
> existing **`calc-masonry.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through spec-v369.md.
>
> **The gap, and the evidence for it.** For a masonry wall of sufficient height above an opening, arching action limits the
> dead load on the lintel to the weight of a triangle of masonry with its apex at roughly `45 deg` (base = the span `L`,
> height = `L/2`): `W_triangle = (1/2 x L x L/2) x wall_psf` -- a distributed load that the lintel is designed for as an
> equivalent. Loads applied above the apex are carried by arching to the supports, not the lintel; only loads within the
> triangle add. For a 6 ft opening in a wall weighing 60 psf (per `masonry-wall-weight`), the triangle is 3 ft tall and
> `9 ft^2`, so the arching dead load is `9 x 60 = 540 lb` (an equivalent UDL of `540/6 = 90 lb/ft`) -- a fraction of the
> `60 x 6 x wall_height` the full-wall assumption would pile on. The wall-weight tile gives the psf; this tile turns it into
> the reduced lintel load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The opening span `L` and the
wall height above the opening are lengths (ft); the wall weight is a pressure (psf); the triangle height and area are a
length and area; the arching dead load is a force (lb) and its equivalent UDL a force per length (lb/ft). The v18/v21
contract: any non-finite input, or a span or wall weight at or below zero, returns `{ error }`; if the wall height above the
opening is less than the triangle height (`< L/2`), arching is not fully developed and the tile carries the full rectangle
of wall above instead (flagged). Citation discipline (v19/v22): `GOVERNANCE.general` over the masonry arching-action model
by name; `editionNote` names **the 45-degree triangular arching load `W = (1/2)(L)(L/2)(wall_psf)` with the apex at `L/2`
above the opening, the requirement that the wall extend at least `L/2` above the opening for arching to develop (otherwise
the full wall load applies), and that superimposed loads within the triangle add while those above the apex arch to the
supports, per the masonry-design references (NCMA TEK / TMS)**, and states that **this returns the arching dead load on a
masonry lintel -- it uses the 45-degree triangle (some references use a 60-degree triangle, a conservative variation), the
entered wall weight (`masonry-wall-weight`), and does not design the lintel (`cmu-wall-flexure` and a lintel-specific check
do that), add the concentrated loads within the triangle automatically, or apply to a non-masonry backup; and this is a
load aid, not a structural design** -- the structural engineer of record governs.

## 2. The tile

### 2.1 `masonry-lintel-loading` -- Masonry Lintel Arching Load

```
inputs:
  span_ft      ft    opening (clear) span
  wall_psf     psf   masonry wall weight above (from masonry-wall-weight)
  wall_h_above ft    height of wall above the opening

tri_h = span_ft / 2                                 ; triangle height (45 deg), ft
arching = (wall_h_above >= tri_h)
if arching: W_lb = 0.5 * span_ft * tri_h * wall_psf ; triangular dead load, lb
else:       W_lb = span_ft * wall_h_above * wall_psf ; full rectangle (arching not developed)
w_udl = W_lb / span_ft                              ; equivalent UDL, lb/ft
```

**Pinned worked example (a 6 ft opening, 60 psf wall, 5 ft of wall above).** `tri_h = 3 ft`; `5 ft >= 3 ft` so arching
develops; `W = 0.5 x 6 x 3 x 60 = 540 lb`; equivalent UDL `= 540/6 = 90 lb/ft`. **Cross-check (only 2 ft of wall above the
opening).** `tri_h = 3 ft` but `wall_h_above = 2 ft < 3 ft`, so arching is not fully developed and the lintel carries the
full rectangle `W = 6 x 2 x 60 = 720 lb` (`120 lb/ft`) -- more load than the fully-arched case, the reason a lintel near
the top of a wall or under a beam bearing does not get the arching reduction. The non-finite and non-positive error paths
bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry","construction"]`, matching the masonry tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the arching-action model, `editionNote` naming the 45-degree
triangular load, the wall-height-for-arching requirement, the loads-within-triangle rule, the NCMA/TMS basis, and the
not-lintel-design, 45-vs-60-degree caveats); `test/fixtures/worked-examples.json` (the arching example + the arching-not-
developed cross-check); `test/fixtures/compute-map.js` (`masonry-lintel-loading` -> `computeMasonryLintelLoading` in
`../../calc-masonry.js`); `scripts/related-tiles.mjs` (-> `masonry-wall-weight` / `cmu-wall-flexure` / `header-sizing` /
`beam-reactions`); `data/search/aliases.json` ("masonry lintel load", "arching action", "lintel triangle load", "masonry
lintel loading", "45 degree triangle lintel", "arching masonry", "lintel dead load", "load on lintel", "masonry opening
load"); the id appended to the existing masonry renderers block in `app.js`; the `// dims:` annotation (span/height/tri_h
length, wall pressure, `W` force, UDL force/length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the triangle load, the arching-developed branch, the equivalent UDL, and the non-positive /
non-finite error seams. No new module; re-pin `calc-masonry.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the arching-branch assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `tri_h` / `W` / UDL stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (6 ft, 60 psf, arching -> 540 lb, 90 lb/ft).

## 5. Roadmap position

Closes the masonry loading/detailing batch (v368..v370) in `calc-masonry.js`: the wall dead load, the veneer anchors, and
the lintel arching load now sit beside the structural CMU member tiles. A 60-degree conservative triangle option, an
automatic add of concentrated loads within the triangle, and a chain into a masonry-lintel flexural design are the
deliberate next follow-ons once the trio lands.
