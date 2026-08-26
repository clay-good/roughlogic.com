# roughlogic.com Specification v1429 -- Garage Door Torsion Spring Torque, Turns, and Rate (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Nothing in the catalog touches overhead door hardware, and the torsion spring is the piece that has to be matched to the door: the torque it must produce is the door's weight on the drum radius, the turns come from the door height, and the required spring rate is one division of the two. Getting it wrong produces a door that runs away in one direction or the other, and a wound torsion spring is genuinely dangerous.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive door weight, height, or drum radius, or a spring count below one, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the torsion-spring balance relation (torque equals door weight times cable drum radius) and the inch-pounds-per-turn (IPPT) spring rate convention used by overhead door manufacturers, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `garage-door-torsion-spring` -- Garage Door Torsion Spring Torque, Turns, and Rate

```
required torque at closed = door weight x cable drum radius
cable travel per turn     = 2 pi x drum radius
turns of spring           = door height / cable travel per turn
required rate (IPPT)      = required torque / turns
rate per spring           = required rate / number of springs
```

A torsion spring balances a door by storing exactly as much torque at the closed position as the door weight
exerts through the cable drum. Torque is weight times drum radius, and that is the target. The number of turns is
pure geometry: the cable has to wind the full door height onto the drum, and one turn takes up the drum's
circumference.

Spring rate -- inch-pounds per turn, IPPT -- is what a supplier is given, and it is the target torque divided by
the turns. Note what that means: two doors of the same weight but different heights need springs of *different*
rate, because the taller door gets more turns to reach the same torque. And two springs share the rate, each
carrying half.

The balance is only exact at one position, because a torsion spring is linear and the door's demand is not once
it starts breaking over the radius. That is why a properly balanced door still needs a few pounds of hand force
mid-travel and why "balanced" means it stays put roughly halfway open.

**Inputs:** door weight, door height, cable drum radius, number of springs, and optionally the wire size, inside
diameter, and length for a rate check against the supplier's table.

**Outputs:** required torque at the closed position, cable travel per turn, turns of the spring, required total
IPPT, and IPPT per spring.

## 3. Worked example

A 7 ft (84 in) door weighing 150 lb on standard 400-8 drums with a 2.0 in effective cable radius, two springs:

```
required torque   = 150 x 2.0            = 300 in-lb
travel per turn   = 2 pi x 2.0           = 12.57 in
turns             = 84 / 12.57           = 6.68 turns
required rate     = 300 / 6.68           = 44.9 IPPT total
per spring        = 44.9 / 2             = 22.4 IPPT each
```

Now change one thing: add an insulated panel that brings the door to 190 lb. The torque goes to 380 in-lb, the
turns are unchanged at 6.68, and the required rate rises to 56.8 IPPT -- a 27% stiffer spring for a 27% heavier
door, which is the linear part. But raise the door to 8 ft instead at the original weight and the rate *falls* to
39.3 IPPT, because the same torque is reached over more turns. Weight and height pull in opposite directions.

## 4. Scope and non-goals

**Torsion springs are stored energy and they injure people.** Winding, unwinding, and replacing them is done with
proper winding bars by someone trained to do it, and a broken cable or a slipping drum turns a wound spring into a
projectile. This tile computes what a spring must do; it does not tell anyone how to install one, and no one
should learn that here.

The tile does not select a spring from wire size, inside diameter, and length -- that is the manufacturer's table
and it also determines the spring's cycle life, which is the property most owners actually care about. It assumes
a single linear spring pair on a standard-lift door with matched drums; high-lift, vertical-lift, and low-headroom
conversions change the drum geometry and the calculation. It does not address the door's own structure, the track,
the operator, or the required entrapment protection. The door and hardware manufacturers, and a qualified
installer, govern.
