# roughlogic.com Specification v936 -- Concrete Stair / Stoop Volume Takeoff (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v935.md. Concrete material-takeoff sweep, beside the
> accepted `concrete` (volume) and `concrete-isolation-joint` tiles.
>
> **The gap, and the evidence for it.** The catalog takes off slab and footing concrete but nothing gives the volume of
> a poured STAIR or stoop. Grep confirmed no stair-volume tile. Every flatwork crew orders ready-mix for steps. The
> number this settles: a 4-riser stoop (7 in rise, 11 in tread, 48 in wide, 4 in throat) takes about **10.1 ft^3 (0.37
> cy)**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling concrete
tiles: the riser, tread, width, and throat carry `L`, the number of risers is dimensionless, and the volumes carry `L^3`.
The v18/v21 contract: fewer than one riser, or a non-positive rise, tread, width, or throat, returns `{ error }`.
Citation discipline (v19/v22): the waist-slab-plus-steps geometry by name (cross-section = n x 1/2 x riser x tread +
throat x rake length; volume = cross-section x width; cy = in^3 / 46656), `GOVERNANCE.general`; the note states that this
is the neat geometry, that the run is taken as risers x tread, that it ignores the nosing overhang, a top landing or
bottom footing, and the rebar displacement, and that the structural stair detail and the finisher's forms govern the
actual pour.

## 2. The tile

### 2.1 `concrete-stair-volume` -- Concrete Stair / Stoop Volume Takeoff

```
inputs:
  num_risers   number of risers
  riser_in     riser height (in)
  tread_in     tread depth (in)
  width_in     stair width (in)
  throat_in    throat / waist thickness (in)

steps_area  = num_risers x 0.5 x riser_in x tread_in
rake_length = sqrt((num_risers x riser_in)^2 + (num_risers x tread_in)^2)
slab_area   = throat_in x rake_length
volume_in3  = (steps_area + slab_area) x width_in
volume_cy   = volume_in3 / 46656
```

**Pinned worked example.** 4 risers, 7 in rise, 11 in tread, 48 in wide, 4 in throat:
`steps = 4 x 0.5 x 7 x 11 = 154`; `rake = sqrt(28^2 + 44^2) = 52.15`; `slab = 4 x 52.15 = 208.6`; `volume = (154 + 208.6)
x 48 = 17,405 in^3 = ` **10.1 ft^3 (0.37 cy)**. Cross-check: a 6-riser flight at 7.5 in rise, 10 in tread, 36 in wide, 5
in throat is `(225 + 375) x 36 = 21,600 in^3 = ` **12.5 ft^3** -- the steps and the raking slab both scale with the
flight.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, beside `concrete-isolation-joint`); a
`tile-meta.js` `_TILES` entry (`E`); a `citations.js` entry (waist-slab-plus-steps geometry, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 4-riser example plus the 6-riser cross-check, pinning the ft^3 and cy);
`test/fixtures/compute-map.js` (`concrete-stair-volume` -> `computeConcreteStairVolume`, module
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `concrete` / `stairs` / `rebar-weight-takeoff`);
`data/search/aliases.json` (5 collision-checked aliases: "concrete stair volume", "stoop concrete volume", "concrete
steps volume", "poured stair concrete", "stair ready mix"), then `node scripts/build-alias-shards.mjs`; a
`_simpleRenderer` in the `CONCRETE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-concrete declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the volume in in^3, ft^3, and cy across two
flights and the error seams (risers < 1, non-positive rise / tread / width / throat, non-finite). The calc-concrete.js
gzip cap is raised 28000 -> 30000 with a ledger note. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,384 -> 1,385.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (cap
raise); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((154 + 208.6) x 48 -> 17,405 in^3 = 10.1 ft^3, 0.37 cy).

## 5. Roadmap position

Concrete material takeoff beside `concrete-isolation-joint`, serving the flatwork crew / GC (concrete / construction).
Deliberately a ready-mix ordering estimate; the structural stair detail and the finisher's forms govern the actual pour.
Stays evidence-driven. Continues the concrete takeoff sweep at 1 new spec (v936).
