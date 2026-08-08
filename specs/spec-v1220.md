# roughlogic.com Specification v1220 -- Acme (29-degree) Thread Depth and Dimensions (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K), no new module, group, or dependency. Inherits spec.md through spec-v1219.md.
>
> **The gap.** The `thread-single-depth` tile is restricted to the 60-degree Unified/UN form ("60-degree external
> (Unified/UN)"); the 29-degree Acme lead-screw / power-transmission thread had no tile. A thread-form family-completion.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive major diameter or TPI, or a pitch too coarse for the diameter (a
non-positive computed minor) returns `{ error }`. Citation discipline (v19/v22): general-purpose Acme geometry as
compiled in Machinery's Handbook / ASME B1.5, by name, `GOVERNANCE.general`. **No copyrighted table is reproduced** --
the relations are closed-form and the major diameter and TPI are the thread's spec.

## 2. The tile

### 2.1 `acme-thread-depth` -- Acme (29-degree) Thread Depth and Dimensions

```
pitch P    = 1 / TPI
depth h    = P/2 + 0.010 in            (general-purpose external clearance)
pitch dia  = D - P/2
minor dia  = D - 2h = D - P - 0.020    (external root)
crest flat = 0.3707 P
included angle = 29 degrees
```

**Inputs:** major (nominal) diameter D (in), threads per inch TPI.

**Outputs:** pitch, thread depth, pitch diameter, minor diameter, crest flat width.

## 3. Worked example

`major_dia_in = 1.0, tpi = 5` (a "1-5 Acme"):

```
P         = 1/5 = 0.200 in
depth     = 0.200/2 + 0.010 = 0.110 in
pitch dia = 1 - 0.100 = 0.900 in
minor     = 1 - 0.200 - 0.020 = 0.780 in
crest flat = 0.3707 x 0.200 = 0.0741 in
```

matching the published 1-5 Acme table. A coarser 1.5-4 Acme gives a 0.250 in pitch, a 0.135 in depth, and a 1.230 in
minor.

## 4. Limitations

General-purpose class only. The Stub Acme (0.3 P depth) and the centralizing (C) classes differ. Geometry only; cut with
a 29-degree tool and verify the pitch diameter over wires. ASME B1.5 and a thread gauge govern the finished fit.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1220` pins the depth (P/2 + 0.010), the published 1-5 Acme dimensions, the minor =
  major - 2h consistency, coarser-is-deeper, and the error seams (including a too-coarse pitch).
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 1-5 Acme example and the 1.5-4 cross-check).
- Formula checked against Machinery's Handbook / ASME B1.5 general-purpose Acme dimensions.
