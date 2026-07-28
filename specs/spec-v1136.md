# roughlogic.com Specification v1136 -- Air Admittance Valve Install Check (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1135.md.
>
> **The gap.** A dupe scan for "air admittance" returned zero hits. Pairs with `vent-terminal-check`
> (spec-v1135): that one governs the vent that goes through the roof, this one governs the valves people
> install instead -- and the first thing it says is that they cannot fully replace it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
height above the drain, a negative insulation height, or a negative DFU value or rating return
`{ error }`. Hand-written renderer, matching this module's convention.

## 2. The tile

### 2.1 `aav-install-check` -- Air Admittance Valve Installation Check (IPC 918)

```
inputs:  height_above_drain_in, height_above_insulation_in, has_outdoor_vent,
         ventilated_space, accessible, dfu_served, valve_dfu_rating
compute: 918.7  at least one vent pipe to the OUTDOORS, even where AAVs are used
         918.4  >= 4 in above the branch or fixture drain being vented
         918.6  >= 6 in above insulation, where insulation is present
                ventilated space, and accessible
         capacity: valve DFU rating >= DFU served, where both are given
outputs: drain_ok, drain_deficit_in, has_insulation, insulation_ok, insulation_deficit_in,
         outdoor_vent_ok, ventilated_ok, accessible_ok, rated, dfu_ok, dfu_margin,
         passes, note
```

**One rule governs all the others, and it is the one the marketing works against.** An AAV admits air to
relieve **negative** pressure and provides no relief of **positive** pressure. The air a discharging stack
pushes ahead of it has to leave somewhere, and in a building whose every vent is capped by a valve there
is no path for it. IPC 918.7 therefore still requires a vent to the outdoors. A system that fails that is
not rescued by perfect placement of every valve in it -- the note leads with this, and the fuzzer pins
that a install with everything else correct still fails without it.

**Each placement rule has a physical reason, and the note gives it** rather than asking anyone to memorise
a number: 4 in above the drain keeps the valve out of the wet path; 6 in above insulation exists because a
valve buried in blown attic insulation is a routine field failure; a valve sealed in a tight cabinet has
no air to admit; and an AAV is a mechanical device with a diaphragm that eventually fails, so burying it
behind finished work turns a cheap repair into an expensive one.

**Capacity is read from the valve's own listing** (ASSE 1051 or 1050), and individual, branch, and stack
types are not interchangeable. Nothing is shipped -- the rating is an input.

**The first question, not the last.** Several jurisdictions restrict or prohibit AAVs outright. The tile
says so and does not check it.

## 3. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `vent-terminal-check`,
`fixture-clearance-check`, and `plumbing-fixture-count`. Fuzzer pins both fixtures, that the outdoor-vent
rule fails an otherwise-perfect install, that each of the three boolean conditions can fail the check
alone, both placement seams with their compliant boundary values, that omitted insulation yields `null`
rather than a failure, exact non-negative deficits across sixteen combinations, capacity including the
tie case and both `null` paths, and every error seam.
