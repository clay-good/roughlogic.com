# roughlogic.com Specification v1438 -- Gas Spring Force and Mounting Geometry (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A gas strut is chosen by force rating and the force rating comes from a moment balance nobody writes down: the lid's weight acting through its center of gravity against the strut acting through a much shorter moment arm. Get the arm wrong and the lid either will not stay up or cannot be closed. Nothing in the catalog touches it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive lid weight, center-of-gravity distance, or moment arm, or a strut count below one, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the static moment balance about the hinge for a gas-spring-supported panel and the extended-force rating convention for gas springs, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `gas-strut-force` -- Gas Spring Force and Mounting Geometry

```
lid moment about hinge = weight x horizontal distance from hinge to center of gravity
strut moment           = strut force x perpendicular moment arm from hinge to the strut line
required force per strut = lid moment / (number of struts x moment arm)
```

Everything is a moment about the hinge. The lid's weight acts at its center of gravity, which for a uniform panel
is halfway along it, and the strut pushes along its own line at whatever perpendicular distance the mounting
points give it. That perpendicular distance is the **moment arm**, and it is almost always much shorter than the
lid's -- which is why struts are rated in the tens or hundreds of pounds for lids that weigh far less.

The moment arm is also the design variable. Moving the strut's body-side mount farther from the hinge lengthens
the arm and reduces the force required, sometimes dramatically. Moving it closer shortens the arm and can drive
the required force past anything available. Two struts halve the requirement, which is why almost everything uses
a pair.

The catch a first-time designer meets is that both moments change through the swing, and they do not change at
the same rate. The lid's moment falls as it opens, because the horizontal distance to the center of gravity
shortens toward zero at vertical. The strut's arm typically grows and then shrinks. A strut sized only at the
closed position may hold the lid there and then fling it open, or hold it open and refuse to close.

**Inputs:** lid weight, hinge-to-center-of-gravity distance, strut perpendicular moment arm at the position being
checked, number of struts, and the opening angle.

**Outputs:** lid moment, required force per strut, the total force, and the required force at a second opening
angle for comparison.

## 3. Worked example

A 40 lb hatch whose center of gravity sits 18 in from the hinge, supported by two struts with a 4 in perpendicular
moment arm in the closed position:

```
lid moment  = 40 x 18            = 720 in-lb
per strut   = 720 / (2 x 4)      = 90 lb each
```

Two 90 lb struts. Now move the body-side mount to give a 6 in arm instead of 4: the requirement falls to 60 lb
each, a third less force for a change in a mounting hole location. Move it the other way to a 2.5 in arm and each
strut needs 144 lb, and the hatch becomes genuinely hard to pull closed against them.

## 4. Scope and non-goals

A static moment balance at one position. Gas springs are not constant-force devices -- the force rises through
compression by roughly 20% to 40% between extended and compressed, and that progression interacts with the
changing geometry in ways this single-position check does not capture. Real selection is done at several angles,
or from the manufacturer's selection software with the actual mounting coordinates. The tile does not account for
seal friction, which makes extending and retracting forces differ by a noticeable amount, for the substantial
force loss in cold weather, for damping, or for end-of-stroke behavior. It does not check the mounting brackets,
the ball studs, or the panel itself, which are what fail. **Gas springs are pressurized and must never be opened,
heated, or cut.** The manufacturer's selection data governs.
