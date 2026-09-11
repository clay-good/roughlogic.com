# roughlogic.com Specification v1819 -- Deadband, Differential, and Equipment Cycling Rate (`calc-controls.js`, Group C HVAC, building automation and controls, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-controls.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A two-position control cycles at a rate set by the deadband, the load, and how oversized the equipment is. Narrowing the deadband to tighten control multiplies the cycling directly, and oversized equipment cycles hardest at the middle of its load range rather than at the extremes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive capacitance, loss coefficient, capacity, or deadband, an equipment capacity at or below the load, or an outdoor temperature at or above the setpoint returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the first-order two-position cycling relation with the equipment manufacturer's minimum cycle requirements named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`deadband cycling rate`, `control differential short cycling`, `equipment cycles per hour hvac`, `oversizing short cycle`, `two position control deadband`.

## 2. The tile

### 2.1 `deadband-cycling-rate` -- Deadband, Differential, and Equipment Cycling Rate

```
the model        a first-order space: capacitance C (Btu/degF), loss coefficient
                 UA (Btu/h-degF), and a fixed-output device of capacity Q
load             L = UA x (setpoint - outdoor)
on time          C x deadband / (Q - L), the time to drive across the band
off time         C x deadband / L, the time to drift back across it
cycles per hour  60 / (on + off) in minutes, or L (Q - L) / (C x deadband x Q)
duty cycle       L / Q -- the fraction of time the device runs, and it does NOT
                 depend on the deadband
maximum cycling  occurs at 50% duty, where L = Q/2, and equals Q / (4 C x deadband)
oversizing       raises the maximum cycling rate in direct proportion to capacity
limits           most equipment wants no more than about 6 cycles per hour, and a
                 compressor needs a minimum off time to equalise
```

Deadband and cycling are inversely proportional, which makes the tuning trade completely explicit. Halving the
band to hold a tighter temperature doubles the number of starts, and starts are what wear equipment, cost
efficiency through repeated warm-up and purge, and in a compressor risk liquid slugging on a short restart.
Control tightness is bought in equipment life, and the exchange rate is one for one.

Duty cycle is independent of deadband and that is the fact that makes the picture legible. The device runs for
the fraction of time the load demands regardless of how the band is set -- the band decides how that runtime is
chopped up, not how much of it there is. So a narrow band does not make equipment run more; it makes it start
more, which is a different and more damaging thing.

Oversizing is the most common cause of short cycling and it works through the maximum rather than the average.
A larger device satisfies the load faster, so its on time shortens while the off time is unchanged, and the
peak cycling rate scales directly with capacity. Worse, the peak occurs at fifty percent duty -- a mild day,
not a design day -- so an oversized system behaves acceptably in the weather it was sized for and cycles
hardest through the shoulder seasons where it spends most of the year.

**Inputs:** the space thermal capacitance and loss coefficient, the setpoint and outdoor temperature, the equipment capacity, the deadband, and an alternative deadband and capacity

**Outputs:** the load, the on and off times, the cycles per hour, the duty cycle, the same figures at a narrower deadband and at a larger equipment capacity, the maximum cycling rate and the load at which it occurs, and the outdoor temperature that produces it

## 3. Worked example

A space with C = 1,000 Btu/degF and UA = 500 Btu/h-degF, holding 70 degF against 30 degF outside:

```
load = 500 x (70 - 30) = 20,000 Btu/h
with Q = 25,000 Btu/h and a 2 degF deadband:
  on  = 1,000 x 2 / (25,000 - 20,000) = 24.0 min
  off = 1,000 x 2 / 20,000 = 6.0 min
  cycles = 60 / (24.0 + 6.0) = 2.0 per hour
  duty   = 20,000 / 25,000 = 80%
```

**2.0 cycles an hour at 80% duty -- comfortable.** Now halve the deadband to tighten control:

```
1 degF band: on 12.0 min, off 3.0 min, cycles = 4.0 per hour
```

**Exactly double.** And the duty cycle is unchanged at 80%, because the equipment still has to supply the same
load. **Halving the band did not make the system run more; it made it START twice as often**, which is what
wears equipment.

**Now double the equipment instead, at the original band:**

```
Q = 50,000: on 4.0 min, off 6.0 min, cycles = 6.0 per hour, duty 40%
```

**6.0 cycles an hour at the same condition**, against 2.0 for the right-sized unit. And the worst case moves
with capacity:

```
max cycles = Q / (4 C x deadband)
  right-sized: 25,000 / (4 x 1,000 x 2) = 3.12 per hour
  oversized:   50,000 / (4 x 1,000 x 2) = 6.25 per hour
```

**The peak cycling rate scales directly with capacity: double the equipment, double the worst case.**

**It is worst at 50% duty, and the oversized unit meets that condition on a COLDER day, not a milder one** --
20 degF here against 45 degF for the right-sized unit. The intuition that oversized equipment misbehaves
only in mild weather is wrong; **it cycles more than the right-sized unit at every load.** At a mild 45 degF:

```
right-sized: 3.12 cycles per hour
oversized:   4.69 cycles per hour
```

**50 percent more starts on an ordinary spring day**, from equipment that satisfies the design load
perfectly well.

## 4. Scope and non-goals

A first-order model for understanding the trade, not a simulation. A real space is not a single capacitance with a single loss coefficient: internal mass, solar and internal gains, infiltration, and the distribution system all matter, and the effective capacitance is not measurable with any precision. Equipment is not instantaneous either -- start-up transients, purge and post-purge, compressor pull-down, and anti-short-cycle timers all change the real cycle from the idealised one, and a timer that enforces a minimum off period decouples the cycling rate from this relation entirely. It does not address modulating or staged equipment, which is the usual answer to oversizing and which does not cycle in this way at all, nor variable-speed equipment. It does not evaluate the efficiency penalty of cycling, which depends on the equipment's start-up losses, or the comfort consequence of a given deadband, which depends on the space and the occupants. It does not size equipment or diagnose an oversizing problem, and it takes no position on minimum runtime and off-time requirements, which are the manufacturer's. The equipment manufacturer's minimum cycle and off-time requirements and the controls engineer govern.
