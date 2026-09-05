# roughlogic.com Specification v1702 -- Pool Pump Speed Reduction Energy Savings (`calc-water.js`, Group M Water and Wastewater Operations, pool service, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; pool and spa service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A pool pump's power follows the cube of its speed while the water it moves follows the first power, so running slower for longer moves the same water for a fraction of the energy. It is the largest single energy saving available on a residential pool and the arithmetic is one exponent.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive speed ratio or run time, or a speed ratio above one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the affinity laws applied to turnover energy with the Virginia Graeme Baker Act named for entrapment safety, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pool pump variable speed savings`, `affinity law pool pump`, `pool pump energy cube law`, `turnover at low speed`, `pool pump cost savings`.

## 2. The tile

### 2.1 `pool-pump-speed-savings` -- Pool Pump Speed Reduction Energy Savings

```
affinity laws     Q proportional to N;  H to N^2;  P to N^3
same turnover     to move the same volume at half speed takes twice the time
energy for a turnover  P x t, so halving speed and doubling time gives
                  (1/8 power) x (2 time) = 1/4 the energy
practical         a variable speed pump at 40 to 50% speed uses a small fraction of
                  the energy of the same pump at full speed
limits            heaters, chlorinators, and cleaners have minimum flow requirements
                  filtration is better at low flow, not worse
```

The cube law is what makes this so large. Power falls as the cube of speed and flow falls linearly, so the
energy to move a given VOLUME falls as the square of the speed reduction -- halve the speed, run twice as long,
and use a quarter of the energy. Few efficiency measures anywhere offer that, and it is available on any pool
with a variable speed pump.

Filtration actually improves at lower flow, which is counterintuitive and worth stating. A filter removes
particles better at a low face velocity because the water spends longer in the medium and there is less
disturbance of the collected material, so slow filtration is better filtration as well as cheaper. The intuition
that a bigger pump filters better is wrong in both respects.

The limits are the equipment downstream. A heater has a minimum flow below which it will not fire or will trip on
its flow switch; a salt chlorine generator has a minimum flow for its own cell; a pressure-side cleaner needs a
certain flow to operate. So the speed schedule is usually multi-speed -- low for filtration hours, higher during
heating or cleaning -- and the saving is computed across the schedule rather than at a single speed.

Suction entrapment safety is unaffected by speed reduction but it is worth noting that any pump work is an
occasion to verify the drain covers and the safety vacuum release, which is a life-safety requirement.

**Inputs:** the pump rated power and speed, the reduced speed as a fraction, the run time at each speed, the required daily turnover, the equipment minimum flow requirements, and the energy cost

**Outputs:** the flow and power at the reduced speed, the run time needed for the same turnover, the energy per turnover at each speed, the daily and annual saving, and a flag where the reduced flow falls below a stated equipment minimum

## 3. Worked example

A 2 hp pump running 8 hours a day at full speed, moving the pool's turnover.

Drop it to 50 percent speed:

```
flow  = 50% of full
power = (0.50)^3 = 12.5% of full
time for the same turnover = 2 x 8 = 16 hours
energy = 0.125 x 16 / (1.0 x 8) = 0.25
```

**A quarter of the energy for the same water moved.** At 2 hp (1.49 kW) times 8 hours that is 11.9 kWh a day at
full speed against 3.0 kWh at half speed:

```
saving = 8.9 kWh/day x 365 x $0.16 = ${8.9*365*0.16:,.0f} per year
```

On a pump that costs a few hundred dollars more than a single-speed unit, that is a payback measured in months.

Go further, to 40 percent:

```
power = (0.40)^3 = 6.4% of full
time  = 8 / 0.40 = 20 hours
energy relative to full speed = 0.064 x 20 / 8 = 0.16
```

**16 percent of the original energy**, and the filtration is better at that flow rather than worse.

The limits: at 40 percent speed the flow may be below the heater's minimum firing flow and below the salt cell's
minimum, so the schedule runs low for the filtration hours and steps up while the heater or the cleaner is
operating. The saving is computed across that schedule, and it is still large.

## 4. Scope and non-goals

An affinity-law calculation. The laws hold along the pump curve and become less accurate at large speed
reductions; manufacturers publish variable-speed performance data that supersedes them. It does not evaluate
whether the reduced flow meets the turnover requirement in the available hours, the filter's design flow range,
or the minimum flow requirements of heaters, chlorine generators, cleaners, and water features, any of which can
set a floor on speed. It does not address the pool's required turnover rate, which for public pools is set by the
health code. It does not address suction entrapment safety: main drain covers, the anti-entrapment provisions of
the Virginia Graeme Baker Act, and safety vacuum release systems are life-safety requirements that apply
regardless of pump speed and that any pump work is an occasion to verify. The pump and equipment manufacturers'
data, the applicable pool code, and for public pools the health department govern.
