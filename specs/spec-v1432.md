# roughlogic.com Specification v1432 -- Dust Collection Duct Velocity, Diameter, and Branch Balance (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Dust collection is designed backward from every other duct system: air velocity is the requirement and the duct is sized down to meet it, because a duct too large lets the dust drop out and plug the line. The catalog sizes HVAC duct for pressure loss and has nothing at all for conveying velocity.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive airflow, velocity, or duct diameter, or a machine count below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the minimum conveying-velocity practice for wood and metal dust (roughly 3,500 to 4,500 fpm in branches) and the simultaneous-use convention for sizing the main, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `dust-collection-duct` -- Dust Collection Duct Velocity, Diameter, and Branch Balance

```
required area   = airflow / minimum conveying velocity
required diameter = sqrt(4 x area / pi)
actual velocity at a standard size = airflow / actual area
main airflow    = sum of the branches expected open simultaneously
main diameter   = same relation, at the main's minimum velocity
```

Every other duct system in a building is sized for pressure loss, and bigger is better. A dust collection duct is
sized for **velocity**, and bigger is worse: below roughly 3,500 fpm, wood dust and chips settle out of the
airstream and accumulate in the duct until it plugs, and the plug is both a production stoppage and, in the
wrong dust, an ignition and explosion concern. So the rule is to choose the *smallest standard duct* that still
carries the required flow, and to check the resulting velocity rather than assume it.

The main is the second half. Sizing the main for every machine running at once is how a home shop ends up with an
8 inch trunk it cannot pull air through; sizing it for the number of gates actually open -- often one, sometimes
two -- gives a smaller main, a higher velocity, and a collector that works. The simultaneous-use assumption is the
single most consequential input in the whole design.

**Inputs:** required airflow per machine, minimum conveying velocity for branches and for the main, number of
machines and the number expected open at once, available standard duct sizes.

**Outputs:** required branch area and diameter, the standard size to use and the actual velocity at it, main
airflow and diameter, and a flag on any run below the minimum velocity.

## 3. Worked example

A shop with three machines each needing 400 CFM, branches at 4,000 fpm minimum, and at most two gates open at
once:

```
branch area     = 400 / 4,000       = 0.100 sq ft
branch diameter = 4.28 in           -> use 4 in duct
actual velocity = 400 / 0.0873      = 4,584 fpm    (above minimum, correct)

main airflow    = 2 x 400           = 800 CFM
main diameter   = 6.06 in           -> use 6 in duct
actual velocity = 800 / 0.196       = 4,074 fpm    (still above minimum)
```

Round *down* to 4 in on the branch, not up to 5. A 5 in branch at the same 400 CFM runs at only 2,934 fpm, well
below the conveying minimum, and it will fill with chips. The same logic sizes the main: an 8 in main at 800 CFM
would run at 2,292 fpm and become a settling chamber. Rounding up feels safe and is exactly the wrong instinct
here.

## 4. Scope and non-goals

Velocity and geometry only. The tile does not compute system pressure loss, which is what actually determines
whether the collector can move the design airflow through the run -- and a system that is velocity-correct but
static-pressure-starved delivers neither. It does not size the collector or its filtration, address blast gates,
flexible hose (which costs several times the loss of smooth pipe), or fitting losses. Required airflow per machine
is a manufacturer and hood-design figure, not a computation. **It takes no position on combustible dust hazard
management**, which is a serious matter governed by NFPA 652, NFPA 664 for wood, and NFPA 68 and 69 for explosion
protection, and which covers grounding and bonding, duct construction, collector location, and explosion venting.
NFPA, OSHA, and the collector manufacturer govern.
