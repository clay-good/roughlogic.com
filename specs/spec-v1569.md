# roughlogic.com Specification v1569 -- Boiler Safety Valve Relieving Capacity (`calc-steamplant.js`, Group C HVAC, steam plant, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steamplant.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; steam plant and commercial laundry), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A boiler's safety valves have to relieve everything the burner can make, with the stop valve shut, without the pressure climbing more than a few percent. It is a comparison of stamped capacity against maximum steaming rate, and a boiler that fails it is operating outside its code case.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive required capacity, stamped capacity, or set pressure, or a set pressure above the maximum allowable working pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ASME Section I and IV relieving capacity requirement with the National Board and jurisdictional inspector named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`boiler safety valve capacity`, `relieving capacity boiler`, `safety valve sizing steam`, `accumulation test boiler`, `asme safety valve set pressure`.

## 2. The tile

### 2.1 `safety-valve-capacity` -- Boiler Safety Valve Relieving Capacity

```
required capacity   >= the boiler maximum designed steaming capacity (lb/h)
                    for a fired boiler, at least the maximum output the fuel input supports
accumulation        pressure must not rise more than 6% above MAWP with valves relieving
                    (3% for some services; the code section governs)
set pressure        no valve set above MAWP; the lowest set at or below MAWP
capacity check      sum of stamped capacities >= required, at the set pressures
economizer          may require its own relief if it can be isolated
```

The requirement is simple to state and easy to fail after twenty years of modifications: the valves must pass
everything the boiler can generate at full fire with the outlet shut, and the accumulation test is what proves
it. Where plants get into trouble is that the burner has been uprated, or the boiler has been re-rated, or a
valve has been replaced with one of a different stamped capacity, and nobody re-ran the sum.

Two details carry weight. Stamped capacity is at a specific set pressure -- the same valve passes more at a higher
set pressure -- so the sum has to be taken at the pressures actually installed, not at a catalogue figure. And
where two valves are fitted, the code governs both the set pressures and the spread between them, so a plant
cannot simply install two of whatever adds up.

Safety valves are also a maintenance item with a testing interval. A valve that has not lifted in years may not
lift at its set pressure, and its stamped capacity is a statement about a valve that works.

**Inputs:** boiler maximum steaming capacity or fuel input and efficiency, maximum allowable working pressure, each installed valve with its set pressure and stamped capacity, and the applicable accumulation limit

**Outputs:** the required relieving capacity, the sum of stamped capacities, the margin and a pass or fail, the set pressure of each valve against the maximum allowable working pressure, and the additional capacity needed where the installation is short

## 3. Worked example

A firetube boiler rated 20,700 lb/h at 150 psig MAWP, with two safety valves stamped 11,500 lb/h at 150 psig
and 10,200 lb/h at 155 psig:

```
required            = 20,700 lb/h
installed capacity  = 11,500 + 10,200 = 21,700 lb/h
margin              = 1,000 lb/h, 4.8% above required   -> PASSES
lowest set pressure = 150 psig = MAWP                   -> compliant
```

Now uprate the burner. A common modification raises the boiler to 24,000 lb/h:

```
required           = 24,000 lb/h
installed capacity = 21,700 lb/h
shortfall          = 2,300 lb/h                          -> FAILS
```

Nothing was done to the valves and the boiler is now outside its code case. This is a real and frequent
situation: burner uprates, fuel changes, and re-ratings all move the required capacity, and the safety valve sum
is not part of most people's mental checklist when they do.

Note also the second valve's set pressure of 155 psig -- above MAWP, which the code permits within limits for
supplementary valves but which means its stamped capacity applies at that pressure, not at 150.

## 4. Scope and non-goals

A capacity comparison from stamped and rated values the user supplies. It is not a relief system design and it
does not substitute for the ASME code calculation or for the accumulation test, which is the actual demonstration
of compliance. It does not select valves, determine set pressures and their permitted spread, size discharge
piping and drip pans (a discharge line that imposes back pressure or that puts thrust on the valve body defeats
it), evaluate the economizer or superheater relief requirements, or address the reheater and other special cases.
It does not evaluate valve condition, testing interval, or whether an installed valve will actually lift at its
set pressure. Safety valves are the last line of protection on a pressure vessel that can fail catastrophically:
ASME Boiler and Pressure Vessel Code Sections I and IV as applicable, the National Board inspection code, the
valve manufacturer, and the jurisdiction's boiler inspector govern.
