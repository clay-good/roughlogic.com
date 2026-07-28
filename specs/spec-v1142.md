# roughlogic.com Specification v1142 -- Carbon Monoxide Alarm Placement (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1141.md.
>
> **The gap.** `smoke-alarm-placement` (spec-v1141) names carbon monoxide alarms as a separate section it
> does not check. This is that section, and the contrast between the two is the reason it earns a tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a negative or
non-integer count, or fewer than one story, return `{ error }`. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `co-alarm-placement` -- Carbon Monoxide Alarm Requirement and Count (IRC R315)

```
inputs:  has_fuel_appliance, has_attached_garage, sleeping_areas,
         bedrooms_with_appliance, stories, per_story_amendment
compute: required  <- a fuel-fired appliance in the dwelling OR an attached garage
         alarms    =  one outside each separate sleeping area
                    + one inside each bedroom with a fuel-burning appliance
                      in it or its attached bathroom (R315.3 exception)
                    + one per additional story ONLY if a local amendment is toggled on
outputs: required, trigger, area_alarms, bedroom_alarms, story_alarms, required_alarms,
         per_story_applied, note
```

**CO alarms are a function of a source, not of the dwelling existing.** R315.2 triggers on a fuel-fired
appliance *or* an attached garage. An all-electric house with a **detached** garage legitimately needs
none -- and the attached-garage trigger is the one people miss, because the source there is a car, not an
appliance. The first fixture is exactly that case: no gas anywhere, alarms required anyway.

**And the count is not the smoke-alarm count.** The alarm goes **outside** each separate sleeping area,
not in each bedroom. The fuzzer runs both tiles on the same house and pins that smoke asks for **7** where
CO asks for **2** -- applying one count to the other is how a three-bedroom house ends up with several CO
alarms it does not need. The single case that puts one *inside* a bedroom is R315.3's exception: a
fuel-burning appliance in that bedroom or its attached bathroom.

**The per-story rule is opt-in, and labelled as such.** The model IRC has no per-story requirement for CO
the way it does for smoke. Many states and cities amend one in, so it is a toggle the user turns on rather
than a hidden default in either direction -- the second fixture shows the same house needing 5 with it and
3 without.

**One placement point the count cannot capture,** stated in the note: "immediate vicinity of the bedrooms"
means the corridor serving them, so one alarm can cover several bedrooms off a single hall while bedrooms
at opposite ends of a house are separate sleeping *areas*. Count areas, not doors.

## 3. Scope

Not checked: combination smoke/CO alarms and how they satisfy both sections at once, interconnection,
power and battery backup and the battery-only allowances in existing construction, the alteration and
addition triggers, detector-and-panel systems, mounting height (usually the listing's business), and state
amendments generally -- which are more common and more varied on CO than on smoke.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `smoke-alarm-placement` (which now links
forward), `combustion-air`, `co-air-free`, and `egress-window-check`. Fuzzer pins both fixtures, all four
trigger combinations including that no trigger means zero even with bedroom appliances entered, that the
count tracks sleeping areas, a **cross-tile** comparison proving the smoke and CO counts genuinely differ,
the bedroom exception, that per-story is off by default and adds stories-minus-one when on, and every
error seam.
