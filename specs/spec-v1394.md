# roughlogic.com Specification v1394 -- Two-Bearing Resection (Locate Yourself from Known Points) (calc-survey.js, Group P, field, survey, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-survey.js`**
> (Group P, field, survey, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group P has COGO forward locate, COGO inverse, and distance-distance intersection -- every way of finding a point except the one a person standing in the field with a compass or an instrument actually uses. Resection works backward from bearings to known points to fix an unknown occupied station, and it is the oldest and most useful of the lot.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive coordinate spread, two identical known points, or two observed bearings whose back-lines are parallel or nearly so (the intersection is ill-conditioned), returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the bearing-bearing (resection) intersection of two back-lines from known control, and the three-point cocked-hat check, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `three-point-resection` -- Two-Bearing Resection

```
back azimuth from A = observed azimuth to A + 180 (mod 360)
line from A         : (Ax + t sin(backA), Ay + t cos(backA))
line from B         : (Bx + s sin(backB), By + s cos(backB))
solve the two lines for t and s; the occupied point is the intersection
strength of fix     = the intersection angle between the two lines
```

Standing at an unknown point, you shoot a bearing to a known feature. That bearing, reversed, is a line *from*
the known feature *through* you -- the back azimuth. Do it to a second known feature and you have two lines, and
where they cross is where you are. That is the whole method, and it works identically with a compass on a
1:24,000 quad and with a total station on control monuments.

The strength-of-fix output is what keeps it honest. When the two lines cross near 90 degrees the fix is sharp;
when they cross at a shallow angle a small bearing error slides the intersection a long way along the lines. Under
about 30 degrees of intersection angle the fix should not be trusted, and the answer is a third known point --
whose three back-lines will not meet at a point but will form a small triangle, the "cocked hat," whose size is the
honest statement of how good the fix is.

**Inputs:** coordinates of two (or three) known points, the observed azimuth from the occupied point to each, and
the declination correction if the bearings are magnetic.

**Outputs:** the occupied point's coordinates, the distance to each known point, the intersection angle, and --
with a third point -- the cocked-hat triangle's size.

## 3. Worked example

Known points A at (1000, 5000) and B at (3000, 5400). From the occupied point, the azimuth to A reads 315 degrees
and the azimuth to B reads 45 degrees:

```
back azimuth from A = 135 deg;  back azimuth from B = 225 deg
solving the two lines:  t = 1,131.4 ft along the A line, s = 1,697.1 ft along the B line
occupied point = (1,800.0, 4,200.0)
check from B   = (3000 - 1200, 5400 - 1200) = (1,800.0, 4,200.0)   agrees
intersection angle = 225 - 135 = 90 deg   -> a strong fix
```

Ninety degrees is as good as resection gets. Move the occupied point so that both known features lie nearly in
the same direction -- say back azimuths of 135 and 155 -- and the same one-degree bearing uncertainty that was
worth about 20 ft here becomes worth 60 to 90 ft, because the positional error scales as one over the sine of
the intersection angle.

## 4. Scope and non-goals

Plane coordinates, two-dimensional. Bearings must be reduced to the same reference as the coordinates: a magnetic
compass bearing needs the declination correction first (the catalog has a magnetic declination tile), and a grid
bearing is not a geodetic one. The tile does not perform a least-squares adjustment across three or more
observations, does not weight observations by their quality, and does not detect a blunder -- a cocked hat can be
small and the fix still wrong if two of the three bearings share the same error. It does not address the
danger-circle geometry that makes a classical three-point resection indeterminate when the occupied point falls
on the circle through the three known points. A licensed surveyor governs any boundary or control work.
