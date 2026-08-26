# roughlogic.com Specification v1421 -- Overcurrent Selective Coordination Screen (calc-elecdesign.js, Group A, electrical power systems, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, electrical power systems), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes transformer inrush coordination points but nothing that screens whether two devices in series will actually coordinate. Selective coordination is required by the NEC for elevator, emergency, legally required standby, and critical operations circuits, and the two device families fail it for completely different reasons -- fuses on a ratio, breakers on an instantaneous pickup.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive device rating, ratio, or fault current, or an instantaneous pickup multiplier at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the fuse ampere-ratio coordination convention published by fuse manufacturers, the breaker instantaneous-pickup limitation, and NEC 620.62, 700.32, 701.32, and 708.54, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `selective-coordination-screen` -- Overcurrent Selective Coordination Screen

```
fuses:    ratio = upstream ampere rating / downstream ampere rating
          coordinated when ratio >= the manufacturer's published minimum (commonly 2:1)

breakers: instantaneous pickup = upstream trip setting x instantaneous multiplier
          coordinated only up to that pickup current
          coordination fails when available fault current exceeds it
```

Fuses coordinate on a ratio, and the ratio is a *published test result* for a specific fuse family, not a general
rule. Within a family, an upstream fuse at or above the published ratio will not open before a downstream one
clears, at any fault current up to the interrupting rating -- which is why fuses coordinate all the way down and
why the ratio table is the whole answer.

Circuit breakers fail differently. A thermal-magnetic breaker's instantaneous element trips essentially without
delay, so once the fault current exceeds the upstream breaker's instantaneous pickup, *both* devices open and
selectivity is lost -- no matter how far apart the ratings are. Coordination therefore holds only up to that
pickup current, and whether that is acceptable depends entirely on the available fault current at the downstream
device. A 400 A upstream and a 100 A downstream breaker look like a comfortable four-to-one and coordinate not at
all above the pickup.

**Inputs:** device type, upstream and downstream ratings, the published fuse ratio for the family, upstream
instantaneous pickup multiplier or setting, and the available fault current at the downstream device.

**Outputs:** the achieved ratio or the pickup current, the maximum fault current at which coordination holds, and
pass or fail against the available fault current.

## 3. Worked example

Two cases at a downstream device with 12,000 A of available fault current.

**Fuses:** a 400 A upstream against a 100 A downstream, family ratio 2:1:

```
ratio = 400 / 100 = 4:1  >= 2:1   -> coordinated to the interrupting rating
```

**Breakers:** a 400 A upstream with instantaneous set at 10x, against a 100 A downstream:

```
pickup = 400 x 10 = 4,000 A
coordination holds only to 4,000 A
12,000 A available > 4,000 A       -> NOT selectively coordinated
```

Same ratings, opposite answers. The breaker case has three fixes and they are all real work: raise the
instantaneous setting if the breaker allows it and the downstream equipment can survive the longer clearing time,
move to a breaker with a short-time delay and no instantaneous (which raises incident energy -- see the arc-flash
tile, and the two requirements genuinely conflict), or use fuses.

## 4. Scope and non-goals

**A screen, not a coordination study.** Real coordination is demonstrated by overlaying the actual time-current
curves of the actual devices, with their tolerance bands, against the fault currents at every point in the system
-- and where the NEC requires selective coordination, the AHJ will expect that documentation, not a ratio. Fuse
ratios apply only within a manufacturer's stated family and combination; mixing families voids them. The tile
does not address ground-fault coordination, which has its own rules and frequently fails where phase coordination
succeeds, zone-selective interlocking, or the interaction between coordination and arc-flash energy, which pull in
opposite directions. NEC as adopted, the device manufacturers' curves, a qualified engineer, and the AHJ govern.
