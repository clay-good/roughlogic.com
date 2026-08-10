# roughlogic.com Specification v1290 -- Euler-Johnson Column Buckling (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1289.md.
>
> **The gap (a sibling names it).** The catalog has column buckling for *wood* (`column-buckling-wood`, NDS),
> *concrete* (`rc-slender-column-magnify`, ACI), and *AISC steel* (`steel-column-capacity`), but no general
> **Euler-Johnson** critical-load check for a machine member -- a lead screw, push rod, connecting link, or strut.
> The `power-screw-torque` tile (spec-v1288) explicitly names "column buckling of a long screw" as separate. This
> builds the standard Shigley/mechanics column formula with the Euler-vs-Johnson transition.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive modulus / yield / moment of inertia / area / length, or an unknown end condition, returns
`{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the Euler critical load and the
J.B. Johnson parabolic formula for intermediate columns with the transition slenderness (Shigley, *Mechanical
Engineering Design*, Ch. 4 -- columns), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `euler-johnson-column` -- Euler-Johnson Column Critical Load

```
r = sqrt(I/A)                        radius of gyration
SR = K L / r                         effective slenderness ratio
SR_D = pi sqrt(2 E / Sy)             Euler/Johnson transition
if SR >= SR_D  (long):   Pcr = pi^2 E I / (K L)^2                      Euler
else           (short):  Pcr = A [ Sy - (Sy SR / (2 pi))^2 / E ]      J.B. Johnson parabola
```

End-condition constant K (theoretical): pinned-pinned 1.0, fixed-free 2.0, fixed-fixed 0.5, fixed-pinned 0.7. The
Johnson parabola is tangent to the Euler curve at `SR_D` and to the yield line at SR = 0, so it correctly caps the
short-column load at the squash load `A Sy` where the Euler hyperbola would wrongly run to infinity.

**Inputs:** modulus E (psi), yield strength Sy (psi), moment of inertia I (in^4), cross-section area A (in^2),
unbraced length L (in), end condition.

**Outputs:** critical buckling load Pcr (lbf), critical stress (psi), slenderness ratio, transition slenderness,
and which formula governs (Euler or Johnson).

## 3. Worked example

Steel strut, E 30e6, Sy 40 ksi, I 0.05 in^4, A 1 in^2, L 20 in, pinned-pinned (K = 1):

```
r = sqrt(0.05/1) = 0.224 in,  SR = 20/0.224 = 89.4,  SR_D = pi sqrt(2 x 30e6/40000) = 121.7
SR < SR_D  ->  Johnson:  Pcr = 1 x [40000 - (40000 x 89.4 / (2 pi))^2 / 30e6] = 29,200 lbf
```

At SR 89.4 the Euler formula would predict 37,000 lbf; Johnson gives the correct, lower 29,200 lbf because the
column is intermediate, not slender. Stretch it to L 50 in (SR 224, above the transition) and it flips to Euler at
5,920 lbf -- long columns buckle elastically, and the load drops with the square of the length.

## 4. Scope and non-goals

The concentric critical buckling load for a straight, prismatic column by the Euler and Johnson formulas; eccentric
loading (the secant formula), local/flange buckling, and code-specific steel/wood/concrete provisions are separate
(`steel-column-capacity`, `column-buckling-wood`, `rc-slender-column-magnify`). Use a safety factor on Pcr. A design
aid; Shigley and the engineer of record govern.
