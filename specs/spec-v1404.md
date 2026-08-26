# roughlogic.com Specification v1404 -- Reaming Stock Allowance, Speed, and Feed (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A reamer follows the hole it is given, and how much stock it is given decides whether the hole comes out to size. Too little and the reamer burnishes instead of cutting; too much and it chatters and cuts oversize. The allowance rule, and the fact that reaming runs at roughly two-thirds the drilling speed and two to three times the drilling feed, is not anywhere in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive reamer diameter, surface speed, or feed multiplier, or a stock allowance at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the reaming stock-allowance practice by hole size and the reaming speed and feed convention relative to drilling (Machinery's Handbook), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `reaming-allowance` -- Reaming Stock Allowance, Speed, and Feed

```
stock allowance  = about 1/64 in on diameter up to 1/2 in
                   about 1/32 in on diameter from 1/2 to 1 in
                   about 1/16 in above 1 in
drill size       = reamer diameter - stock allowance
reaming SFM      = about 2/3 of the drilling surface speed
RPM              = 3.82 x SFM / diameter
reaming feed     = 2 to 3 times the drilling feed per revolution
feed rate        = feed per revolution x RPM
```

A reamer is a sizing tool, not a hole-making tool, and it needs a specific amount of material to cut. Below the
allowance it rides on the hole wall and burnishes -- the hole comes out undersize, the reamer glazes, and the
finish is worse rather than better. Above it the reamer's margins cannot guide it, it chatters, and it cuts a
lobed, oversize hole.

The speed and feed convention runs opposite to intuition: slower than drilling and *faster* in feed. Slow, because
surface speed is what generates the heat that expands the reamer and enlarges the hole. Fast in feed, because the
reamer needs a real chip on each flute for the same reason a milling cutter does -- a starved reamer rubs.
Roughly two-thirds the speed and two to three times the feed is the working rule.

**Inputs:** finished hole (reamer) diameter, base drilling surface speed for the material, base drilling feed per
revolution, and the speed and feed multipliers.

**Outputs:** recommended stock allowance, drill size to leave it, reaming surface speed and RPM, feed per
revolution, and feed rate in inches per minute.

## 3. Worked example

A 0.500 in reamed hole in mild steel, where the drilling baseline is 80 SFM and 0.006 IPR:

```
allowance   = 0.016 in on diameter    -> drill 0.484 in (a 31/64 drill is 0.4844, right on it)
reaming SFM = 80 x 2/3                = 53 SFM
RPM         = 3.82 x 53 / 0.500       = 405 RPM
feed        = 0.006 x 3               = 0.018 IPR
feed rate   = 0.018 x 405             = 7.29 IPM
```

Note that the reamer runs at a third of the drill's RPM and twice its feed rate in inches per minute -- 405 RPM
against 611, but 7.3 IPM against 3.7. That combination is what produces a chip instead of a rub. Leave only
0.005 in of stock instead of 0.016 and the reamer will burnish; leave 0.031 in and it will chatter and cut a
hole that gauges oversize and out of round.

## 4. Scope and non-goals

Machine reaming of a drilled hole in general-purpose material. Hand reaming, chucking reamers, adjustable
reamers, and carbide and coated reamers all carry their own allowances and speeds, and high-performance reamers
are frequently run far faster than this convention allows. The tile does not select a reamer, address hole
alignment (a reamer follows the drilled hole and will not correct a crooked one -- boring will), coolant, or the
straightness and finish requirements that may call for a different process entirely. Reamed hole tolerance
depends on setup rigidity and spindle runout more than on any of these numbers. Machinery's Handbook, the tool
manufacturer, and the machinist govern.
