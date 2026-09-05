# roughlogic.com Specification v1460 -- Sagging by Stopwatch (Return-Wave Method) (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Sagging by eye against a target works when a crew can see both structures. Often they cannot -- a hill, a curve, trees, a long span. The stopwatch method needs neither line of sight nor an instrument: hit the conductor, count the return waves, and read the sag off the time. It is one square root, and it is the most useful field trick in line work that nobody has a calculator for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive return-wave count, a non-positive elapsed time, or a non-positive sag when solving for time returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the transverse-wave sagging relation with the 12.075 foot-second constant as standard line practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`stopwatch sagging`, `return wave method`, `sag by timing`, `conductor wave sag`, `sagging without line of sight`.

## 2. The tile

### 2.1 `sagging-return-wave` -- Sagging by Stopwatch (Return-Wave Method)

```
sag from timing   S = 12.075 ( t / N )^2      (S in feet, t in seconds, N return waves)
time for a sag    t = N sqrt( S / 12.075 )
wave speed        v = sqrt( H / m )  -- the physical basis
```

Strike the conductor near one support and a transverse wave runs to the far structure, reflects, and comes
back. Its travel speed is set by the tension and the mass per unit length, which is exactly the same pair of
quantities that set the sag -- so the round-trip time and the sag are two readings of one physical state, and the
span length cancels out of the relation entirely. That is what makes the method work with no line of sight: the
crew never needs to know how far away the other pole is.

The constant 12.075 carries the unit conversion for feet and seconds. Timing several return waves rather than one
is the whole accuracy trick: because the relation is squared, a tenth of a second of stopwatch error on a single
wave is a large sag error, while the same tenth spread over five waves is a small one. Three to five is normal
practice, and the tile reports the sensitivity so a crew can see what its own timing is worth.

**Inputs:** either the elapsed time and the number of return waves counted (to get sag), or the target sag and a wave count (to get the time to listen for)

**Outputs:** the sag from the timing, the target time for a chosen sag and wave count, the per-wave period, and the sag error corresponding to a stated stopwatch error

## 3. Worked example

A crew needs a 12 ft sag and will count 3 return waves:

```
t = 3 x sqrt(12 / 12.075) = 3 x 0.9969 = 2.99 s
```

Strike the conductor, count 3 returns, and the stopwatch should read 2.99 seconds. Check the sensitivity: read
3.19 s instead and the sag comes out `12.075 x (3.19/3)^2` = 13.66 ft, so two tenths of a second
of error is 1.66 ft of sag error.

Now do the same with ONE wave. The target time is 1.00 s, and the same two tenths of error gives
`12.075 x (1.20)^2` = 17.30 ft -- 5.30 ft off, 3 times worse
for the same stopwatch. Counting more waves is not fussiness, it is the method.

## 4. Scope and non-goals

One span, one conductor, a transverse wave in a span already close to its final tension. The relation assumes
a taut string, so it degrades on very slack spans and on spans with a large elevation difference where the wave
does not travel symmetrically. It does not work through a span with an armor rod, damper, or spacer that
reflects the wave early, and it does not work on a bundled conductor. The method gives sag, not tension, and not
clearance -- take the sag to `line-ground-clearance-nesc`. Wind makes the count unreliable and is the usual reason
a reading has to be thrown out. The utility's construction standard, the stringing chart, and the line design
govern the sag being aimed at.
