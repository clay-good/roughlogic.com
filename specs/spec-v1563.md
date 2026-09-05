# roughlogic.com Specification v1563 -- Commercial Laundry Washer Capacity and Turns per Day (`calc-steamplant.js`, Group G Cross-Trade Utilities, commercial laundry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An on-premise laundry is sized by pounds per day, and pounds per day is capacity times turns times machines. Turns is the number nobody measures: it is set by cycle time and by how long a machine sits waiting for someone to unload it, and the second term is usually the bigger one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive machine capacity, cycle time, shift length, or machine count returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the turns and throughput relations as standard on-premise laundry practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`laundry turns per day`, `washer capacity pounds per day`, `opl sizing washer`, `laundry throughput calculation`, `washer extractor turns`.

## 2. The tile

### 2.1 `laundry-washer-turns` -- Commercial Laundry Washer Capacity and Turns per Day

```
turns per shift   T = shift hours x 60 / total cycle time
total cycle       wash cycle + load + unload + idle waiting
capacity          lb/day = machine capacity x turns x machines
required machines n = required lb per day / (capacity x turns)
extraction        higher G-force extraction shortens the DRYER cycle, not the washer
```

Rated capacity is a machine specification; turns is an operational one, and it is where real plants lose their
throughput. A 38 minute wash cycle in an eight hour shift is twelve and a half turns in theory, and a plant that
achieves eight is common -- the difference is machines standing full because nobody was there to unload them.
Buying a second washer to fix a throughput problem caused by unloading delay is a very expensive way to not solve
it, and computing turns from the actual cycle including idle time is what shows that.

The other lever is extraction rather than washing. A high G-force extract removes far more water mechanically,
and mechanical water removal is roughly an order of magnitude cheaper than evaporating the same water in a dryer
(`laundry-dryer-evaporation`). It does not shorten the washer's cycle, but it shortens the dryer's and it cuts
the gas bill, so a washer decision made only on wash time misses most of its own consequences.

**Inputs:** machine rated capacity, wash cycle time, load and unload time, observed idle time, shift hours, number of machines, and the required pounds per day

**Outputs:** the total cycle time, turns per shift, pounds per shift and per day for the installed machines, the machines required for a target throughput, and the throughput gained by removing a stated amount of idle time

## 3. Worked example

A 125 lb washer-extractor on a 38 minute total cycle, 8 hour shift:

```
turns   = 8 x 60 / 38 = 12.6 turns per shift
per machine = 125 x 12.6   = 1,579 lb per shift
```

Now the real plant. If each load actually sits 12 minutes waiting to be unloaded, the effective cycle is
50 minutes:

```
turns   = 8 x 60 / 50 = 9.6
per machine        = 1,200 lb per shift
```

**379 lb per shift lost** -- 24% of capacity -- to
idle time alone. A second 125 lb washer would cost tens of thousands of dollars to recover throughput that
scheduling an unloader recovers for nothing.

Sizing from the other end: a plant needing 4,000 lb a day at the realistic 9.6 turns needs
`4,000 / (125 x 9.6)` = 3.3 machines, so four -- where the
theoretical turns figure would have said 2.5 and bought three.

## 4. Scope and non-goals

A throughput calculation from cycle times the user supplies. It does not select machines, design the wash
formula, or evaluate whether a given cycle time achieves the required cleanliness and disinfection -- healthcare
and food-service laundry carry temperature, chemistry, and time requirements that constrain the cycle and that
this tile does not address. It does not size the water, sewer, hot water, or steam services, the extraction and
drying capacity downstream (a plant washes faster than it dries far more often than the reverse), or the
finishing equipment. It does not evaluate soil classification, sorting, or the linen inventory required to
support the throughput, which is usually what actually limits a plant. The equipment manufacturer's data, the
chemical supplier's wash formulas, and any applicable healthcare or food-safety laundry standard govern.
