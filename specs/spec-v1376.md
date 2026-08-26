# roughlogic.com Specification v1376 -- Outdoor Stage and Banner Wind Load with Ballast (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A banner, scrim, or backdrop on an outdoor stage is a sail, and the ballast that keeps it from going over is the single most consequential number on an outdoor show site. The catalog computes wind loads on buildings and on PV arrays but has nothing for temporary entertainment structures, where the loads are smaller and the consequences of getting them wrong are more immediate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive area, wind speed, drag coefficient, base width, or safety factor, or a centroid height at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the velocity-pressure relation q = 0.00256 V^2 and the overturning-versus-resisting-moment check, with ANSI E1.21 (temporary structures used for outdoor entertainment) cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `outdoor-stage-wind` -- Outdoor Stage and Banner Wind Load with Ballast

```
q (psf)             = 0.00256 x V^2            (V in mph)
force               = q x Cd x area
overturning moment  = force x centroid height
resisting moment    = ballast weight x (base width / 2)
required ballast    = force x centroid height x safety factor / (base width / 2)
```

Velocity pressure rises with the *square* of wind speed, which is the fact that catches people out: a 40 mph gust
does not carry twice the load of a 20 mph one, it carries four times. The drag coefficient for a flat panel
normal to the wind is around 1.3, and a solid banner is exactly that -- there is no shape to shed the load.

The overturning check is a moment balance about the downwind base edge. The wind force acts at the banner's
centroid height, and the only thing resisting it is the ballast acting at half the base width. Because the lever
arms are so different -- a banner centroid twelve feet up against a four-foot resisting arm -- the required
ballast is several times the wind force itself, and the numbers get large fast.

The safety factor and the wind speed at which the structure must come down are the two decisions ANSI E1.21
requires be made *in advance*, written into an operations management plan, with someone watching an anemometer
and the authority to stop the show.

**Inputs:** banner or scrim height and width (ft), centroid height above the base (ft), wind speed (mph), drag
coefficient, base width between ballast points (ft), safety factor.

**Outputs:** velocity pressure (psf), wind force (lb), overturning moment (ft-lb), required ballast (lb), and the
wind speed at which a stated ballast is exhausted.

## 3. Worked example

A 20 x 8 ft banner whose centroid sits 12 ft above the base, in a 40 mph gust, base width 8 ft, safety factor 1.5:

```
q         = 0.00256 x 40^2   = 4.10 psf
area      = 20 x 8           = 160 sq ft
force     = 4.10 x 1.3 x 160 = 852 lb
moment    = 852 x 12         = 10,224 ft-lb
ballast   = 10,224 x 1.5 / 4 = 3,834 lb
```

Nearly two tons of ballast to hold one banner in a 40 mph gust -- and that is a gust an ordinary summer
thunderstorm produces. Drop the design wind to 30 mph and the required ballast falls to 2,157 lb, because the
square law works in both directions; raise it to 55 mph and it climbs to 7,248 lb. The design wind speed is the
most expensive number on the drawing, and the honest way to reduce it is to plan to drop the banner, not to
assume the storm will be small.

## 4. Scope and non-goals

A screening calculation for one flat element on one axis, not an engineered analysis of a temporary structure.
It uses a bare velocity-pressure form without the exposure, gust-effect, topographic, and directionality factors
that ASCE 7 applies, so it is not an ASCE 7 wind load and must not be presented as one. It does not check
sliding, uplift, the roof or header above, the connection of the banner to the frame, or the ground bearing under
the ballast. Temporary outdoor entertainment structures are engineered and permitted work in most jurisdictions
and require an operations management plan with defined wind action levels under ANSI E1.21. A licensed engineer
and the AHJ govern.
