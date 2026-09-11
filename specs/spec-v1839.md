# roughlogic.com Specification v1839 -- Fibre Slack Loop and Splice Enclosure Reserve (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Slack coiled at every splice point is not waste, it is the only thing that makes a future repair a splice rather than a rebuild. A cut cable has to reach a splice trailer, and the cable that cannot reach it is replaced instead.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive route length, reel length, or slack allowance, a reel length exceeding the route, or a negative waste allowance returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the outside plant slack storage convention with the owner's construction standards and the cable manufacturer's handling limits named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fiber slack storage loop`, `splice enclosure cable slack`, `osp cable ordering slack`, `restoration slack fiber`, `cable reel length splice count`.

## 2. The tile

### 2.1 `fiber-slack-storage` -- Fibre Slack Loop and Splice Enclosure Reserve

```
splice points    route length / usable reel length, less one; every reel change
                 is a splice and every splice is a slack location
slack per point  commonly 50 to 100 ft each side of the enclosure, coiled in the
                 vault, on the strand, or on a snowshoe
slack at ends    a full storage loop at each terminal, so the equipment can be
                 re-terminated without pulling cable
total cable      route length + all slack, plus a waste and routing allowance
what slack is    a RESTORATION asset: a cut cable must reach a splice trailer,
for              which needs enough on each side to reach the work position
the failure      insufficient slack means a mid-span repair becomes two new
                 enclosures and a section of new cable instead of one splice
it also appears  the OTDR measures every foot of it (`otdr-event-distance`)
```

Slack is bought at construction and spent at three in the morning years later. A backhoe takes a cable, and
what happens next depends entirely on a decision made when the route was built: if there is enough cable on
both sides to pull into a splice trailer and work at a bench, the repair is a single splice and the service is
back in hours. If there is not, both ends have to be extended with new cable, which means two new enclosures,
two new sets of splices, a new section of cable, and a much longer outage.

The reel length decides the splice count and therefore much of the slack, and it is a purchasing decision as
much as an engineering one. Longer reels mean fewer splices, less slack, less loss, and fewer places to fail;
they also mean heavier reels, harder handling, and more wasted cable when a reel does not fit a section
cleanly. A route planned around the reels available is a different route from one planned around the
manholes.

Slack has to be somewhere and where it goes is a design decision with consequences. In a vault it takes rack
space and is vulnerable to water and rodents; on aerial strand it is a wind load and a visible one; on a
snowshoe it is exposed. A route with slack recorded on the as-built is a route that can be repaired quickly;
one with slack nobody documented is one where the crew finds out by pulling.

**Inputs:** the route length, the usable cable reel length, the slack per splice point and per terminal, the waste and routing allowance, and the slack a restoration splice requires on each side

**Outputs:** the splice point count, the slack at splice points and at the ends, the total slack, the cable to order including the allowance, and the additional slack a restoration-capable design requires

## 3. Worked example

A 10 mile route on 12,000 ft reels:

```
route        = 52,800 ft
splice points= ceil(52,800 / 12,000) - 1 = 4
slack        = 4 x 100 ft + 2 x 100 ft = 600 ft
order        = (52,800 + 600) x 1.05 = 56,070 ft
```

**600 ft of cable is bought to sit coiled and do nothing**, which is 1.1 percent of the route, and it is
the cheapest insurance on the job.

**Here is what it buys.** A restoration splice needs roughly 60 ft on each side to pull into a trailer and
work at a bench:

```
required at a cut = 2 x 60 = 120 ft
available at a splice point = 100 ft
```

**A cut AT a splice point has 100 ft available against 120 ft needed** -- short by 20 ft, and a cut
BETWEEN splice points has none at all. **The mid-span cut is the normal case**, and the repair is then two new
enclosures and a section of new cable rather than one splice.

**Which is the argument for more slack, not less.** Raising the per-point slack to 60 ft each side adds
80 ft of cable to the order -- about 0.1 percent -- **and converts a class of outage from a
rebuild into a splice.**

**And every foot of it is in the OTDR's answer.** The trace reports fibre length including all the coiled
slack, so **a route whose slack is not on the as-built is a route whose OTDR distances cannot be converted to
a dig location** (`otdr-event-distance`).

## 4. Scope and non-goals

A quantity takeoff. Slack allowances are entered and are set by the owner's construction standards, the local practice, and the physical storage available -- a vault with no rack space, an aerial route with a wind loading limit, or a directional bore with no intermediate access all constrain what can actually be stored, and the standard is what governs. Usable reel length is not the reel's nominal length: the route's geometry, the placement method, and the pull lengths between access points decide how much of each reel is used, and a reel that does not fit a section cleanly leaves a tail. It does not plan the route, locate splice points, or address the pulling tension and bend radius limits that determine how long a placement can be (`pulling-tension`, `cable-bend-radius`), the duct or conduit occupancy, or the handhole and vault sizing that the slack has to fit into. It does not address the fibre slack inside the enclosure itself, which is a separate and larger quantity per fibre, or the splice loss and its effect on the link budget (`fiber-loss-budget`). It takes no position on aerial loading, which a slack storage loop adds to. The owner's construction standards, the cable manufacturer's handling limits, and the outside plant engineer govern.
