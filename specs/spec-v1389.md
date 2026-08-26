# roughlogic.com Specification v1389 -- Hose Lay Section Count, Reach, and Charged Weight (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group F computes friction loss for every hose configuration it carries but never counts the hose. How many sections a lay takes, how much slack the terrain adds, and what the charged line weighs are the three things that decide whether the lay is a two-person job or a company evolution, and none of them is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive lay distance, section length, or hose diameter, or a slack allowance below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the hose section-count and slack-allowance practice, and the water weight of a filled hose from its internal volume at 8.34 lb/gal, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `hose-lay-section-count` -- Hose Lay Section Count, Reach, and Charged Weight

```
lay length      = map distance x (1 + slack allowance)
sections        = ceil(lay length / section length)
actual reach    = sections x section length
water per foot  = pi x (d/2)^2 x 12 / 231     gal per ft, d in inches
charged weight  = sections x (dry weight + water per section x 8.34)
```

The section count is a ceiling function on a padded distance, and both halves matter. A hose lay never runs the
straight-line distance: it goes around the building, up the stairs, and over the fence, and a 20% slack allowance
is a conservative planning figure that a bad approach will exceed. Undercounting by one section at the end of a
600 ft lay is a break in the line at the worst possible moment.

The weight line is the one crews feel. A 50 ft section of 2.5 in hose holds nearly 13 gallons -- over a hundred
pounds of water on top of the hose itself -- so a fifteen-section lay is a ton of charged line on the ground.
That is the number behind every rule about advancing dry and charging at the door.

**Inputs:** map distance to the objective (ft), slack allowance (fraction), section length (ft), hose inside
diameter (in), dry weight per section (lb).

**Outputs:** padded lay length, sections required, actual reach, gallons in the charged lay, and total charged
weight.

## 3. Worked example

A 600 ft approach with 20% slack, 50 ft sections of 2.5 in hose at 30 lb dry per section:

```
lay length    = 600 x 1.20            = 720 ft
sections      = ceil(720 / 50)        = 15 sections   (12 would have covered only the map distance)
water per ft  = pi x 1.25^2 x 12/231  = 0.255 gal/ft
per section   = 0.255 x 50 x 8.34     = 106 lb of water
charged weight= 15 x (30 + 106)       = 2,040 lb
```

Twelve sections is what the map says and fifteen is what the ground takes -- three sections of difference, which
is the whole reason a lay is counted before it is pulled. And the charged lay is over a ton, spread across 750
feet: perfectly manageable while it is moving on the ground, and immovable the moment it has to be advanced up a
stairwell.

## 4. Scope and non-goals

Counting and weight, not hydraulics. Friction loss, pump discharge pressure, nozzle reaction, and appliance
losses are separate tiles in this group and are what determine whether the lay will actually flow -- a lay long
enough to reach can easily be too long to supply at the required nozzle pressure, and the friction tiles are where
that is settled. The slack allowance is a planning judgment, not a measurement. The tile does not address hose
testing, condition, or the department's standard lay configurations. Department SOPs and the incident commander
govern.
