# roughlogic.com Specification v213 -- Masonry Coursing and Course-Out Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v212..v214 (masonry and finish -- the gaps the catalog's
> two-tile masonry shelf left: grouted-cell volume, modular coursing, wallcovering rolls).**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md through
> spec-v212.md.
>
> **The gap, and the evidence for it.** `masonry-count` gives units per wall area, but the layout question a
> mason answers before the first course is vertical: how many courses reach a given height, and does that
> height land on a module. Brick and block are modular -- a CMU course is 8 in (a 7-5/8 unit plus a 3/8 joint)
> and three brick courses are 8 in (a 2-1/4 unit plus a 3/8 joint) -- so an opening or a wall top that does
> not fall on the module forces a cut course or a fudged joint. The catalog counts the units but never checks
> the coursing, which is where masonry layout actually starts.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target
height and the unit and joint heights are a length (`L`, in); the course count is `dimensionless`; the actual
built height and the remainder off-module are `L` (in); the on-module result is boolean. The course height is
the unit height plus one bed joint (default modular sets: CMU 7.625 + 0.375 = 8.0 in; modular brick 2.25 +
0.4167 = 2.6667 in so three courses = 8 in), all editable. The v18/v21 contract: any non-finite input, or a
non-positive target height, unit height, or joint thickness, returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the coursing relation by name; `editionNote` names the **Brick Industry
Association (BIA) Technical Notes** on modular masonry and the **NCMA TEK** dimensioning references and states
that **the unit and joint dimensions are nominal/modular and the actual product and the mason's joint govern,
and this is a layout aid, not a structural or dimensional certification** -- a coursing check, not a stamped
elevation.

## 2. The tile

### 2.1 `masonry-coursing` -- Courses to a Height and Course-Out Check

```
inputs:
  target_in   L   height to reach (wall top, sill, head), in
  unit_in     L   unit height, in     (CMU 7.625, modular brick 2.25)
  joint_in    L   bed joint, in       (typ 0.375; modular brick 0.4167)

course_in  = unit_in + joint_in
courses    = round(target_in / course_in)
built_in   = courses x course_in
off_in     = target_in - built_in           # + means target above the nearest course
on_module  = |off_in| < 0.0625              # within 1/16 in -> lands on a course
```

**Pinned worked example (CMU wall on module).** Reach 96 in with 7.625 in block and a 3/8 in joint:
`course = 8.0 in`; `courses = round(96 / 8) = 12`; `built = 96 in`; `off = 0` -> **12 courses, on module**.
**Cross-check (brick opening off module).** Reach a 50 in brick head with 2.25 in brick and a 0.4167 in
joint: `course = 2.6667 in`; `courses = round(50 / 2.6667) = round(18.75) = 19`; `built = 19 x 2.6667 = 50.67
in`; `off = -0.67 in` -> **not on module**: 18 courses land at 48 in (2 in low) and 19 at 50.67 in (0.67 in
high), so the head either drops to 48 in or the joints get fattened across 19 courses. The catalog now flags
the cut before the wall is laid.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["masonry","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the coursing relation, `editionNote` naming BIA Technical Notes /
NCMA TEK and the nominal-dimension caveat); `test/fixtures/worked-examples.json` (CMU on-module example +
brick off-module cross-check); `test/fixtures/compute-map.js` (`masonry-coursing` -> `computeMasonryCoursing`
in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `masonry-count` / `cmu-grout-volume` /
`mortar-mix`); `data/search/aliases.json` ("masonry coursing", "course height", "block courses", "brick
courses", "course out", "modular masonry"); the id appended to the existing construction renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples and error seams (non-finite, target/unit/joint <= 0) and the on-module boolean both
ways. Raise the `calc-construction.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the off-module path); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the courses / built /
on-module stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (96 in / 8 in -> 12
courses, on module).

## 5. Roadmap position

The vertical-layout companion to `masonry-count` (horizontal units) and `cmu-grout-volume` (v212). A
lead/story-pole spacing aid (marking a 4 ft pole into courses) is a deliberate future follow-on.
