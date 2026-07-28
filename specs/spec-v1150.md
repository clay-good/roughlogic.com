# roughlogic.com Specification v1150 -- Fall Arrest Anchorage and System Force (calc-rescue.js, Group F, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-rescue.js`** (Group F), no new module, group, or dependency. Inherits spec.md through
> spec-v1149.md.
>
> **The gap.** `fall-arrest-clearance` computes how far below the anchor a worker needs. Nothing said what
> the anchor and the system have to **withstand**. A dupe scan for "arresting force" and "5000 lb"
> returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA regulations are US federal law
in the public domain, so both paragraphs are quoted directly.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
or non-integer worker count, a negative load or distance, or the engineered route without a design load
return `{ error }`. Hand-written renderer, matching this module's aliased-import convention. `check-module-sizes` cap for calc-rescue.js raised 11500 -> 15000.

## 2. The tile

### 2.1 `fall-arrest-anchorage` -- Anchorage and System Force Check

```
inputs:  workers_attached, design_route, design_load_lb, anchorage_capacity_lb,
         arresting_force_lb, deceleration_distance_ft, free_fall_ft
compute: 502(d)(15)  prescriptive: 5,000 lb x employees attached
                     engineered:   2 x the design load, qualified person
         502(d)(16)  arresting force <= 1,800 lb;  deceleration <= 3.5 ft;
                     free fall <= 6 ft AND no contact with a lower level
outputs: engineered, required_anchorage_lb, anchorage_ok, anchorage_shortfall_lb,
         achieved_safety_factor, force_ok, decel_ok, freefall_ok, system_ok, passes, note
```

**The two numbers everyone quotes are not the same number.** 5,000 lb is what the **anchorage** must
support; 1,800 lb is what the **system** may impose on the **worker**. An anchor rated for 5,000 says
nothing about whether the lanyard keeps the body under 1,800, and a system that limits force beautifully
says nothing about what it is tied to. The first fixture makes it concrete: a fully compliant system on an
inadequate anchor.

**Two traps inside the anchorage sentence.** The 5,000 lb is **per employee attached**, so two workers on
one anchor is **10,000** -- the wording routinely gets dropped. And it is only one of two routes: an
anchorage designed as part of a complete system with a **safety factor of at least two** under a qualified
person is equally compliant, and can legitimately be far below 5,000. The cross-check fixture passes a
**2,500 lb** anchorage on a 1,000 lb design load. The prescriptive number is large precisely because it
covers attachment points nobody analysed.

**The free-fall rule has a second half with no number in it** -- *nor contact any lower level*. A 4-ft
free fall satisfies the 6-ft limit and still fails if the worker reaches the deck. That is
`fall-arrest-clearance`'s job and is deliberately not duplicated. And the strength requirement is written
in **energy**, not force: twice the impact energy of a 6-ft free fall *or the free fall the system
permits, whichever is less* -- which is part of why a self-retracting device changes the conversation.

## 3. Scope

Not checked: clearance below the anchor; body belts, prohibited for fall arrest; horizontal lifelines,
which need a qualified person and behave nothing like a fixed anchor; swing fall, which has its own tile;
snaphook compatibility and rollout; equipment ratings and inspection; post-fall rescue; and positioning or
restraint anchorages, which carry different numbers.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `fall-arrest-clearance`,
`swing-fall-geometry`, `scaffold-guardrail-check`, and `guard-post-load`. The tools-data row sits outside
the parsed Group F block, so no count assertion moves. Fuzzer pins both fixtures, per-employee scaling at
four counts, the engineered route being independent of worker count and refusing to run without a design
load, the exact safety-factor seam, all three system seams, that each system limit fails alone without
disturbing the anchorage verdict, that omitted values yield `null` rather than failures, and every error
seam.
