# roughlogic.com Specification v1444 -- Belt Conveyor Effective Tension and Drive Power (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has screw and auger conveyor capacity but nothing for a belt conveyor, which is the workhorse of every aggregate plant, mine, and material yard. Effective tension is a friction term plus a lift term, and knowing which one dominates is what tells an operator whether shortening the run or flattening the incline is the way to a smaller motor.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive conveyor length, belt speed, or capacity, a negative lift height, or a friction factor or drive efficiency at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the CEMA effective-tension form Te = f L (2 Wb + Wm + Wrot) + H Wm and the drive-power relation hp = Te V / 33,000, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `belt-conveyor-tension-power` -- Belt Conveyor Effective Tension and Drive Power

```
material load Wm = tons per hour x 2000 / (belt speed fpm x 60)     lb per ft of belt
friction term    = f x L x (2 Wb + Wm + Wrot)
lift term        = H x Wm
effective tension Te = friction term + lift term
belt horsepower  = Te x belt speed / 33,000
motor horsepower = belt hp / drive efficiency
```

Effective tension is the force the drive pulley must deliver, and it is the sum of two physically different
things. The **friction term** is everything that resists motion along the run -- the belt itself counted on both
the carrying and return sides, the material, and the rotating mass of the idlers -- multiplied by a friction
factor around 0.022 for a well-maintained conveyor and by the length. The **lift term** is the potential energy
being added, and it is the material weight per foot times the rise. Nothing else.

Which term dominates decides what to fix. On a long flat conveyor, friction is nearly everything and the levers
are idler condition, alignment, and belt tension. On a short steep one, lift is nearly everything and no amount of
maintenance touches it -- the only ways down are less material or less rise. The tile prints both terms so the
question is answered rather than argued.

**Inputs:** conveyor length and lift, capacity (tons per hour), belt speed, belt weight per foot, idler rotating
weight per foot, friction factor, drive efficiency.

**Outputs:** material load per foot, friction and lift terms separately, effective tension, belt horsepower, and
motor horsepower.

## 3. Worked example

A 100 ft conveyor lifting 20 ft, carrying 200 tons per hour at 300 fpm, belt 5 lb/ft, idler rotating 8 lb/ft,
friction factor 0.022, drive efficiency 85%:

```
material load = 200 x 2,000 / (300 x 60)              = 22.2 lb/ft
friction term = 0.022 x 100 x (10 + 22.2 + 8)         = 88.5 lb
lift term     = 20 x 22.2                             = 444.4 lb
Te            = 532.9 lb
belt hp       = 532.9 x 300 / 33,000                  = 4.84 hp
motor hp      = 4.84 / 0.85                           = 5.70 hp  -> a 7.5 hp motor
```

The lift term is five times the friction term. On this conveyor, perfect idlers would save under a horsepower and
cutting the rise in half would save two and a half -- so if the motor is marginal, the answer is the profile, not
the maintenance. Reverse the geometry -- 500 ft of flat run at the same tonnage -- and the friction term becomes
442 lb with no lift term at all, and now idler condition is the entire conversation.

## 4. Scope and non-goals

Effective tension and drive power, which is the first of several conveyor calculations and not the design. It does
not compute the slack-side tension, the wrap and friction needed at the drive pulley to transmit Te without
slipping, the takeup travel and force, or the maximum belt tension that selects the belt's ply rating -- and it is
that maximum tension, not Te, that specifies the belt. It does not check sag between idlers, which governs
minimum tension and determines whether the material spills, address starting torque and acceleration (which for a
loaded incline conveyor can far exceed the running requirement), or size the takeup, pulleys, shafting, or
backstop. **An inclined conveyor without a backstop runs backward when power is lost**, and that is a safety
matter this tile does not address. CEMA, the belt and equipment manufacturers, and the plant engineer govern.
