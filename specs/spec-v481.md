# roughlogic.com Specification v481 -- Stair Geometry Code Check (IBC 1011 / IRC R311) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter, and the egress follow-on spec-v243 §5 named
> ("a stair-capacity-vs-tread-geometry cross-check [is a] deliberate future follow-on"). Adds one tile to
> **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md through spec-v480.md.
>
> **The gap, and the evidence for it.** The catalog lays a stair out (`stairs`, risers and runs from a total rise, a
> carpentry aid) and cuts its stringer (`stair-stringer`), and it checks the guard and handrail beside it
> (`guard-handrail-check`) and the egress width the occupants need (`egress-capacity`) -- but it has never checked the
> one thing every stair permit turns on: whether the riser, the tread, and the clear width themselves meet code. Those
> are three published dimensional limits that differ between the two governing codes, which is exactly why a checker
> earns its place: the IBC (§1011.5.2 / §1011.2, commercial) caps the riser at 7 in, floors the tread at 11 in, and
> requires 44 in of width; the IRC (R311.7.5 / R311.7.1, residential) allows a 7-3/4 in riser and a 10 in tread at 36 in
> of width. A 7-1/2 in riser is a legal residential stair and an illegal commercial one -- the single most common stair
> mistake on a tenant-improvement permit. The tile reports each dimension pass or fail against the selected code and the
> 2R + T comfort read (the 24-25 in rule of thumb the trades size to), the dimensional counterpart to the guard/handrail
> check already in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The riser, tread, and
width are lengths (`L`); the occupancy selector and the pass/fail flags annotate `dimensionless`. The v18/v21 contract:
any non-finite input or a negative riser, tread, or width returns `{ error }` (a zero dimension simply fails its
minimum). Citation discipline (v19/v22): `GOVERNANCE.general` over the limits by section; `editionNote` names **IBC
2021 §1011.5.2 (riser 4 in to 7 in, tread 11 in min) and §1011.2 (44 in width, 36 in where the occupant load is under
50)** and **IRC 2021 R311.7.5.1/.3 (riser 7-3/4 in max, tread 10 in min) and R311.7.1 (36 in width)**, states the
2R + T comfort band (24-25 in) as a design rule of thumb and not a code pass/fail, and states that **the limits are the
adopted-code dimensional minimums for the selected occupancy, the tread is the horizontal run excluding the nosing
projection, the riser/tread uniformity limit (3/8 in max variation over a flight, §1011.5.4 / R311.7.5.1), the nosing
and profile, the landings, and the winder and spiral geometries are separate checks, and the egress width the occupant
load requires is the `egress-capacity` tile** -- a design aid, not a code-official determination; the AHJ and the
adopted code and edition govern.

## 2. The tile

### 2.1 `stair-code-check` -- Riser, Tread, and Width Against the Adopted Stair Code

```
inputs:
  occupancy       select   residential (IRC) or commercial (IBC)
  riser_height_in in       proposed riser height
  tread_depth_in  in       proposed tread run (excluding the nosing)
  stair_width_in  in       proposed clear stair width

IBC (commercial): max_riser 7,    min_riser 4, min_tread 11, min_width 44
IRC (residential): max_riser 7.75, min_riser 0, min_tread 10, min_width 36
riser_ok = min_riser <= riser <= max_riser     tread_ok = tread >= min_tread
width_ok = width >= min_width                  2R+T = 2 x riser + tread   (comfort 24-25 in)
all_pass = riser_ok and tread_ok and width_ok
```

**Pinned worked example (commercial stair, IBC).** A 7 in riser, 11 in tread, 44 in wide stair, occupancy commercial:
riser 7 <= 7 **ok**, tread 11 >= 11 **ok**, width 44 >= 44 **ok** -- **all checks pass**, and `2R + T = 2 x 7 + 11 = `
**25 in**, at the top of the 24-25 in comfort band. **Cross-check (the same permit read two ways).** Judge a 7-3/4 in
riser, 10 in tread, 36 in wide stair as **residential (IRC)**: riser 7.75 <= 7.75 **ok**, tread 10 >= 10 **ok**, width
36 >= 36 **ok** -- **passes**, `2R + T = 25.5 in` (just past the comfort band). Now flip the *same* 7-3/4 in riser to
**commercial (IBC)**, everything else legal: riser 7.75 > 7 **FAIL** -- the 3/4 in the IRC allows and the IBC does not,
the exact stair a residential remodel gets away with and a tenant improvement is red-tagged for.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry","construction"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the IBC pass
example + the IRC/IBC riser-flip cross-check); `test/fixtures/compute-map.js` (`stair-code-check` ->
`computeStairCodeCheck` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `stairs` /
`guard-handrail-check` / `egress-capacity`); `data/search/aliases.json` ("stair code", "riser height", "tread depth",
"stair rise and run", "7-11 rule", "2r plus t", "stair riser tread", "ibc stair"); the id appended to the construction
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the riser-flip fail, the 2R+T value, and the error seams
(non-finite, negative riser/tread/width). Uses the existing `_simpleRenderer` factory (one select, three number
fields). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (the riser / tread / width / verdict stack wraps on a phone); render-no-nan + a11y
on the new tile, output read to the value (the IBC example -> all pass, 2R+T 25 in).

## 5. Roadmap position

Executes the spec-v243 §5 stair-geometry follow-on and completes the stair bench: layout (`stairs`), stringer
(`stair-stringer`), the guard/handrail beside it (`guard-handrail-check`), the egress width it needs
(`egress-capacity`), and now the riser/tread/width compliance itself. A riser/tread uniformity checker (the 3/8 in
flight-variation rule) and a winder/spiral-tread geometry helper are deliberate future follow-ons. Further Group E
growth stays evidence-driven.
