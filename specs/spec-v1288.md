# roughlogic.com Specification v1288 -- Power-Screw Torque, Efficiency, and Self-Locking (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1287.md.
>
> **The gap.** `acme-thread-depth` and `stub-acme-thread-depth` give the *geometry* of a lead screw and their note
> names the use ("vises, presses, machine lead screws") -- but the mechanics, the **torque to raise or lower a
> load** and whether the screw is self-locking, was never built. This adds the standard Shigley power-screw
> equations, the thing you actually need to size a jack, a clamp, or a lead-screw drive.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive load / mean diameter / lead, a negative friction coefficient, a negative collar diameter, or a
degenerate geometry (thread friction so high the raising denominator is non-positive) returns `{ error }`; no numeric
field is ever `Infinity`. Citation discipline (v19/v22): the power-screw raising/lowering torque with the thread
half-angle correction and the collar-friction term (Shigley, *Mechanical Engineering Design*, Ch. 8), by name,
`GOVERNANCE.general`.

## 2. The tile

### 2.1 `power-screw-torque` -- Power-Screw Torque, Efficiency, and Self-Locking

```
sec_a = 1/cos(alpha)   thread half-angle: square 0, Acme 14.5 deg, Unified/60 30 deg
T_raise = (F dm/2)(l + pi mu dm sec_a)/(pi dm - mu l sec_a) + F muc dc/2
T_lower = (F dm/2)(pi mu dm sec_a - l)/(pi dm + mu l sec_a) + F muc dc/2
efficiency = F l / (2 pi T_raise)
self-locking (no back-drive) if pi mu dm sec_a > l   (thread torque to lower is positive)
```

`F` is the axial load, `dm` the mean thread diameter, `l` the lead (pitch x number of starts), `mu` the thread
friction, and `muc`/`dc` the collar (thrust-face) friction and mean diameter. The collar term is added to both
directions; set `dc = 0` for a rolling thrust bearing. A self-locking screw holds the load with no brake; if not
self-locking (a steep lead or slick thread) the load runs the screw back down.

**Inputs:** axial load F (lbf), mean diameter dm (in), lead l (in), thread friction mu, collar friction muc, collar
mean diameter dc (in), thread form (square / Acme / Unified 60 deg).

**Outputs:** raising torque and lowering torque (in-lbf), efficiency (%), self-locking (yes/no), and the lead angle.

## 3. Worked example

1,000 lbf on a 1 in mean-diameter, 0.2 in lead (single-start 1-5 Acme) screw, thread friction 0.15, a 1.5 in collar
at 0.15:

```
sec_a = 1/cos(14.5) = 1.033,  lead angle = atan(0.2/(pi x 1)) = 3.64 deg
T_raise = 500 (0.2 + pi x 0.15 x 1.033)/(pi - 0.15 x 0.2 x 1.033) + 1000 x 0.15 x 1.5/2 = 110.4 + 112.5 = 223 in-lbf
T_lower = 500 (pi x 0.15 x 1.033 - 0.2)/(pi + 0.15 x 0.2 x 1.033) + 112.5 = 45.2 + 112.5 = 158 in-lbf
efficiency = 1000 x 0.2 / (2 pi x 223) = 14.3%
```

The lowering thread torque is positive, so the screw is self-locking -- it holds the load without a brake. Drop the
collar (a thrust bearing) and the efficiency nearly doubles to 29%; the collar friction, not the thread, eats most
of the input. That collar penalty is exactly what the geometry-only Acme tiles cannot show.

## 4. Scope and non-goals

The raising/lowering torque, efficiency, and self-locking screen for a single power screw; the thread half-angle is
taken directly (the small lead-angle correction to the normal plane is neglected, as in the standard textbook form).
Thread and collar friction coefficients are the user's (0.10-0.20 typical for steel on steel, dry to greased).
Column buckling of a long screw, thread bearing/shear stress, and wear life are separate. A design aid; Shigley and
the maker govern.
