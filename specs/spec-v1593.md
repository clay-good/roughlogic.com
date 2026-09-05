# roughlogic.com Specification v1593 -- Propane Two-Stage Regulator and Line Sizing (`calc-gas.js`, Group B Plumbing and Gas, propane, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; propane and lp-gas service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A propane system runs at three pressures -- tank, intermediate, and appliance -- and each regulator has to pass the full connected load at its own inlet condition. Sizing the second stage on the total load while the first stage was sized on something else is how a system starves at full fire.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive connected load, inlet pressure, or regulator capacity, or an outlet pressure at or above the inlet returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): NFPA 58 and the adopted fuel gas code by name with manufacturer regulator capacity tables named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`propane regulator sizing`, `two stage regulator lp gas`, `first stage second stage propane`, `regulator capacity inlet pressure`, `lp gas lock up pressure`.

## 2. The tile

### 2.1 `propane-regulator-sizing` -- Propane Two-Stage Regulator and Line Sizing

```
two-stage        first stage: tank pressure down to about 10 psig
                 second stage: 10 psig down to 11 in wc (about 0.4 psig)
capacity         each regulator must pass the total connected load at its inlet pressure
                 regulator capacity RISES with inlet pressure; the first stage is sized
                 at the LOWEST expected tank pressure, which is a cold winter day
piping           the 10 psig line between stages is small; the 11 in wc line after is large
                 (`gas-pipe-sizing` handles the sizing at each pressure)
lock-up          outlet pressure at no flow; must not exceed the appliance rating
```

The reason two-stage exists is that carrying gas at 10 psig lets the interconnecting pipe be far smaller than
carrying it at 11 inches of water column -- so the first stage sits at the tank and the second sits at the
building, and the long run between them is small pipe. Collapsing that into a single regulator at the tank means
running the whole distance at 11 in wc, which needs pipe several sizes larger.

The sizing trap is inlet pressure. A regulator's capacity is a function of the pressure across it, so a first
stage that comfortably passes the load with a 100 psig tank on a summer afternoon may not pass it with a 25 psig
tank on a cold January morning -- and the tank pressure follows the liquid temperature. First stages are sized at
the minimum expected tank pressure for exactly this reason, and the failure appears in a cold snap alongside the
vaporization failure it resembles.

Lock-up is the other check. Every regulator lets outlet pressure rise slightly at zero flow, and if that lock-up
pressure exceeds what the appliance or the second stage can take, the system is unsafe at idle rather than at
full fire.

**Inputs:** total connected load, minimum expected tank pressure, the interstage pressure, the appliance manifold pressure, each regulator capacity at its inlet condition, and the lock-up pressure

**Outputs:** the load each stage must pass, the capacity of each regulator at its design inlet pressure, the margin at both the minimum and maximum tank pressure, a flag where a stage is short at the minimum tank pressure, and the lock-up pressure against the downstream rating

## 3. Worked example

A 500,000 BTU/h connected load on a two-stage system.

```
propane heat content ~ 2,500 BTU per cubic foot
required flow        = 500,000 / 2,500 = 200 cu ft/h
```

Both regulators must pass 200 CFH. Now the inlet-pressure check on the first stage:

```
summer, tank at 120 psig -> the regulator's capacity table shows ample margin
winter, tank at  25 psig -> capacity falls substantially at the lower inlet
```

A first stage rated 300 CFH at 100 psig inlet may pass well under 200 CFH at 25 psig,
and **the system starves on the coldest morning of the year** -- the same morning the tank is struggling to
vaporize (`propane-vaporization-rate`). Sizing the first stage at the minimum expected tank pressure is what
prevents it.

The second stage is easier because its inlet is regulated at about 10 psig year-round, so its capacity does not
move with the weather. Its constraint is lock-up: outlet pressure at no flow must stay within what the appliance
regulators can accept.

## 4. Scope and non-goals

A capacity comparison using manufacturer regulator data the user supplies. Regulator capacity tables are
specific to the model, the inlet pressure, and the outlet setting, and interpolating between table rows or using
a nominal rating will oversize or undersize a stage. It does not size the gas piping at either pressure, which is
`gas-pipe-sizing` and must be done separately for the interstage and manifold sections at their own pressures and
allowable drops. It does not address venting and vent line sizing for the regulators, regulator location and
protection from weather and physical damage, relief and overpressure protection, or the requirement that vents
terminate where a release is safe. It does not address appliance regulators or manifold pressure adjustment. LP
gas systems are governed by NFPA 58, the adopted fuel gas code, the regulator and appliance manufacturers, and
the AHJ.
