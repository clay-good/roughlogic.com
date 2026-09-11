# roughlogic.com Specification v1805 -- Data Centre PDU Branch Circuit Loading (`calc-datacenter.js`, Group A Electrical, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A rack power strip is fed by a branch circuit with a continuous-load limit, and dual-corded equipment means each branch must be able to carry the whole load alone. A branch that looks half empty is correctly loaded, and filling it is how a single feed failure becomes a full outage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive voltage, breaker rating, or device draw, or a continuous load factor or power factor outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the NEC continuous-load derating and the three-phase power relation with the NEC and the authority having jurisdiction named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pdu branch circuit loading`, `rack power strip capacity`, `dual corded a b feed loading`, `208v three phase rack circuit`, `80 percent continuous load rack`.

## 2. The tile

### 2.1 `pdu-branch-loading` -- Data Centre PDU Branch Circuit Loading

```
three phase      VA = sqrt(3) x line voltage x amperes
continuous load  a load running three hours or more is continuous, and the branch
                 is limited to 80% of the overcurrent device rating
usable amperes   breaker rating x 0.80
branch capacity  sqrt(3) x 208 x usable amperes, times power factor for watts
device count     branch watts / the equipment's actual draw -- NOT its nameplate,
                 which is a supply rating rather than a consumption
A and B feeds    dual-corded equipment draws roughly half from each feed in normal
                 operation and ALL of it from one when the other is lost
the real limit   each branch must carry 100% of the connected load on its own, so
                 in normal operation each runs near 40% of its breaker
the failure      load both branches to their continuous limit and the survivor sees
                 twice its rating the instant its partner drops
```

The eighty percent rule is not conservatism, it is the rating basis. Overcurrent devices are calibrated for
loads that come and go, and a load that runs continuously heats the device and its conductors to a different
equilibrium; the derating restores the margin the device was designed with. In a data centre essentially
every load is continuous by definition, so the rule applies to every branch without exception.

Dual-corded redundancy then imposes a second, stricter limit that has nothing to do with the electrical code.
Equipment with two supplies draws from both and survives the loss of either, which means each branch has to be
able to carry everything connected to the pair. The consequence is that a properly loaded A and B branch runs
at roughly forty percent of its breaker in normal operation, and that is the correct answer rather than a
waste of capacity.

The forty percent is exactly what tempts operators into the failure. A branch reading twelve amperes on a
thirty ampere breaker looks like it has room for more, and adding servers works perfectly until the day the A
feed is lost for maintenance. Then the B branch sees the whole load at once, the breaker opens on overload,
and both feeds are gone -- the redundancy has converted a single-feed maintenance event into a full rack
outage.

**Inputs:** the line voltage and phase configuration, the branch overcurrent device rating, the continuous load factor, the equipment power factor, and the measured draw per device

**Outputs:** the usable amperes, the branch capacity in kilovolt-amperes and kilowatts, the device count the branch supports, the count a naive full-breaker calculation would allow, the normal-operation current per branch under an A and B arrangement, and the current the survivor sees if both branches are filled

## 3. Worked example

A 208 V three-phase branch on a 30 A breaker, feeding servers drawing 450 W each:

```
usable    = 30 x 0.80 = 24 A
capacity  = sqrt(3) x 208 x 24 = 8,646 VA = 8.65 kVA
at pf 0.99 = 8.56 kW
devices   = 8,560 / 450 = 19 servers
```

**19 servers on the branch.** Sizing on the full breaker instead:

```
sqrt(3) x 208 x 30 = 10.81 kVA = 10.70 kW -> 23 servers
```

**4 more servers, and the branch would then sit at 30 A continuously on a 30 A breaker.** That is not
a margin call; it is the condition the eighty percent rule exists to prevent, and the branch will nuisance
trip.

**Now put those 19 servers on A and B feeds, as dual-corded equipment expects:**

```
each branch normally carries about half: 12.0 A
utilisation = 40% of the breaker
```

**40% is the correct loading, not an under-used circuit.** Lose the A feed and the B branch picks up all
19 servers at 24.0 A -- **inside its 24 A continuous limit, which is the whole point.**

**Fill both branches to their continuous limit instead** -- 38 servers across the pair, 24.0 A on each,
which still reads as a comfortable 80% of breaker -- and then lose the A feed:

```
B branch current = 47.9 A on a 30 A breaker
```

**47.9 A on a 30 A device.** The breaker opens, and **a planned maintenance outage on one feed has just
taken the whole rack down** -- the exact event the second feed was installed to prevent. **The branch that
looked half empty was full.**

## 4. Scope and non-goals

A branch capacity calculation. It does not design the electrical installation: conductor sizing and derating for ambient temperature and bundling, overcurrent protection coordination and selectivity, grounding and bonding, arc flash, and the receptacle and plug configurations are electrical design under the NEC and the authority having jurisdiction, and a data centre's power distribution is engineered rather than calculated from a branch limit. Equipment draw must be measured or taken from the manufacturer's actual consumption data; a nameplate figure is a supply rating and commonly exceeds real draw by a wide margin, while a server's draw varies with its workload and can spike well above steady state. It does not address harmonic currents and neutral loading on a three-phase branch feeding single-phase switch-mode supplies, phase balance across a rack, inrush at restart after an outage -- which is where many branches actually trip -- or the upstream distribution and its own redundancy (`ups-module-redundancy`). It takes no position on whether equipment is genuinely dual-corded or on single-corded equipment fed through a transfer switch. The NEC and the authority having jurisdiction, the equipment manufacturers' measured consumption data, and the electrical designer govern.
