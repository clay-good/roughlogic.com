# roughlogic.com Specification v681 -- Helical Pile Acceptance Torque for a Target Capacity (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E, carpentry / foundations), no new module, group, or dependency. Inherits spec.md through spec-v680.md.
>
> **The gap, and the evidence for it.** Spec-v7 (`helical-pile`) runs the AC358 torque correlation forward: given an
> installation torque, it returns the pile capacity. The installer's question is the inverse -- **what torque must I
> reach on the drive head to confirm the design capacity**. The forward tile makes you guess torques and re-read the
> capacity; the inverse solves it directly. From `ultimate = Kt x torque` and `allowable = ultimate / FS`,
> `torque = (allowable x FS) / Kt = ultimate / Kt`. The number this settles: a 22,500 lb allowable at FS 2 on a 1.5 in
> solid shaft (Kt 10) needs **4,500 ft-lb**, and a lower-Kt 3.5 in pipe (Kt 5) needs **9,000 ft-lb** for the same
> capacity -- the field-acceptance torque the crew watches on the gauge as the pile advances.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`helical-pile` sibling: it reuses the same in-code `HELICAL_PILE_KT` shaft table and the same `shaft` select, the target
capacity is a force `M L T^-2` (lb), the returned torque is `M L^2 T^-2` (ft-lb), and the factor of safety and the
capacity basis are `dimensionless`. The v18/v21 contract: any non-finite input, an unknown shaft, a non-positive target
capacity, an unknown capacity basis, or a factor of safety below 1 returns `{ error }`. Citation discipline (v19/v22):
ICC-ES AC358 torque correlation solved for the acceptance torque, by name and `GOVERNANCE.engineer_of_record` matching
the sibling; the note states that **this is the field-acceptance torque the crew watches on the drive-head gauge, Kt is
a shaft-specific empirical factor (larger shafts have a lower Kt), the correlation is an installation acceptance check
and not a substitute for a load test, and the engineer of record specifies the project Kt, the factor of safety, and the
acceptance torque -- a load test governs the true capacity**.

## 2. The tile

### 2.1 `helical-pile-torque` -- Helical Pile Acceptance Torque for a Target Capacity

```
inputs:
  shaft               -    shaft type (sets Kt: 1.5 in solid 10, 1.75 in solid 9, 2.875 in pipe 7, 3.5 in pipe 5)
  target_capacity_lb  lb   target capacity (> 0)
  capacity_basis      -    allowable (design) or ultimate
  factor_of_safety    -    FS (>= 1, default 2.0)

ultimate = (capacity_basis == "allowable" ? target x FS : target)
torque   = ultimate / Kt   [ft-lb]
```

**Pinned worked example (a 1.5 in solid shaft).** shaft Kt 10, target 22,500 lb allowable, FS 2:
`ultimate = 22500 x 2 = 45,000 lb`, `torque = 45000 / 10 = ` **4,500 ft-lb**; feeding 4,500 ft-lb back through
`helical-pile` returns a 22,500 lb allowable, the input. **Cross-check (a lower-Kt shaft).** Same 22,500 lb allowable on
a 3.5 in pipe shaft (Kt 5): `torque = 45000 / 5 = ` **9,000 ft-lb** -- a lower Kt needs proportionally more torque for
the same capacity.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `helical-pile`; the Group E audit-coverage test is a
lower bound and only requires a citation entry, which this adds, so no count bump); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (AC358 solved for torque, `GOVERNANCE.engineer_of_record` matching the sibling, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`helical-pile-torque` ->
`computeHelicalPileTorque` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `helical-pile` /
`pile-axial-capacity` / `footing-area`, and the forward tile links back); `data/search/aliases.json` ("acceptance torque
for a target capacity", "install torque to confirm pile capacity", "field acceptance torque helical pier", plus adjacent
rows); `CONSTRUCTION_RENDERERS["helical-pile-torque"]` via a hand-written renderer with the same shaft `makeSelect` and a
capacity-basis select (both feed the compute, satisfying check-dead-inputs) and the id added to the calc-construction
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the ultimate/allowable basis, the round-trip
through `computeHelicalPile` across shaft types, and the error seams. It shares the in-code `HELICAL_PILE_KT` constant,
so no data-shard wiring is needed. The mechanical/structural governance tests use explicit id lists this tile is not on,
so `GOVERNANCE.engineer_of_record` is correct. The calc-construction.js gzip cap is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 4,500 ft-lb for a 22,500 lb allowable).

## 5. Roadmap position

Pairs the forward pile tile (`helical-pile`, capacity from torque) with its inverse (acceptance torque from a target
capacity), the two halves of the helical-pile installation question. Further Group E growth stays evidence-driven.
