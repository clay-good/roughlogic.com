# roughlogic.com Specification v94 -- Fencing Takeoff (Group E, 2 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 645 -> 647; 25 groups; a minor stamp).** v94 inherits everything from spec.md
> through spec-v93.md and changes none of it. It adds two tiles to **Group E
> (Carpentry and Construction)** and changes no existing tile's output. **No new
> group, no new dependencies, no telemetry, no AI, US standards only.** Both land in
> `calc-construction.js` (the home of the general construction take-off tiles -- see
> the §3 module note on the cap management).
>
> **The gap, and the evidence for it.** Group E has a deep take-off bench:
> `square-footage`, `board-footage`, `concrete`, `aggregate`, `rebar`, `drywall`,
> `tile-count`, `masonry-count`, `mortar-mix`, `paint-coverage`, `roofing-squares`,
> `deck-beam-post`, `deck-ledger-fasteners`, `stairs`, `rafter`, and dozens more.
> What it does **not** have is one of the most common residential and light-commercial
> take-offs there is: **fencing**. There is no tile that turns a run length and a post
> spacing into the post, rail, and picket counts, and none that sizes the **concrete
> per post hole** (the cylinder volume less what the post displaces, in bags). A
> concept-check against the post-v93 live ids for fence, fence-estimate, picket,
> post-hole, and post-concrete returned nothing. `equal-spacing` (Group G) lays out
> generic equal divisions but does not count fence material; `concrete` and
> `aggregate` do slabs and footings, not a batch of small post holes net of the post.
> Fencing is a daily estimate for fence crews, landscapers, and homeowners, and the
> catalog has no tile for it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `fence-estimate` carries a length over a spacing to a
  dimensionless section count, plus dimensionless post, rail, and picket counts;
  `post-hole-concrete` carries a diameter and depth (lengths) to a volume, less a post
  cross-section times depth (a volume), times a count to a total volume, over a bag
  yield (volume) to a dimensionless bag count. Every constant -- 1,728 cubic inches per
  cubic foot, 27 cubic feet per cubic yard, the 0.45 and 0.60 cubic-foot bag yields --
  is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive run length, post spacing, rails-per-section, post count, hole diameter,
  hole depth, or bag yield returns `{ error }`. Section, post, rail, and picket counts
  and the bag count are `ceil` of finite ratios (you cannot buy a fraction of a post
  or a bag). The picket count is `null` when no picket width is given (the rail and
  post counts still compute). A post cross-section whose displacement meets or exceeds
  the hole volume returns `{ error }` (the post is as big as the hole -- a nonsense
  input).
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.general`** (fence
  layout and concrete take-off are construction arithmetic, not a structural design --
  the foundation tiles that carry load use `GOVERNANCE.structural`, and these two
  deliberately do not). Sources are named, never reproduced: the **standard fence-layout
  identities** (posts = sections + 1 for a straight run; rails = sections x
  rails-per-section; pickets = run divided by the picket width plus the gap); the
  **cylinder-volume geometry** for the post hole less the post's own displacement; and
  the **bagged-concrete yields** (about 0.45 cu ft for a 60-lb bag, 0.60 cu ft for an
  80-lb bag). The layout rules of thumb (hole depth about a third of the post's
  above-grade height and below the frost line; hole diameter about three times the post
  width) are stated as guidance the user edits, and the post/corner/gate extras are
  explicitly the estimator's field judgment -- every spacing, count, and yield is an
  editable input.
- Tile ids are kebab-case and checked against the post-v93 live ids. None collides
  with `equal-spacing`, `concrete`, `aggregate`, `deck-beam-post`, or any Group E
  take-off tile (see Section 3).

## 2. The tiles

### 2.1 `fence-estimate` -- Fence Material Takeoff (sections, posts, rails, pickets) (Group E, calc-construction.js)

From a run length and a post spacing, the sections, posts, and rails for a straight
run, and -- when a picket width is given -- the picket count.

```
inputs:
  length_ft         L    total fence run (ft)
  post_spacing_ft   L    on-center post spacing (ft; default 8)
  rails_per_section -    rails per section (default 2; 3 for tall privacy or ranch rail)
  picket_width_in   L    optional picket face width (in; 0 = off)
  picket_gap_in     L    optional gap between pickets (in; default 0)

sections = ceil(length_ft / post_spacing_ft)
posts    = sections + 1                                   (straight run; ends included)
rails    = sections * rails_per_section
pickets  = picket_width_in > 0
             ? ceil(length_ft * 12 / (picket_width_in + picket_gap_in))
             : null
```

Outputs: the section (bay) count, the post count, the rail count, and -- when a picket
width is given -- the picket count. The note line states: for a straight run the posts
are the sections plus one, and every corner, end, and gate post is an extra you add by
eye from the layout; rails are the sections times the rails per section (2 for most
privacy and picket fence, 3 for tall or ranch rail); pickets divide the run by the
picket width plus the gap; add a waste allowance and order full bundles; and this is
the material count -- `post-hole-concrete` sizes the footing.

**Worked example (pinned).** A 120 ft run, 8 ft spacing, 3 rails per section, 5.5 in
pickets with a 0.25 in gap: sections = ceil(120 / 8) = **15**; posts = 15 + 1 =
**16**; rails = 15 x 3 = **45**; pickets = ceil(120 x 12 / (5.5 + 0.25)) = ceil(1,440
/ 5.75) = ceil(250.43) = **251**. Cross-check (a 100 ft run, 8 ft spacing, 2 rails, no
pickets): sections = ceil(12.5) = **13**, posts = **14**, rails = **26**, pickets =
**null**. Cross-check (the same 120 ft at 6 ft spacing): sections = **20**, posts =
**21**, rails (2/section) = **40**. Degenerate inputs (length_ft <= 0, post_spacing_ft
<= 0, rails_per_section <= 0, a negative picket gap, non-finite) return an error; a
picket_width_in of 0 returns a `null` picket count.

### 2.2 `post-hole-concrete` -- Concrete per Post Hole (Group E, calc-construction.js)

The concrete a batch of post holes needs: the cylinder volume of each hole less what
the post itself displaces, totaled and divided into bags. Useful for a fence, a deck,
a sign, or a mailbox.

```
inputs:
  num_posts        -    number of post holes
  hole_diameter_in L    hole diameter (in)
  hole_depth_in    L    hole depth (in)
  post_side_in     L    optional square-post side that displaces concrete (in; 0 = off)
  bag_yield_cuft   L    mixed-concrete yield per bag (cu ft; default 0.45 for a 60-lb bag,
                        0.60 for an 80-lb bag)

hole_vol_each     = pi * (hole_diameter_in / 2)^2 * hole_depth_in / 1728
post_displace_each= post_side_in > 0 ? (post_side_in^2 * hole_depth_in) / 1728 : 0
concrete_each     = hole_vol_each - post_displace_each       (must be > 0)
total_cuft        = concrete_each * num_posts
total_cuyd        = total_cuft / 27
bags              = ceil(total_cuft / bag_yield_cuft)
```

Outputs: the concrete per hole (cu ft), the total concrete (cu ft and cu yd), and the
bags needed. The note line states: the concrete per hole is the cylinder volume less
what the post displaces, so set the post side to net it out; a 60-lb bag yields about
0.45 cu ft and an 80-lb bag about 0.60 cu ft of mixed concrete -- match the yield to
the bag you buy; the rule of thumb sets the hole depth at about a third of the post's
above-grade height and below the frost line, with the diameter about three times the
post width; and round bags up per the total when you mix on site, and add a bag or two
for spillage.

**Worked example (pinned).** 16 posts, 10 in diameter, 30 in deep, a 3.5 in square
post, 0.45 cu ft per bag: hole volume each = pi x 5^2 x 30 / 1,728 = 2,356.19 / 1,728 =
**1.3635 cu ft**; post displacement each = 3.5^2 x 30 / 1,728 = 367.5 / 1,728 =
**0.2127 cu ft**; concrete each = **1.1509 cu ft**; total = 1.1509 x 16 = **18.41 cu
ft** = **0.682 cu yd**; bags = ceil(18.41 / 0.45) = ceil(40.92) = **41 bags**.
Cross-check (no post displacement, a sleeve or round post left out): concrete each =
**1.3635 cu ft**, total = **21.82 cu ft**, bags = ceil(48.48) = **49**. Cross-check
(80-lb bags at 0.60 cu ft yield, same 18.41 cu ft): bags = ceil(30.69) = **31**.
Degenerate inputs (num_posts <= 0, hole_diameter_in <= 0, hole_depth_in <= 0,
bag_yield_cuft <= 0, a post displacement at or above the hole volume, non-finite)
return an error; a post_side_in of 0 means no displacement (a valid full-cylinder
pour).

## 3. Concept-check and wiring

Concept-checked against the post-v93 live tiles. `equal-spacing` (Group G) divides a
length into equal gaps but does not count posts, rails, or pickets or distinguish the
end-post-plus-one rule. `concrete` does slabs, footings, columns, and footing-with-stem
volumes, not a batch of small post holes net of the post displacement; `aggregate`
does area-and-depth bulk material, not post-hole concrete in bags. `deck-beam-post`
sizes a deck's structural posts; it does not do a fence take-off. No live tile counts
fence material or sizes post-hole concrete. **Both ship**, into `calc-construction.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `E`, trades
`["fencing", "carpentry", "landscaping"]`); `tile-meta.js` `_TILES`; a `citations.js`
entry (the `GOVERNANCE.general` governance from Section 1; the formula string;
assumptions listing every bundled constant -- the posts = sections + 1 and rail/picket
identities, the cylinder geometry and post displacement, the 1,728 and 27 conversions,
and the 0.45/0.60 cu ft bag yields -- naming the standard fence-layout and
bagged-concrete references without reproduction, and stating that corner/end/gate posts
are field-judgment extras); `test/fixtures/worked-examples.json` (every pinned example
and cross-check); `test/fixtures/compute-map.js` (module path
`../../calc-construction.js`); `scripts/related-tiles.mjs` (`fence-estimate` ->
`post-hole-concrete` / `equal-spacing` / `material-quantity`; `post-hole-concrete` ->
`fence-estimate` / `concrete` / `deck-beam-post`); `data/search/aliases.json` (e.g.
`fence-estimate`: "fence calculator", "fence posts", "pickets", "fence material",
"rails"; `post-hole-concrete`: "post hole concrete", "concrete per post", "fence post
concrete", "bags of concrete", "set a post"); the `app.js` `CONSTRUCTION_RENDERERS`
declare gains both ids; the `// dims:` annotations; and the regenerated v14 corpus +
tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both worked examples, every
`ceil` count, the `null` picket branch, the post-bigger-than-hole error seam, and
every other error seam.

**Module note.** `calc-construction.js` is the home of the general Group E take-off
tiles, so both land there. It is at ~57.9 KB gzipped against a 62,000 B cap; the two
small tiles fit within the current headroom, but if the as-built size crosses the cap
this spec authorizes a documented bump to about **64,000 B** (the v67/v69 pattern), or
the maintainer may relocate a cohesive Group E take-off bench into a new module (the
spec-v70..v89 split precedent -- a finish-and-site-carpentry module is a natural future
home for fencing, flooring, and trim take-offs). Either way the module-size gate stays
green. Group letter (`E`) is independent of the module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **647 tiles** and the matching sitemap URL count);
`npm test` (+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (647 tile shells, regenerated sitemap); `npm run
data:verify`; the worked-examples runner; the 320 px shell audit (the sections / posts
/ rails / pickets lines and the per-hole / total / bags lines all wrap, not scroll, on
a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with
the rendered output read to the value (120 ft / 8 ft / 3 rails / 5.5 in pickets -> 15
sections, 16 posts, 45 rails, 251 pickets; 16 posts / 10 in x 30 in / 3.5 in post ->
1.15 cu ft each, 18.41 cu ft, 41 bags).

## 5. Roadmap position

v94 fills the most-requested missing Group E take-off, fencing, and links the two
tiles (`fence-estimate` hands its post count to `post-hole-concrete`, which is itself a
general post-setting tool for decks, signs, and mailboxes). Further growth should stay
evidence-driven (a named gap a fence or finish crew hits) -- the named next candidate
is a **tile-and-resilient-flooring take-off** (thinset and grout bags by coverage, and
flooring boxes with a waste-and-last-row layout, to complement the existing
`tile-count`), which would pair with fencing in the future finish-and-site-carpentry
module noted above; it ships when the module split is taken. The standing module-cap
watch keeps `calc-construction.js` near the front of the list.
