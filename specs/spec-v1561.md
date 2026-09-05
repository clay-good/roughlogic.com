# roughlogic.com Specification v1561 -- Surface-Supplied Diver Air Supply Rate (`calc-diving.js`, Group P Field, Backcountry, and SAR, commercial diving, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-diving.js`**
> (Group P, Field, Backcountry, and SAR -- the existing category, hub `/groups/field/`; commercial diving and hyperbaric), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Surface-supplied diving has a minimum air supply requirement that scales with depth and with the number of divers, and the reserve is a regulatory quantity rather than a judgment. The check is whether the compressor and the volume tank actually meet it at the working depth.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a diver count below one, a non-positive depth, flow rate per diver, or supply capacity returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the flow-at-depth requirement with 29 CFR 1910 Subpart T and the employer dive manual named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`surface supplied air requirement`, `diver umbilical flow`, `volume tank sizing diving`, `reserve breathing supply`, `scfm per diver depth`.

## 2. The tile

### 2.1 `umbilical-air-supply` -- Surface-Supplied Diver Air Supply Rate

```
flow required     Q = rate per diver x P_ata x number of divers
regulatory rate   commonly 1.4 acfm per diver at depth (surface-supplied air)
reserve supply    an independent source sufficient to return the diver to surface
volume tank       sized to hold the reserve at working pressure
standby diver     the standby's supply is part of the requirement, not extra
```

The requirement scales with absolute pressure exactly as a scuba diver's does -- gas delivered to a diver at 100
ft is four atmospheres of gas -- so a compressor sized for shallow work falls short in deeper water without any
change in the number of divers. The number of divers multiplies it directly, and the standby diver counts.

The reserve is the part that is regulatory rather than engineering. Surface-supplied diving requires an
independent reserve breathing supply, sized to bring the diver to the surface from the maximum depth including
any required decompression, and available without the diver having to do anything to switch to it. A volume tank
that meets the flow requirement but not the reserve requirement does not comply, and the two are separate
calculations.

For a supervisor the useful output is the depth at which a given compressor and volume tank stop meeting the
requirement, because that is the operational limit that gets discovered at the wrong moment.

**Inputs:** number of divers including the standby, working depth, the required flow rate per diver, the compressor capacity, the volume tank size and pressure, and the reserve requirement

**Outputs:** the flow required at depth for the entered divers, the margin against the compressor capacity, the reserve volume required, the margin against the volume tank, and the maximum depth the installed supply meets the requirement at

## 3. Worked example

Two divers plus a standby at 100 ft, at 1.4 acfm per diver:

```
P            = 1 + 100/33          = 4.03 ata
per diver    = 1.4 x 4.03          = 5.64 acfm
three divers = 5.64 x 3            = 16.9 acfm required
```

A compressor rated 20 scfm has margin here. Now take the same spread to 190 ft:

```
P            = 1 + 190/33          = 6.76 ata
three divers = 1.4 x 6.76 x 3      = 28.4 acfm required
```

**The 20 scfm compressor no longer meets the requirement**, with nothing having changed but depth. Working the
relation backwards, that compressor supports three divers to

```
depth = 33 x ( 20 / (1.4 x 3) - 1 ) = 33 x (4.76 - 1) = 124 ft
```

124 ft. That is the operational limit of the spread, and it is worth knowing before the job rather than at the
dive station.

## 4. Scope and non-goals

A flow requirement screen. The per-diver flow rate, the reserve requirement, and the manner in which the
reserve must be arranged are set by regulation and by the applicable industry standard, and they differ between
jurisdictions and between air and mixed-gas diving; the values must be entered from the governing standard rather
than assumed. It does not evaluate compressor intake location and air quality, which is a life-safety matter --
carbon monoxide from an intake near an exhaust has killed divers -- or the filtration, air testing, and
certification requirements that apply. It does not size the umbilical or evaluate its pressure drop, which
reduces the pressure available at the diver, or address the communications, pneumofathometer, and strength member
that the umbilical must also carry. It does not address decompression, chamber requirements, or the standby
diver's own equipment. Commercial diving is a regulated occupation: 29 CFR 1910 Subpart T, the ADCI or IMCA
standards as applicable, the employer's dive manual, and the diving supervisor govern.
