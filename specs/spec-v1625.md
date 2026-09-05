# roughlogic.com Specification v1625 -- Pump Impeller Trim for a Balanced Flow (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A pump delivering more flow than the system needs is throttled with a valve, which burns the excess as heat in the balance valve forever. Trimming the impeller removes the excess instead, and the affinity laws say how much to take off.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive impeller diameter or flow, a required flow exceeding the current flow, or a trimmed diameter below the manufacturer minimum returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the affinity laws for impeller diameter with the manufacturer trim curves named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pump impeller trim`, `affinity law diameter`, `trim impeller instead of throttling`, `balance valve energy waste`, `pump oversized trim calculation`.

## 2. The tile

### 2.1 `pump-impeller-trim` -- Pump Impeller Trim for a Balanced Flow

```
affinity, trim   Q2/Q1 = D2/D1;  H2/H1 = (D2/D1)^2;  P2/P1 = (D2/D1)^3
required diameter D2 = D1 x (Q2 / Q1)
practical limit  do not trim below about 75 to 80% of the maximum diameter for the casing;
                 efficiency falls off and the trim relations degrade
throttling cost  the head burned across a balance valve x flow, continuously
check            the trimmed pump must still meet head at the required flow, not just flow
```

The affinity relations for a trim are not quite the same as for a speed change: flow scales with diameter
directly and head with the square, but the correspondence is approximate because trimming changes the geometry of
the impeller relative to its casing rather than scaling the whole machine. Manufacturers publish trim curves and
those are the authority; the relations give a first estimate accurate enough to decide whether trimming is worth
pursuing.

The saving is real and continuous. A pump throttled to reduce flow is developing head the system does not need
and destroying it across a valve, and that head times the flow is power converted directly to water temperature.
A trimmed impeller never develops the excess head in the first place, so the saving persists for the life of the
pump with no control action.

The limit is that a heavily trimmed impeller loses efficiency, because the gap between the impeller tip and the
casing grows and the hydraulic match degrades. Below roughly 75 to 80% of maximum diameter the manufacturer will
usually recommend a different pump or a smaller casing instead, and the affinity estimate becomes unreliable.

**Inputs:** current impeller diameter and flow, required flow, current and required head, the pump maximum and minimum trim diameters, motor power, operating hours, and the energy cost

**Outputs:** the required impeller diameter, the trim as a percentage of the current and maximum diameter, the head and power at the trimmed diameter, the head currently burned across the balance valve, the annual energy and cost saved by trimming, and a flag when the trim is below the practical limit

## 3. Worked example

A pump with a 9.5 in impeller delivering 520 gpm where the system needs 430 gpm:

```
D2 = 9.5 x (430 / 520) = 9.5 x 0.8269 = 7.86 in
trim = 9.5 - 7.86 = 1.64 in, 17.3% reduction
power ratio = (0.8269)^3 = 0.565
```

**Power falls to 57% of its current value** -- a 43% reduction -- for a
17.3% trim. That cube relationship is what makes trimming worthwhile.

On a 15 hp pump running 6,000 hours a year at $0.10/kWh:

```
current  = 15 x 0.746 x 6,000 = 67,140 kWh -> $6,714
trimmed  = x 0.565          = 37,964 kWh -> $3,796
saving                                  = $2,918 per year
```

Against a machine-shop trim costing a few hundred dollars, the payback is months.

The check before ordering it: the trimmed pump must still make the required HEAD at 430 gpm, not just the
flow. If the system needs the head the untrimmed pump was producing, the excess is not excess and the throttling
was doing real work -- in which case the pump is correctly sized and the balance valve stays.

## 4. Scope and non-goals

An affinity-law estimate. Trim relations are approximate and become less accurate with larger trims because the
impeller-to-casing relationship changes; the manufacturer's published trim curves for the specific pump and
casing are the authority and should be used before machining. Trimming is irreversible. It does not verify that
the trimmed pump meets the required head at the required flow, which must be read from the trimmed curve, and it
does not evaluate NPSH required, which changes with trim. It does not consider whether the excess flow is
serving a purpose -- a minimum flow requirement, a future load, or a diversity assumption -- or whether the system
curve will change. On variable-speed pumps trimming is usually unnecessary because the drive already removes the
excess. It does not address motor sizing, which may allow a smaller motor after a trim. The pump manufacturer's
curves, the design engineer, and the applicable balancing standard govern.
