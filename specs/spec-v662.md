# roughlogic.com Specification v662 -- Horsepower from Quarter-Mile ET (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic), no new module, group, or dependency. Inherits spec.md through spec-v661.md.
>
> **The gap, and the evidence for it.** The `trap-speed-horsepower` tile (spec-v325) estimates power from trap
> speed and reports the ET as a companion output -- but it cannot take ET as an input. Many timeslips give ET more
> prominently than trap speed, so the racer wants to go the other way. Inverting Hale's ET relation
> `ET = 5.825 x (weight/HP)^(1/3)` gives `HP = weight x (5.825/ET)^3`. First-principles; the 5.825 constant is
> already in the sibling. The pinned example: a **3,200 lb** car running a **12.63 s** quarter made **~314 hp**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The weight is
`M L T^-2` (lb-force), the ET is `T` (s), and the horsepower is `M L^2 T^-3`. The `5.825` Hale ET constant is the
same one `trap-speed-horsepower` already uses. The v18/v21 contract: any non-finite input, or a non-positive weight
or ET, returns `{ error }`. Citation discipline (v19/v22): Hale's ET relation solved for the power, the ET companion
of the trap-speed tile, by name; the note states that **HP = weight x (5.825/ET)^3, HP scales with the cube of
1/ET, ET is corrupted by traction and the launch (trap speed is the cleaner indicator), and this is an empirical fit
to typical cars** -- the actual dyno measurement governs.

## 2. The tile

### 2.1 `et-horsepower` -- Horsepower from the Quarter-Mile Elapsed Time

```
inputs:
  weight_lb   lb   race weight including driver (> 0)
  et_s        s    quarter-mile elapsed time (> 0)

hp = weight_lb x (5.825 / et_s)^3
```

**Pinned worked example.** `weight = 3,200 lb`, `ET = 12.63 s`: `HP = 3,200 x (5.825/12.63)^3 = ` **~314 hp**.
**Cross-check (the cube law).** A quicker 11.5 s ET on the same car implies `3,200 x (5.825/11.5)^3 = ` **~416 hp**
-- a ~9% ET drop is a ~32% power gain.
**Cross-check (exact inverse of the trap-speed tile).** The fuzzer feeds the ET the `trap-speed-horsepower` tile
computes for a 108 mph trap back through this tile and recovers exactly the same horsepower.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`, beside `trap-speed-horsepower`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (Hale ET inverted, the note per §1); `test/fixtures/worked-examples.json` (the pinned
example plus the cube-law cross-check); `test/fixtures/compute-map.js` (`et-horsepower` -> `computeEtHorsepower`);
`scripts/related-tiles.mjs` (<-> `trap-speed-horsepower`, `hp-from-torque`, `dyno-correction-sae`, `injector-size`);
`data/search/aliases.json` ("et horsepower", "hp from et", "horsepower from quarter mile time", plus question rows,
all collision-checked); `MECHANIC_RENDERERS["et-horsepower"]` via the `_simpleRenderer` factory (field DOM ids = the
input keys) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact
inverse round-trip through `computeTrapSpeedHorsepower`, the cube law, and the error seams. The Group K citation-
audit test parses only the original `// Group K: Mechanic` tools-data block (which this later-section tile is not
part of), so no count bump. The two `index.html` home-count spots go 1,110 -> 1,111 (check-readme-counts gates
them). The calc-mechanic.js gzip cap (39000, raised in spec-v660) is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> ~314 hp).

## 5. Roadmap position

Completes the quarter-mile power triad on `calc-mechanic.js`: `trap-speed-horsepower` (trap mph -> HP, ET companion)
and now `et-horsepower` (ET -> HP), the two ways a timeslip reads out power through Hale's relations. Further Group
K growth stays evidence-driven.
