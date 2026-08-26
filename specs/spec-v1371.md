# roughlogic.com Specification v1371 -- Gobo Projected Image Size and Keystone (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group N computes stage lighting beam and throw and the throw distance for a target pool, but not the projected image -- what a gobo actually covers on a surface, and how much the image stretches when the fixture is not perpendicular to it. Keystone is the part that ruins a logo projection and the part nobody computes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive throw distance or field angle, a field angle at or above 180 degrees, or an incidence angle at or above 90 degrees, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the field-angle projection geometry and the 1/cos keystone stretch (standard projection geometry), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `gobo-image-size` -- Gobo Projected Image Size and Keystone

```
image diameter   = 2 x throw x tan(field angle / 2)
keystone stretch = 1 / cos(incidence angle)
stretched axis   = image diameter x keystone stretch
illuminance drop = cos(incidence angle)
```

A gobo fills the fixture's field, so the projected image is the field-angle cone intersected with the surface.
Straight on, that is a circle whose diameter is twice the throw times the tangent of half the field angle -- the
same geometry as the beam pool, applied to the image rather than the light.

Off perpendicular, the circle becomes an ellipse. The axis in the plane of the tilt stretches by `1/cos` of the
incidence angle while the perpendicular axis does not stretch at all, which is what makes a projected logo look
like a trapezoid. At 45 degrees the stretch is 1.41; at 60 degrees it is 2.00 -- the image is twice as long as it
is wide. The same cosine works against you on brightness: the light is spread over more area, so illuminance falls
by `cos` of the same angle.

**Inputs:** throw distance (ft), fixture field angle (deg), incidence angle off perpendicular (deg), and
optionally the gobo's usable image diameter and the fixture's gate diameter for a partial-frame image.

**Outputs:** perpendicular image diameter (ft), keystone stretch factor, stretched-axis length, and the relative
illuminance compared with a perpendicular hit.

## 3. Worked example

A 36-degree ellipsoidal at a 30 ft throw:

```
image = 2 x 30 x tan(18 deg) = 60 x 0.3249 = 19.5 ft across, perpendicular
```

Hang the same fixture 45 degrees off perpendicular to the surface -- a normal front-of-house angle onto a back
wall -- and the tilt axis stretches:

```
stretch = 1 / cos(45) = 1.414
long axis = 19.5 x 1.414 = 27.6 ft
illuminance = cos(45) = 0.71, half a stop down
```

So a logo that reads 19.5 ft wide straight on becomes 27.6 ft tall and noticeably dimmer, and it needs either
optical keystone correction, a distorted gobo cut to compensate, or a better hanging position. The tile makes the
case for the better position before the gobo is ordered.

## 4. Scope and non-goals

Field-angle geometry, not photometrics. The tile does not compute illuminance in footcandles (the catalog's
lumen-method and beam tiles do that), does not model the difference between beam angle and field angle for a
specific fixture, and does not account for the loss of focus across a keystoned image -- an off-axis projection
cannot be sharp across its whole area with a single focal plane, which is often the real limit rather than the
geometry. Zoom fixtures change the field angle; framing shutters change the shape. The fixture's photometric data
and the designer govern.
