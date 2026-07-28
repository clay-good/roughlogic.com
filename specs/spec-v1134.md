# roughlogic.com Specification v1134 -- Shower Compartment Size (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1133.md.
>
> **The gap.** A dupe scan for "shower size" returned zero hits. `fixture-clearance-check` (spec-v1132)
> covers the clearances *around* fixtures; nothing covered the compartment itself.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
dimension or a non-positive threshold returns `{ error }`. Hand-written renderer, matching this module's
convention.

## 2. The tile

### 2.1 `shower-compartment-check` -- Shower Compartment Size (IPC 417.4)

```
inputs:  width_in, depth_in (FINISHED interior), base_min_area_sqin (900),
         base_min_dim_in (30), exception_min_area_sqin (1300), exception_min_dim_in (25)
compute: area = w x d;  least = min(w, d)
         base path      <- area >= 900  AND least >= 30
         exception path <- area >= 1300 AND least >= 25
         complies if EITHER path passes (each needs BOTH of its conditions)
         other side needed = max(min dimension, min area / least), per path
outputs: area_sqin, least_dim_in, greater_dim_in, base_area_ok, base_dim_ok, base_path_ok,
         exc_area_ok, exc_dim_ok, exception_path_ok, passes, path, disc_fits,
         base_other_needed_in, exc_other_needed_in, area_deficit_base, area_deficit_exc, note
```

**Two paths, each with two conditions, and area alone satisfies neither.** A 28 x 36 stall has **1,008
sq in** -- comfortably past the 900 -- and fails *both* paths: 28 is under the 30-in least dimension, and
1,008 is 292 short of the 1,300 the exception would demand. Adding length does nothing for the short side,
and the tile says exactly what the other side would have to reach on each path.

**For a rectangle the disc test IS the least-dimension test.** A 30-in disc is blocked by the short side
no matter how far the stall runs, which is why a long narrow compartment can never rescue itself with
square inches. The fuzzer pins that identity across 36 shape combinations, along with orientation
invariance -- swapping width and depth must never change the verdict.

**Both boundary cases are pinned.** A 30 x 30 is exactly 900 sq in at exactly 30 in and passes the base
rule on both counts at once, with the disc tangent on all four sides. A 25 x 52 is exactly 1,300 sq in at
exactly 25 in and passes the exception the same way -- while a 30-in disc still does **not** fit it, which
is precisely what the exception exists for.

**The fuzzer verifies the advice, not just the arithmetic:** feeding each reported "other side needed"
back in must produce a stall that passes that path.

**Measurement matters as much as the numbers.** Finished interior at the top of the threshold, exclusive
of valves, showerheads, soap dishes, and grab bars -- so tile, mud bed, and a bench all come out, and a
stall framed at 32 in can finish under 30. The dimension must continue to at least 70 in above the drain,
so a sloped ceiling or low soffit can fail a compartment that measures fine at the curb.

## 3. Scope

Rectangular compartments only; a neo-angle, round, or irregular stall needs the disc drawn on the actual
plan. Not checked: the door or opening and its swing, receptor slope and drain, waterproofing, the 70-in
height itself, or accessible roll-in and transfer stalls under ANSI A117.1 and the ADA Standards, which
are governed separately and are larger. All four thresholds are editable for local amendments.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `fixture-clearance-check`,
`plumbing-fixture-count`, and `flooring-takeoff`. Fuzzer pins both fixtures, all four condition seams, the
disc identity and orientation invariance across 36 shapes, the round-trip on both "other side needed"
values, that a base-path pass always clears the exception's dimension, editable thresholds, and every
error seam.
