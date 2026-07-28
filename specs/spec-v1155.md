# roughlogic.com Specification v1155 -- Compressed Gas Cylinder Storage Separation (calc-shop.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1154.md.
>
> **The gap.** The catalog sizes oxyfuel gas consumption and shielding-gas runtime but never touched how
> the cylinders are stored. A dupe scan for "acetylene" and "noncombustible barrier" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA is public domain, so the
provisions are quoted.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a negative
distance, height, or rating, or a barrier claimed with no height, return `{ error }`. Hand-written
renderer -- **calc-shop.js has no `_simpleRenderer` factory**, which the first draft assumed and which
failed immediately on import. `check-module-sizes` cap for calc-shop.js raised 26500 -> 31000.

## 2. The tile

### 2.1 `cylinder-storage-separation` -- Storage Separation and Handling

```
inputs:  separation_ft, barrier_present, barrier_height_ft, barrier_noncombustible,
         barrier_rating_hr, cylinders_upright, valve_caps_secured
compute: satisfied <- distance >= 20 ft
                   OR (noncombustible AND height >= 5 ft AND rating >= 0.5 hr)
         plus two independent handling conditions
outputs: required_separation_ft, distance_ok, separation_shortfall_ft, has_barrier,
         barrier_height_ok, barrier_noncomb_ok, barrier_rating_ok, barrier_ok,
         barrier_failures, separation_satisfied, route, upright, caps, passes, note
```

**The rule everyone half-remembers as "20 feet" is an OR**, and the alternative is usually the cheaper
one. On a tight site 20 ft of clear floor is expensive and a 5-ft barrier is not. The fixtures are the
same layout with the barrier at 4 ft and at 6 ft: one foot of block turns a non-compliant bay into a
compliant one and makes the 8-ft separation irrelevant.

**But the barrier route has three conditions and two fail silently.** A sheet of plywood is the right
shape, stands the right height, and satisfies neither the noncombustible condition nor the half-hour
rating -- and nobody measures a fire-resistance rating on a jobsite. The tile names *which* of the three
failed rather than returning a bare no.

**The scope is wider than it gets applied.** The separation runs to fuel-gas cylinders **or combustible
materials**, especially oil or grease. Oxygen stored 20 ft from the acetylene and hard against the parts
washer has not addressed the hazard, because oxygen enrichment makes ordinary combustibles behave in ways
nobody is expecting.

Two handling requirements travel with the storage question and are checked alongside it: secured upright
except briefly while being hoisted or carried, and valve protection caps in place and secured -- the cap
being what stands between a knocked-over cylinder and a sheared valve.

## 3. Scope

Not checked: cylinders in use rather than in storage; acetylene-specific storage and the waiting period
after a cylinder has been on its side; regulator, hose, and torch condition; flashback arrestors;
prohibited hoisting by caps, magnets, or slings; transport in enclosed vehicles; indoor quantity limits;
and NFPA 55 or state rules, which are often stricter.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `oxyfuel-cutting-gas` (which now links
back), `shielding-gas-runtime`, `flammable-cabinet-storage`, and `extinguisher-coverage`. Fuzzer pins both
fixtures, each route satisfying alone and both together, the exact 20-ft seam, all three barrier
conditions failing independently and being named, both barrier minimums exactly at the limit, that an
absent barrier is unavailable rather than failing, that either handling condition alone fails an otherwise
compliant layout, and every error seam.
