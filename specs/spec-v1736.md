# roughlogic.com Specification v1736 -- Confined Space Retrieval Winch Force and Line Pull (`calc-cross.js`, Group G Cross-Trade Utilities, industrial hygiene, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; industrial hygiene and safety), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A confined space retrieval system has to lift a person who may be unconscious, entangled, or wedged, and the force is well above their body weight. Sizing it on weight alone produces a system that cannot perform the rescue it exists for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive entrant weight or system rating, or a required force exceeding the system rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the retrieval load estimate with 29 CFR 1910.146 named as governing the rescue capability requirement, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`confined space retrieval winch`, `non entry rescue force`, `tripod davit capacity`, `retrieval line entanglement`, `confined space rescue plan`.

## 2. The tile

### 2.1 `retrieval-winch-force` -- Confined Space Retrieval Winch Force and Line Pull

```
suspended weight   the entrant plus their equipment
friction and drag  the line over the davit and against the opening
entanglement       a wedged or entangled entrant requires force well above their weight,
                   and there is a limit above which pulling causes injury
rated capacity     the winch and the full system are rated; the system is the weakest part
anchorage          the davit or tripod and its footing carry the load
non-entry rescue   the retrieval system exists so rescuers do not enter; most confined
                   space fatalities are would-be rescuers
limits             retrieval is not always feasible; where it is not, an entry rescue
                   plan and team are required
```

The purpose is the point: the retrieval system exists so that a rescue does not require another person to
enter. The great majority of confined space fatalities include would-be rescuers who entered without protection
to help a collapsed entrant, and non-entry retrieval is the control that breaks that pattern. Every design
decision -- the attachment point on the harness, the line kept taut, the winch at the opening -- follows from
making retrieval possible without entry.

The force is above body weight and the margin is not small. Line friction over the davit, the entrant's
equipment, and any entanglement all add, and an unconscious entrant is dead weight that catches on everything on
the way up. Sizing the system for a body weight produces one that stalls partway.

There is an upper limit too, and it is a medical one rather than a mechanical one: pulling hard enough on a
wedged entrant causes injury. So a retrieval that will not come freely is a signal to stop and to move to the
entry rescue plan rather than to apply more force -- which means the entry rescue capability has to exist even
where retrieval is provided.

And retrieval is not always feasible. A space with internal obstructions, a horizontal entry with turns, or a
configuration where a line would entangle may not permit non-entry retrieval, and the standard recognizes that --
in which case an entry rescue team, trained and equipped and able to respond in time, is the requirement, and
"call 911" is not a rescue plan unless that service has confirmed it will respond and is equipped to.

**Inputs:** the entrant weight with equipment, the friction and drag allowance, the entanglement allowance, the winch and system rated capacity, the anchorage and its footing, and the space configuration

**Outputs:** the suspended load, the retrieval force with friction and entanglement allowances, that against the system rating, the margin, the anchorage load, and a feasibility flag where the space configuration may not permit non-entry retrieval

## 3. Worked example

An entrant of 200 lb with equipment, retrieved through a vertical opening.

```
entrant plus equipment              = 200 lb
line friction over the davit, ~15%  = 30 lb
subtotal                            = 230 lb
```

That is the free-hanging case. **An entangled or wedged entrant is a different number entirely** -- the force can
be several times body weight, and a system rated for 230 lb stalls.

The system is rated as a system: winch, line, davit or tripod, and the anchorage. **The rating is the weakest
element**, and a winch rated well above the load mounted on a tripod whose footing is inadequate is a system
rated by the footing.

**And the upper limit is medical.** Pulling hard on a wedged entrant injures them. A retrieval that does not come
freely is a signal to stop and go to the entry rescue plan -- which means that plan has to exist, with a trained
and equipped team able to respond in time, even at a space where retrieval equipment is provided.

**The reason all of this exists**: most confined space fatalities include would-be rescuers who entered without
protection to help someone who had collapsed. Non-entry retrieval is what breaks that pattern, and every detail
of it -- the harness attachment above the entrant's centre of gravity, the line kept taut, the winch positioned
at the opening -- is there to make the rescue possible without a second person going in.

Where the space configuration will not permit retrieval -- internal obstructions, a horizontal entry with turns --
the standard recognizes it, and the answer is an entry rescue team rather than a retrieval system that cannot
work. And a plan that names the local fire department is a plan only if that service has confirmed it will
respond, is equipped and trained for the space, and can arrive in time.

## 4. Scope and non-goals

A load estimate. Retrieval system components are rated products and the system rating comes from the
manufacturer for the specific combination of winch, line, davit or tripod, and anchorage -- and it is not a
calculation. It does not evaluate the anchorage or its footing, which frequently governs. It does not determine
whether retrieval is feasible for a given space, which depends on the configuration and which the permit-required
confined space program must assess. It does not address the rest of the program: hazard evaluation, atmospheric
testing and monitoring, ventilation, permits, attendant duties, communication, and the rescue capability that
1910.146 requires be evaluated for its ability to respond in a timely manner. Confined space rescue is where most
confined space fatalities occur, and an untrained rescue attempt kills the rescuer: 29 CFR 1910.146, the
equipment manufacturers' ratings, and the employer's confined space and rescue program govern.
