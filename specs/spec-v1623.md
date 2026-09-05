# roughlogic.com Specification v1623 -- Fan System Effect and Installed Performance (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A fan that tests fine in a laboratory can deliver far less installed, because the duct connections around it disturb the airflow into and out of it. System effect is the pressure penalty for those connections, and it is why a fan can be at its rated speed and still be short of design.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive fan flow, outlet velocity, or duct diameter, or a negative system effect pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the AMCA 201 system effect concept and effective duct length convention by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fan system effect`, `installed fan performance`, `inlet elbow fan penalty`, `effective duct length fan`, `fan not making design airflow`.

## 2. The tile

### 2.1 `fan-system-effect` -- Fan System Effect and Installed Performance

```
installed performance  the fan curve minus the system effect losses
inlet effects          an elbow close to the inlet, an inlet box, or an obstruction
                       swirl into the inlet in the direction of rotation is the worst case
outlet effects         insufficient straight duct at the discharge; the blast area has not
                       expanded to the full duct, so the recovery does not occur
effective duct length  roughly 2.5 duct diameters at 2,500 fpm, plus one per additional
                       1,000 fpm; less than this and a discharge penalty applies
magnitude              system effect can be a large fraction of the fan's total pressure
```

System effect exists because a fan's rated curve is measured with ideal inlet and outlet conditions, and a real
installation rarely provides them. An elbow directly at the inlet delivers air unevenly across the wheel; worse,
an elbow that pre-spins the air in the direction of rotation reduces the pressure the fan can develop, because
the wheel is doing less work on air that is already moving with it.

The outlet case is about recovery. Air leaves a centrifugal fan through a small blast area at high velocity and
needs straight duct to expand and convert that velocity to static pressure. Cut that length short with an elbow
or a transition and the recovery does not happen, so the fan delivers less static than its curve says at the same
flow.

The reason this belongs in a balancer's hands rather than only a designer's is diagnostic. A fan running at
design rpm with the correct amp draw and still short on flow, with more static pressure across it than the design
calculated, is very often a system effect problem -- and no amount of speeding it up fixes the underlying loss,
it just spends more energy on it. Identifying it points at a duct modification, which is the actual fix.

**Inputs:** fan flow and outlet area, the outlet velocity, the straight duct length at the discharge, the inlet configuration and clearance, the fan curve total pressure, and the measured system pressure

**Outputs:** the outlet velocity, the effective duct length required at that velocity, the straight length available against it, the system effect factor and pressure penalty for the entered inlet and outlet configurations, and the resulting installed performance against the fan curve

## 3. Worked example

A centrifugal fan delivering 12,000 cfm through a 30 in by 24 in outlet, with an elbow 3 ft downstream:

```
outlet area     = 30 x 24 / 144        = 5.0 sq ft
outlet velocity = 12,000 / 5.0         = 2,400 fpm
equivalent duct diameter = sqrt(4 x 5.0 / pi) x 12 = 30.3 in = 2.5 ft
effective duct length required at 2,400 fpm ~ 2.5 diameters = 6.3 ft
available                                                    = 3.0 ft
```

**Less than half the straight length needed**, so an outlet system effect applies -- and at this velocity that
penalty is a meaningful fraction of the fan's static pressure.

The diagnostic value: if this fan is running at design rpm, drawing design amps, and delivering 10,800 cfm
instead of 12,000, the temptation is to speed it up. Speeding it up raises the flow and raises the system effect
with it, and the fan ends up drawing more power to overcome a loss that a longer straight section, a turning vane,
or a different elbow orientation would remove for far less.

The inlet case is worse and more common: an elbow within one diameter of the fan inlet, especially one that
spins the air with the wheel rotation, can cost more than the outlet penalty and is invisible in any measurement
taken downstream of the fan.

## 4. Scope and non-goals

A screening identification of system effect using factors the user supplies. AMCA publishes system effect
factors by configuration and velocity and those tables govern; the tile explains the mechanism and computes the
effective duct length, it does not ship the factor tables. Real installations often have several effects at once,
and they are not simply additive. It does not measure fan performance, which requires a proper traverse and
static pressure measurement at valid locations, and measurement locations near a fan are themselves affected by
the disturbed flow. It does not select or size a fan, evaluate the fan curve and system curve intersection, or
address fan surge and instability, which a badly disturbed inlet can provoke. Remedies -- straight duct, turning
vanes, inlet boxes, or a different fan arrangement -- are design changes. AMCA 201 and the fan manufacturer's
data, along with the applicable balancing standard, govern.
