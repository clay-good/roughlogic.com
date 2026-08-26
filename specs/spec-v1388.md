# roughlogic.com Specification v1388 -- Positive-Pressure Ventilation Fan Sizing and Clearing Time (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group F has a smoke ejector CFM tile and a confined-space air-change tile but nothing that sizes a PPV fan against a structure and predicts how long the clear will take. The number that matters is not the fan's rated cfm -- it is the effective flow through the structure, which is a fraction of it, and the dilution time that follows is logarithmic, not linear.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive volume, fan rating, or efficiency, an efficiency outside 0-1, or a target concentration at or above the starting concentration, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the well-mixed dilution model t = (V/Q) ln(C0/C) and the entrainment practice of positive-pressure ventilation, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `ppv-fan-sizing` -- Positive-Pressure Ventilation Fan Sizing and Clearing Time

```
effective flow   = rated cfm x entrainment efficiency
one air change   = volume / effective flow
clearing time    = (volume / effective flow) x ln(C0 / C_target)
required cfm     = volume x ln(C0/C) / (efficiency x target time)
```

A PPV fan's rated cfm is measured in free air at the fan face. What reaches the structure is less -- the cone has
to seal the doorway, some air spills, and the exhaust opening has to be sized to let it out. An entrainment
efficiency somewhere around 50% to 70% is the working assumption, and the effective flow is what the arithmetic
should use.

The clearing time is a dilution problem, not a displacement one. Air entering a room mixes with what is there
rather than pushing it out as a plug, so the contaminant falls exponentially: each air change removes about 63% of
what remains. Getting to 90% clear takes 2.3 air changes, to 99% takes 4.6. This is why a crew that gives the fan
"one air change" and goes in finds the building still charged, and it is why the exhaust opening -- which sets
whether you get the flow at all -- matters more than fan horsepower.

**Inputs:** structure volume (cubic ft), fan rated cfm, entrainment efficiency, starting and target contaminant
concentration (or the fraction to be removed), and optionally a target clearing time.

**Outputs:** effective flow (cfm), time for one air change, clearing time to the target, and the fan rating a
target clearing time would require.

## 3. Worked example

A 2,000 sq ft single story with 9 ft ceilings -- 18,000 cubic ft -- with a 12,000 cfm fan at 60% entrainment,
clearing to 10% of the starting concentration:

```
effective flow = 12,000 x 0.60         = 7,200 cfm
one air change = 18,000 / 7,200        = 2.5 min
clearing time  = 2.5 x ln(10)          = 5.8 min
```

Nearly six minutes, not two and a half. Halve the exhaust opening so the effective flow drops to 3,600 cfm and it
becomes 11.5 minutes with the same fan -- the opening, not the fan, doubled the time. And note the shape of the
curve: getting from 90% clear to 99% clear costs another 5.8 minutes, as long as the whole clear took to that
point.

## 4. Scope and non-goals

A well-mixed single-compartment model, which a burning building is not. Real structures have compartments,
stairwells, and dead spaces that clear at completely different rates, and stratified hot smoke does not mix like a
tracer gas. The model says nothing about whether ventilation is tactically correct at that moment -- PPV applied
to an unlocated, unvented fire feeds it, and that decision belongs to the incident commander, not to a
calculator. It does not address flow path, the size and position of the exhaust opening beyond noting its
dominance, carbon monoxide readings, or when it is safe to remove SCBA, which is a metering question. Fire-ground
decisions are the incident commander's; department SOPs govern.
