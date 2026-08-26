# roughlogic.com Specification v1392 -- Radiant Exposure Separation Distance (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog checks exterior wall openings against a fire separation distance the code assigns, but nothing computes the physics underneath: how far a given fire's radiant heat reaches before it can ignite what is next to it. That is the question at a lumber yard, a tank farm, a wildland-urban interface, and a fire-ground exposure line, and it is a point-source inverse-square calculation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive fire size, radiative fraction, or target flux, or a radiative fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the point-source radiation model q = X_r Q / (4 pi r^2) and the commonly used piloted-ignition and safe-exposure flux thresholds, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `radiant-exposure-separation` -- Radiant Exposure Separation Distance

```
radiated power = radiative fraction x fire heat release rate
flux at r      = radiated power / (4 pi r^2)
separation     = sqrt(radiated power / (4 pi x target flux))
```

A fire radiates a fraction of its heat release rate -- roughly 0.2 to 0.4 for most fuels, with 0.3 a common
working value -- outward in all directions. Treated as a point source, that power spreads over the surface of a
sphere, so the flux falls with the square of distance. Doubling the separation quarters the exposure.

The target flux is the decision. Widely used thresholds put piloted ignition of wood near 12.6 kW/m2, spontaneous
ignition much higher, the pain threshold for bare skin around 2.5 kW/m2, and a commonly cited limit for a
firefighter in full protective clothing operating for a sustained period well below the ignition figure. Which
threshold is chosen moves the answer a long way, and the tile reports the distance for whichever one is asked
for -- protecting a wood wall is a different problem from protecting a person.

**Inputs:** fire heat release rate (kW or MW), radiative fraction, target radiant flux (kW/m2), or a distance to
evaluate the flux at.

**Outputs:** radiated power, safe separation distance (m and ft) for the target flux, and the flux at a stated
distance.

## 3. Worked example

A 5 MW fire -- roughly a fully involved passenger vehicle -- at a radiative fraction of 0.3, against the 12.6
kW/m2 piloted-ignition threshold:

```
radiated power = 0.3 x 5,000 kW              = 1,500 kW
separation     = sqrt(1,500 / (4 pi x 12.6)) = 3.08 m = 10.1 ft
```

Ten feet. Now scale it up by a factor of ten -- a 50 MW fire, a small warehouse compartment fully involved -- and
the separation goes to `sqrt(15,000/158.3) = 9.73 m = 31.9 ft`. Note that a tenfold fire produced only a threefold
distance, because of the square root: separation is a weak lever against fire size, which is why exposure
protection is done with water and with construction rather than with distance alone.

## 4. Scope and non-goals

A point-source screen, and it is a poor one close in. The model is reasonable only at distances greater than
about twice the fire's own diameter; nearer than that it substantially underestimates the flux, and a
configuration-factor or solid-flame model is required. It ignores wind, which tilts the flame and can double the
exposure on the downwind side, flame contact, convective heat, brands and flying embers, and the geometry of both
the fire and the target. It does not evaluate code-required fire separation distance or exterior wall opening
protection, which the catalog handles separately and which is a code question, not a physics one. Fire protection
engineering and the AHJ govern.
