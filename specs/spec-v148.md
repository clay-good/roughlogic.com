# roughlogic.com Specification v148 -- Ozone Deodorization Sizing, Treatment Time, and Lockout (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v146..v150.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fire-damage restoration tile sizing an ozone shock-deodorization
> for smoke odor by treatable volume, with the unoccupied-and-sealed lockout the method demands front
> and center. Adds one tile to **`calc-restoration.js`** (Group D); no new module, group, or
> dependency. Inherits spec.md through spec-v147.md.
>
> **The gap, and the evidence for it.** After cleaning, smoke odor is finished with deodorization, and
> ozone shock is the standard tool for an unoccupied structure -- the number of generators follows the
> volume to be treated against each unit's rated treatable volume. The hazard is the headline: ozone is
> a strong oxidizer and a respiratory toxin, so the space must be unoccupied, sealed, and aired out to
> below the OSHA limit before reentry, and a hydroxyl generator is the occupied-space alternative. No
> tile sizes the equipment or surfaces the lockout, so the dose is guessed and the safety step is left
> to memory.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
structure volume and the per-unit rated treatable volume are `L^3` (ft^3); the generator count is
`dimensionless`; the treatment time and the aeration minimum are `T`. The lockout flag is a constant
`true` -- it is never computed off, it is the method's precondition. The v18/v21 contract: any
non-finite input, a non-positive volume, rated volume, or treatment time returns `{ error }`; the only
division is by the guarded-positive rated volume. Citation discipline (v19/v22): `GOVERNANCE.general`
over the volume-based ozone sizing, by name, and the OSHA 0.1 ppm ozone limit; `editionNote` names
ANSI/IICRC S700 deodorization, states that **the space must be unoccupied, sealed, and aired to below
0.1 ppm before reentry**, that people, pets, and plants are removed, and that hydroxyl is the occupied
alternative. This sizes equipment; it is not authority to run ozone in an occupied space.

## 2. The tile

### 2.1 `ozone-shock-treatment` -- Ozone Deodorization Sizing and Lockout

```
inputs:
  structure_volume_ft3   L^3            volume to deodorize (area x ceiling height)
  rated_volume_per_unit  L^3            generator's rated treatable volume (default 2000)
  treatment_time_hr      T              shock duration for the odor severity (default 24)
  aeration_min           T              minimum ventilate-before-reentry time (default 120)

generators_needed = ceil(structure_volume_ft3 / rated_volume_per_unit)
lockout_required  = true                                  # unoccupied + sealed, always
reentry_note      = "ventilate >= aeration_min and verify < 0.1 ppm (OSHA) before reentry"
```

**Pinned worked example.** An 8,000 ft^3 fire-damaged house, units rated 2,000 ft^3, 24 hr shock:
`generators = ceil(8000/2000) = 4`; treat 24 hr with the structure **unoccupied and sealed**; then
ventilate at least 120 min and confirm ozone is below the 0.1 ppm OSHA limit before anyone reenters.
**Cross-check (smaller, lighter job).** A 4,000 ft^3 detached garage, lighter odor, 12 hr shock:
`generators = ceil(4000/2000) = 2`; the lockout and the below-0.1 ppm reentry check are identical --
they do not scale down with the job. Use a hydroxyl generator instead where the space must stay
occupied.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the volume-based sizing and the OSHA 0.1 ppm limit,
`editionNote` naming ANSI/IICRC S700, the unoccupied-sealed-aerate lockout, and the hydroxyl
alternative); `test/fixtures/worked-examples.json` (example + cross-check);
`test/fixtures/compute-map.js` (`ozone-shock-treatment` -> `computeOzoneShockTreatment` in
`../../calc-restoration.js`); `scripts/related-tiles.mjs` (-> `smoke-ejector-cfm` /
`soot-cleaning-takeoff` / `ppe`); `data/search/aliases.json` ("ozone", "deodorization", "smoke odor",
"hydroxyl", "ozone generator", "odor treatment"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, the constant-lockout
assertion, and error seams (non-finite, volume/rated/time <= 0). Raise the `calc-restoration.js` size
cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the lockout assertion); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
generator count plus the lockout and reentry notes wrap on a phone, and the safety text is visible);
render-no-nan + a11y sweep, output read to the value (8,000 ft^3 / 2,000 -> 4 generators, lockout
required, below 0.1 ppm before reentry).

## 5. Roadmap position

Closes the fire-damage arc (assess v146, clean v147, deodorize) with the method's safety lockout made
explicit, and links to the existing `smoke-ejector-cfm` ventilation tile for the aeration step.
Further Group D growth stays evidence-driven.
