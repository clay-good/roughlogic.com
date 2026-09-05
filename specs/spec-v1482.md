# roughlogic.com Specification v1482 -- Air Receiver Pump-Up and Pump-Down Time (`calc-millwright.js`, Group G Cross-Trade Utilities, pneumatics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A receiver is a buffer, and the two numbers that describe it are how long the compressor takes to fill it and how long the plant can draw from it before pressure falls to the cut-in. Both come from one relation, and the second is what actually sizes a receiver for a shop with a big intermittent tool.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive receiver volume or flow, or a final pressure at or below the initial pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the isothermal receiver storage relation and ASME Section VIII named for the vessel, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`receiver pump up time`, `air receiver drawdown`, `compressed air storage time`, `receiver sizing pressure band`, `tank fill time compressor`.

## 2. The tile

### 2.1 `receiver-pump-up-time` -- Air Receiver Pump-Up and Pump-Down Time

```
pump-up time    t = V (p2 - p1) / (14.7 x Q_comp)        (V in cu ft, p psig, Q scfm, t minutes)
draw-down time  t = V (p_hi - p_lo) / (14.7 x Q_demand)
storage         the useful air is the pressure BAND, not the tank volume
receiver size   V = t x 14.7 x Q_net / (p_hi - p_lo)
```

The relation is just the ideal gas law in shop units: the free air stored in a receiver is its volume times
the pressure band in atmospheres, and 14.7 is what converts psig to atmospheres. The consequence people miss is
that a receiver's usefulness depends on the BAND you are willing to give up, not on the tank. Widening the
cut-in to cut-out band from 20 to 40 psi doubles the usable storage from the same tank -- free capacity, paid for
in slightly lower minimum pressure.

That is what makes the draw-down form the useful one. A shop with a sandblaster or a large intermittent tool
does not need a compressor that covers the peak; it needs a receiver big enough to cover the peak's DURATION
while the compressor catches up between uses. Sizing that way is much cheaper than sizing the compressor to the
peak, and it is the calculation that justifies the tank.

**Inputs:** receiver volume, initial and final pressure for a fill, compressor delivered flow, and for a draw-down the cut-out and cut-in pressures with the net demand

**Outputs:** the pump-up time from the entered pressures, the draw-down time at the entered demand, the usable stored free air in cubic feet, and the receiver volume required to support a stated demand for a stated duration

## 3. Worked example

A 240 cu ft receiver filled from 0 to 175 psig by a compressor delivering 42 scfm:

```
t = 240 x (175 - 0) / (14.7 x 42) = 42,000 / 617.4 = 68.0 minutes
```

Now the draw-down, which is the number that matters. A 120 cu ft receiver, cut-out 175 and cut-in 140
psig, supplying a tool that draws 30 scfm more than the compressor makes:

```
t = 120 x (175 - 140) / (14.7 x 30) = 9.52 minutes = 571 seconds
```

571 seconds of cover. If the tool runs for two minutes at a time, the receiver is too small -- and the fix
is `25` cu ft of tank, not a bigger compressor.

## 4. Scope and non-goals

Isothermal storage in a single receiver, treating the compressor output and demand as constant over the
interval. Real compression is not isothermal: air entering a receiver is hot and cools afterward, so actual fill
times run slightly longer and the stored mass at a given pressure is slightly higher once cooled. It does not
account for the additional storage in the distribution piping, which on a large system is significant, and it
does not size the compressor (`air-compressor-cfm-sizing`) or the piping. Receiver pressure ratings, relief valve
sizing, drain provisions, and ASME code stamping are safety requirements this tile does not address and that
govern the vessel. Short-cycling limits set by the compressor manufacturer -- minimum starts per hour -- often set
a minimum receiver size independently of any of this. The compressor manufacturer's data and ASME Section VIII
govern.
