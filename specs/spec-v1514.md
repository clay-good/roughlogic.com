# roughlogic.com Specification v1514 -- Belt Feeder Volumetric Capacity and Draw-Down (`calc-mining.js`, Group E Carpentry and Construction, quarry and aggregate, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A belt feeder's output is set by the opening it draws through and the belt speed, not by the belt's carrying capacity, and mixing the two up is how a feeder gets bought that cannot deliver. The volumetric arithmetic is one multiplication and it belongs on a phone at the hopper.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive opening width, opening height, belt speed, or bulk density returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the volumetric feeder relation and the distinction from surcharged conveyor capacity, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`belt feeder capacity`, `feeder tph opening`, `volumetric feeder rate`, `hopper draw down feeder`, `belt speed for tonnage`.

## 2. The tile

### 2.1 `belt-feeder-capacity` -- Belt Feeder Volumetric Capacity and Draw-Down

```
volumetric flow   Q = w x h x v          (opening width x height x belt speed)
mass flow         TPH = Q x bulk density / 2,000
required speed    v = TPH x 2,000 / (w x h x density)
draw-down         a feeder must draw across the FULL hopper opening or the material ratholes
```

A belt feeder is a metering device: the material sits in a hopper and the belt pulls a ribbon out from under
it whose cross-section is fixed by the gate opening. Output is therefore linear in speed, which is what makes a
feeder controllable, and linear in the opening, which is what makes it adjustable. A conveyor, by contrast,
carries whatever is put on it in a surcharged profile, and its capacity formula does not apply here at all.

The failure this arithmetic does not capture but the tile should warn about is ratholing. A feeder that draws
material from only part of the hopper opening -- because the belt speed profile is uneven or the interface is
badly designed -- creates a flow channel while the rest of the hopper stays static, and the static material
eventually consolidates into an arch that stops flow entirely. The fix is an interface that increases in
cross-section in the direction of travel so the belt draws progressively along the whole opening, and it is a
design feature rather than an adjustment.

**Inputs:** opening width and height, belt speed, material bulk density, and the target tonnage when solving for speed

**Outputs:** the volumetric flow in cubic feet per hour, the mass flow in TPH, the belt speed required for a target tonnage, the opening height required at a fixed speed, and the flow at the maximum and minimum speeds of a variable drive

## 3. Worked example

A 36 in wide feeder with an 8 in gate opening, belt at 60 fpm, material at 100 pcf:

```
Q   = (36/12) x (8/12) x 60 x 60 = 7,200 cu ft/h
TPH = 7,200 x 100 / 2,000            = 360 TPH
```

360 TPH. To hit 400 TPH the belt has to run
`400 x 2,000 / (3.0 x 0.67 x 100 x 60)` = 67 fpm, or the gate has to
open to `400 x 2,000 / (3.0 x 60 x 100 x 60) x 12` = 8.9 in at the
original speed.

The density check is worth running in the field: the same feeder on 160 pcf ore instead of 100 pcf
material delivers 576 TPH at the same setting. A feeder calibrated on one material is not calibrated on
another, and a plant that changes feed and keeps the setpoint has silently changed its tonnage by 60%.

## 4. Scope and non-goals

Volumetric capacity for a belt feeder with a fixed rectangular opening. It assumes the material fills the
opening uniformly and flows freely, which is exactly what does not happen with wet, sticky, or cohesive material:
arching, ratholing, and flushing are flow problems that depend on the material's shear properties and the
hopper's geometry, and they are resolved by a flow-properties test and a hopper design, not by this formula. It
does not compute the belt pull or drive power a feeder requires, which is much higher than a conveyor's because
the belt is shearing material under a full hopper load and which is a common undersizing error. It does not
address the feeder-to-hopper interface geometry that produces uniform draw. Conveyor capacity and power are
`belt-conveyor-tension-power`. The feeder manufacturer, a material flow-properties test, and the plant designer
govern.
