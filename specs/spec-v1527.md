# roughlogic.com Specification v1527 -- Pipeline Pigging Volume and Batch Displacement (`calc-oilgas.js`, Group B Plumbing and Gas, pipelining, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A pig run needs to know one number before anything else: how much product is in the segment. It sets the batch size, the fluid to displace it, the receiver capacity, and how long the run takes -- and it is a cylinder volume that people keep re-deriving on the tailgate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive inside diameter, length, or flow rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the line-volume and pig-velocity relations as standard pipeline practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pipeline volume barrels per mile`, `pig run volume`, `line fill volume`, `pig travel time velocity`, `batch displacement pipeline`.

## 2. The tile

### 2.1 `pig-batch-volume` -- Pipeline Pigging Volume and Batch Displacement

```
line volume     V = (pi/4) d^2 L        (converted to barrels or cubic feet)
per mile        bbl/mile = 0.0009714 x d^2 x 5,280 / 5.615, d in inches
travel time     t = L / v,  v = Q / A
displacement    the volume of driving fluid equals the line volume, plus bypass
batch interface a batched product needs a slug sized for the interface mixing length
```

A pipeline is a very long cylinder and its volume is larger than intuition suggests: a 16 in line holds roughly
250 barrels per mile, so a forty-mile segment is ten thousand barrels of product sitting in the pipe. That is the
number that sizes the receiver, the tankage, and the batch.

Pig velocity follows directly from flow over area, and it matters for more than scheduling. Too slow and a
cleaning pig can stall or the bypass lets debris past; too fast and an inspection tool's sensors cannot sample
properly and the run has to be repeated. Most inline inspection tools have a stated velocity window, and checking
that the planned flow puts the tool inside it -- before the tool is in the line -- is exactly the kind of check
this tile is for.

For a batched liquid line the same volume arithmetic sizes the interface. Two products in contact mix over a
length that grows with distance travelled, and the contaminated interface volume has to be cut to slop or
downgraded, which is a real cost that scales with the line volume.

**Inputs:** pipe inside diameter, segment length, flow rate, and optionally the pig velocity window and the bypass fraction

**Outputs:** the volume per mile and total line volume in barrels and cubic feet, the pig velocity at the entered flow, the travel time, whether the velocity falls inside a stated tool window, and the flow required to hit a target velocity

## 3. Worked example

A 15.5 in ID line, 42 miles long:

```
volume per mile = (pi/4)(15.5/12)^2 x 5,280 / 5.615 = 1232.2 bbl/mile
total volume    = 1232.2 x 42                 = 51,752 bbl
```

51,752 barrels in the pipe -- that is the receiver, the tankage, and the displacement volume all at once.

At 60,000 bbl/day the pig moves:

```
velocity = 60,000 / 24 / 1232.2 = 2.03 miles/h = 2.98 ft/s
travel time = 42 / 2.03 = 20.7 hours
```

3.0 ft/s. If the inspection tool's window is 3 to 12 ft/s this is
comfortably inside it; if the line were run at 20,000 bbl/day the tool would travel at
0.99 ft/s, below the window, and the run would have to wait for
throughput.

## 4. Scope and non-goals

Geometric volume and average velocity for a single uniform segment. It assumes one inside diameter throughout;
a real segment with wall thickness changes, valves, fittings, and diameter transitions holds a different volume,
and the tile does not account for them. Pig velocity is not constant in practice: a pig accelerates and stalls
over terrain and through fittings, and on a gas line it can surge violently because the driving fluid is
compressible, which is a well-known hazard at the receiver. It does not size the launcher or receiver, evaluate
whether the line is piggable at all (bend radii, unbarred tees, valve bores, and diameter changes decide that),
plan the run, or address the debris and liquid the pig will push ahead of it, which on a first run can be a large
and hazardous volume. The pig and tool vendor's requirements, the operator's procedures, and 49 CFR govern.
