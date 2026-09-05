# roughlogic.com Specification v1629 -- Variable Primary Chilled Water Minimum Flow Bypass (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A variable primary chilled water plant saves pumping energy by varying flow through the chillers, and the one thing that will destroy it is flow falling below the evaporator's minimum. The bypass valve exists for exactly that, and sizing it is a subtraction that has to be right.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive design or minimum flow, a minimum flow exceeding the design flow, or a non-positive differential pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the evaporator minimum flow and bypass sizing relations with the chiller manufacturer submittal named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`variable primary bypass valve`, `chiller minimum flow`, `evaporator minimum flow bypass`, `variable primary flow plant`, `bypass valve cv chilled water`.

## 2. The tile

### 2.1 `variable-primary-bypass` -- Variable Primary Chilled Water Minimum Flow Bypass

```
chiller minimum   the evaporator minimum flow, from the manufacturer, commonly 40 to 50%
                  of design flow for a single machine
bypass flow       Q_bypass = Q_min,chiller - Q_system, whenever the system falls below
bypass valve Cv   sized for the maximum bypass flow at the differential across it
control           modulates open as system flow approaches the minimum
consequence       flow below minimum causes laminar flow in the tubes, poor heat transfer,
                  freeze protection trips, and on some machines tube damage
staging interaction  the minimum for two machines is twice the minimum for one
```

The bypass exists to protect the machine, not to control temperature. Below the evaporator's minimum flow the
water in the tubes goes laminar, heat transfer collapses, the leaving temperature control becomes unstable, and
the low-temperature safety trips -- and on some machines repeated low-flow operation damages tubes. So the bypass
opens whenever system demand falls below what the running chillers require, and the pump moves water in a circle
to keep the machines happy.

The interaction with staging is the part that catches plants out. Two chillers running have twice the minimum
flow of one, so a plant that stages up at low load can find itself with a system flow far below the combined
minimum and a bypass valve wide open, burning pumping energy to circulate water that does no work. That is an
argument for staging down promptly, and it means the staging logic and the bypass logic have to be designed
together rather than separately.

Sizing the valve is the straightforward part: it must pass the largest bypass flow, which occurs at minimum
system load with the maximum number of machines that could be running, at the differential the pumps develop at
that condition -- which is near their shutoff, so the differential is high and the required Cv is smaller than a
design-flow calculation suggests.

**Inputs:** chiller design and minimum evaporator flow, the number of machines that can run, the minimum system flow, the differential pressure across the bypass at that condition, and the valve Cv

**Outputs:** the minimum flow required for one and for each additional machine running, the maximum bypass flow, the valve Cv required at the entered differential, the system load at which the bypass begins to open, and the pumping energy consumed by bypass at a stated low-load condition

## 3. Worked example

A plant with two 500 ton chillers, each 1,000 gpm at design and a 45% evaporator minimum:

```
minimum per machine = 1,000 x 0.45 = 450 gpm
one machine running: bypass opens when system flow falls below 450 gpm
two machines running: minimum is 900 gpm -- bypass opens below 900 gpm
```

**That second line is the trap.** A plant at 30% load needs perhaps 600 gpm of system flow. With one chiller
running, no bypass is needed. With two running -- because the staging logic brought the second on and has not
brought it back off -- the bypass has to pass `900 - 600` = 300 gpm, and the pumps are moving 900 gpm to serve a
600 gpm load.

Valve sizing: 300 gpm at the differential the pumps develop at that low flow, say 55 ft (24 psi):

```
Cv = 300 / sqrt(24) = 61
```

A valve with a Cv of about 61 at full open. Note that sizing it at design differential instead -- say 12 psi --
would call for `300 / sqrt(12)` = 87, an oversized valve that controls poorly at the condition it actually
operates in.

The energy point: every gallon through the bypass is pumped for nothing. Staging down to one machine at that load
removes the bypass flow entirely and halves the pump work, which is why staging and bypass logic belong in the
same sequence.

## 4. Scope and non-goals

A sizing and screening calculation. Evaporator minimum flow is a manufacturer value specific to the machine and
its tube configuration and must be taken from the chiller submittal, not assumed; some machines tolerate lower
flow than the conventional figures and others do not. It does not design the control sequence, which must
coordinate bypass modulation with chiller staging, pump speed control, and the differential pressure setpoint,
and a poorly coordinated sequence produces hunting between the bypass and the staging logic. It does not size
pumps, evaluate the differential pressure sensor location, or address the low-flow protection and freeze-stat
settings on the machines. It does not address variable primary operation's other constraints, including the rate
of flow change some chillers limit. The chiller manufacturer's minimum flow and rate-of-change requirements, the
design engineer, and the controls contractor govern.
