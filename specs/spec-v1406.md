# roughlogic.com Specification v1406 -- Permissible Residual Unbalance and Balance Grade (ISO 1940) (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has vibration isolation and floor vibration but nothing that says how well a rotating part has to be balanced. ISO 1940 answers it with one relation -- balance grade divided by angular velocity -- and the consequence is counterintuitive: the faster the rotor, the tighter the tolerance, so a part perfectly acceptable at 1,800 rpm is out of specification at 3,600.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive balance grade, rotor speed, rotor mass, or correction radius, or a plane count other than 1 or 2 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the ISO 1940-1 balance quality grade definition (grade G equals permissible eccentricity times angular velocity, in mm/s), cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `rotor-balance-grade` -- Permissible Residual Unbalance and Balance Grade (ISO 1940)

```
omega        = 2 pi x rpm / 60                       rad/s
e_permissible = G x 1000 / omega                     g-mm per kg of rotor
U_permissible = e_permissible x rotor mass in kg     g-mm total
per plane     = U_permissible / number of planes
correction mass = per-plane U / correction radius in mm     grams
```

A balance grade `G` is defined as the permissible eccentricity multiplied by the angular velocity, expressed in
millimetres per second -- so G6.3 means "the center of mass may sit off the axis by however much gives 6.3 mm/s of
rim velocity at operating speed." The grades are a published ladder: G6.3 for general machinery, pumps, and fans;
G2.5 for machine tool drives, turbines, and better electric motors; G1 and G0.4 for grinding spindles and
precision equipment.

The important consequence is in the division. Permissible eccentricity is inversely proportional to speed, so
**doubling the rotor speed halves the allowable unbalance**. A fan balanced to G6.3 at 1,800 rpm and then run at
3,600 rpm is not at G6.3 any more; it is at G12.6, one full grade coarser, and it will vibrate accordingly. That
is why rebalancing is required after a speed change and why a two-speed machine is balanced to its high speed.

The last two lines translate the tolerance into something a balancing machine operator can act on: how many grams
at what radius, split between the correction planes.

**Inputs:** balance grade G, operating speed (rpm), rotor mass (kg), number of correction planes, correction
radius (mm).

**Outputs:** angular velocity, permissible eccentricity, permissible residual unbalance in total and per plane,
and the equivalent correction mass at the stated radius.

## 3. Worked example

A 50 kg rotor at 3,600 rpm to grade G6.3, corrected in two planes at a 150 mm radius:

```
omega          = 2 pi x 3,600 / 60      = 377.0 rad/s
e_permissible  = 6.3 x 1000 / 377.0     = 16.71 g-mm/kg
U_permissible  = 16.71 x 50             = 836 g-mm
per plane      = 418 g-mm
correction mass= 418 / 150              = 2.79 g per plane
```

Under three grams at six inches of radius -- which is about the mass of a small washer, and it gives a sense of
how little material puts a rotor out of tolerance. Now run the same rotor at 1,800 rpm: the permissible unbalance
doubles to 1,671 g-mm, 5.57 g per plane. Same rotor, same grade, twice the tolerance, purely because it turns half
as fast.

## 4. Scope and non-goals

Rigid-rotor balancing under ISO 1940-1. A **flexible** rotor -- one operating above its first bending critical
speed -- cannot be balanced this way at all, because its shape changes with speed; that is ISO 11342 and it is a
different discipline. Balance grade selection comes from the ISO tables for the machine type and is a design
decision, not a calculation. The tile does not address single-plane versus two-plane criteria (a narrow disc may
need only one plane, a long rotor needs two and sometimes more), the distribution of tolerance between planes for
an asymmetric rotor, bearing and support dynamics, resonance, or the fact that a well-balanced rotor in a
resonant structure still vibrates. Measured vibration, not computed unbalance, is the acceptance criterion.
ISO 1940 and 10816, the equipment manufacturer, and the balancing technician govern.
