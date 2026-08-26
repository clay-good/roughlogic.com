# roughlogic.com Specification v1391 -- Fire Department Connection Supply Pressure Check (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group F has standpipe pump discharge pressure but nothing for the FDC itself: what the engine has to put out to deliver the system's required pressure at the connection, once the supply lines' friction and the elevation between pump and FDC are counted. That is the pressure the pump operator sets, and it is not the number on the placard.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive required pressure, flow, line length, or line count, or a friction coefficient at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the standard fire-service friction-loss form FL = C Q^2 L/100 with the published coefficient for the hose in use, and NFPA 14 for the system pressure required at the FDC, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `fdc-supply-check` -- Fire Department Connection Supply Pressure Check

```
flow per line   = total flow / number of supply lines
friction loss   = C x (gpm per line / 100)^2 x (length / 100)
elevation       = 0.434 psi per foot the FDC sits above the pump
engine pressure = required pressure at FDC + friction loss + elevation
```

The placard on an FDC states the pressure the *system* needs at the connection. The pump operator has to add
everything between the pump panel and that connection: the friction loss in the supply lines and the elevation
change. On a short lay both are small; on a 200 ft lay to a rear-yard FDC at 500 gpm they are not, and the
difference is a standpipe outlet that does not make its rated pressure four floors up.

The flow split across lines is where the arithmetic bites. Friction loss goes as the *square* of flow, so two
lines carrying 250 gpm each lose a quarter of what one line carrying 500 gpm would. Supplying an FDC with one
line when two are available is the single most common way a pump operator ends up short.

**Inputs:** pressure required at the FDC (psi), total flow (gpm), number of supply lines, line length (ft),
friction coefficient for the hose in use, elevation of the FDC above the pump (ft).

**Outputs:** flow per line, friction loss per line, elevation loss or gain, required engine discharge pressure,
and the pressure that a single-line supply would require for comparison.

## 3. Worked example

A system requiring 100 psi at the FDC, 500 gpm total, supplied through two 200 ft lines of 3 in hose
(`C = 0.677`), FDC at grade with the pump:

```
per line       = 500 / 2                        = 250 gpm
friction loss  = 0.677 x 2.5^2 x 2              = 8.5 psi
engine pressure= 100 + 8.5 + 0                  = 108.5 psi
```

Comfortable. Now supply the same 500 gpm through *one* 3 in line: the flow per line quadruples the loss term to
`0.677 x 5.0^2 x 2 = 33.9 psi`, and the engine has to make 133.9 psi for the same delivered pressure -- 25 psi of
pump capacity spent on a decision made in twenty seconds at the hydrant.

## 4. Scope and non-goals

Supply-side arithmetic only. The pressure required at the FDC comes from the system's hydraulic design and from
NFPA 14, not from this tile, and the placard may be missing, wrong, or reflect a system that has been modified.
Friction coefficients are department figures for the specific hose; the values used here are typical, not
authoritative. The tile does not account for appliance and siamese losses, for the check valve at the FDC, for a
partially obstructed or damaged connection, or for the pressure a fire pump inside the building may already be
adding. Pump operations are governed by department SOPs and by the operator's own gauges.
