# roughlogic.com Specification v1031 -- Trapezoidal Channel / Swale Capacity (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1030.md.
>
> **The gap, and the evidence for it.** A self-declared gap: `channel-normal-depth`'s own citation says
> "trapezoidal sections and backwater profiles are separate." All three existing open-channel tiles
> (`channel-normal-depth`, `channel-froude-number`, `specific-energy`) take a bare `b_ft` with no side
> slope, and the pipe tiles are circular. Every real swale, roadside ditch, and lined channel is
> trapezoidal, so the catalog could size the one section that almost never gets built.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: negative
geometry, a degenerate section (zero bottom width AND vertical sides), or non-positive depth / n / slope
return `{ error }`. Citation discipline: Manning uniform flow as compiled in Chow, by name; no table
shipped -- n is an input with typical values named in the field label. Renderer: hand-written
non-exported, this module's convention.

## 2. The tile

### 2.1 `trapezoidal-channel-flow` -- Trapezoidal Channel / Swale Capacity (Manning)

```
inputs:  bottom_width_ft (b, 0 = V-ditch), side_slope_z (z horizontal : 1 vertical, default 2),
         depth_ft (y), n (0.03), s_slope (ft/ft)
compute: A = (b + z y) y
         P = b + 2 y sqrt(1 + z^2)
         R = A / P
         V = (1.486/n) R^(2/3) sqrt(S)
         Q = A V   (also reported in gpm)
         T = b + 2 z y            top width
         D = A / T                hydraulic depth
         Fr = V / sqrt(g D)       g = 32.174
outputs: area_sf, wetted_perim_ft, hyd_radius_ft, velocity_fps, flow_cfs, flow_gpm,
         top_width_ft, hyd_depth_ft, froude, regime, note
```

**Two details that make this more than a formula transcription.** (1) The Froude number is taken on the
HYDRAULIC depth A/T, not the flow depth y -- for a rectangle those are the same number, which is why the
rectangular sibling can get away with y, but for a trapezoid they differ (2.18 ft vs 3.00 ft in the
worked example) and using y would misreport the regime. (2) A bottom width of 0 is legal and is the
V-ditch case; only the genuinely degenerate section (b = 0 AND z = 0) errors.

**Worked example (pinned).** b = 10 ft, z = 2, y = 3 ft, n = 0.03, S = 0.001: A = 48 sf,
P = 23.4164 ft, R = 2.0498 ft, V = 2.5276 ft/s, Q = 121.33 cfs, T = 22 ft, D = 2.1818 ft, Fr = 0.302
(subcritical). V-ditch cross-check: b = 0, z = 3, y = 1.5 ft, n = 0.035, S = 0.02 -> Q = 32.30 cfs at
4.79 ft/s, Fr 0.974 -- close enough to critical that the note's warning about unstable flow earns its
place.

## 3. Scope limits

Uniform (normal) flow at the depth entered -- NOT the depth of a channel that carries a given flow (the
inverse problem) and no freeboard allowance. Prismatic section; backwater profiles, irregular natural
sections, and composite roughness are separate. Erosion depends on velocity and lining; `riprap-d50`
sizes rock for a velocity. The engineer of record and the local drainage manual govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. The fuzzer's strongest pin is a cross-implementation
one: at z = 0 the trapezoid must reproduce the RECTANGULAR formula exactly (same A, P, R, V, Q), which
ties the new tile to the landed sibling's math rather than only to itself. It also pins the worked
example, the V-ditch case, area/perimeter identities, monotonicity in depth and slope, the exact
sqrt(S) scaling, and error seams.

**No cap bump needed.** This tile was originally written against a `calc-plumbing.js` sitting at 99.4% of its
76,000 B cap and carried a raise to 82,000. Between writing and landing, spec-v1030 split the takeoff bench
out into `calc-plumbingtakeoff.js` and returned the module to 90.8%, so the raise was dropped and the tile
lands inside the existing cap -- the split doing exactly the job its own spec argued for.
