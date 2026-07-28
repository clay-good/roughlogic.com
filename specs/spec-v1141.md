# roughlogic.com Specification v1141 -- Smoke Alarm Count and Placement (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1140.md.
>
> **The gap.** A dupe scan for "smoke alarm" and "carbon monoxide alarm" returned zero hits. IRC R314
> sits in Chapter 3 Building Planning, the same chapter as `egress-window-check` (spec-v1131).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a negative or
non-integer count, a negative distance, or an unknown sensing type return `{ error }`. Renderer: this
module's `_simpleRenderer`.

## 2. The tile

### 2.1 `smoke-alarm-placement` -- Smoke Alarm Count and Placement (IRC R314)

```
inputs:  sleeping_rooms, sleeping_areas, additional_stories, alarm_type,
         distance_to_cooking_ft, distance_to_bath_door_ft
compute: R314.3    count = rooms + areas + additional stories
                   3 ft from a tub/shower bathroom door or opening
         R314.3.1  cooking clearance by SENSING TYPE:
                     ionization 20 ft | ionization + silencing 10 ft
                     photoelectric 6 ft | marked for cooking nuisance 6 ft
outputs: required_alarms, required_cooking_ft, cooking_ok, cooking_deficit_ft, bath_entered,
         bath_ok, bath_deficit_ft, passes, would_pass_photoelectric, type_would_fix, note
```

**Two halves that get confused.** The **count** is additive and routinely undercounted -- one in each
sleeping room, one *outside* each separate sleeping area, and one on each additional story including
basements and habitable attics (but not crawl spaces or uninhabitable attics). Three bedrooms, one
sleeping area, one extra story is **five**, before interconnection or power requirements enter.

**The clearance depends entirely on the sensing type, and the spread is better than three to one.** An
alarm 8 ft from a range **fails as ionization** (12 ft short of 20) and **passes as photoelectric**
(6 ft required). Both fixtures pin exactly that pair. In an open plan, changing the sensing type is often
the only way a location the code *requires* can also satisfy the nuisance separation -- and it is far
cheaper than relocating a required alarm. The tile calls that out as its own output rather than leaving
the reader to notice, and says plainly when even 6 ft is not met and the alarm simply has to move.

**The exception is named, not leaned on.** Both separations yield where observing them would prevent
placement in a location R314.3 requires. A required location wins -- but the note frames that as a
documented last resort, with a type change to try first.

## 3. Scope

Not checked: carbon monoxide alarms (a separate section with their own locations), interconnection,
primary power and battery backup and the battery-only allowances in existing construction, the
alteration/repair/addition triggers, ceiling and wall mounting geometry including sloped, peaked, and tray
ceilings, state sealed-battery rules, and heat detection where it substitutes.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `egress-window-check`, `landing-check`,
and `guard-handrail-check`. Fuzzer pins both fixtures, all four sensing types against one location, that
the count never depends on sensing type, the additive count across 27 combinations, every cooking seam and
its deficit, that below 6 ft no type works and the note says so, the 3 ft bathroom seam, that an omitted
bathroom distance yields `null` rather than a failure, that the bathroom rule alone can fail an
otherwise-clear alarm, and every error seam.
