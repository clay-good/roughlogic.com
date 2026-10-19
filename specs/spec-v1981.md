# roughlogic.com Specification v1981 -- Bathroom and Kitchen Exhaust Fan Sizing (`calc-hvacservice.js`, Group C HVAC, 1 New Tile)

> **Status: PROPOSED 2026-10-19. Single-tile spec.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group C, the residential ventilation bench in `calc-hvacservice.js` beside
> `ashrae-622-ventilation` and `dryer-duct-length`, no new dependency and no network call.
>
> **The gap.** `ashrae-622-ventilation` sizes the whole-house rate and names the local exhaust as "a separate 62.2
> requirement this tile does not cover". Nothing covered it. The bath fan is the most-installed piece of ventilation in
> the country, and the two numbers it is sized by -- the code minimum and the 8-air-change rule of thumb -- are both
> quick arithmetic that nobody does, which is why so many 50 cfm fans sit in 150 sq ft bathrooms.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive room
dimension, a ceiling under 6 ft or over 20 ft, or a negative fixture count returns `{ error }`. Citation: IRC 2021
M1505.4.4 and Table M1505.4.4(1) (renumbered M1505.5 in the 2024 printing, to be confirmed in the free text at
codes.iccsafe.org when wired) for the minimum rates, ASHRAE 62.2 by name for the same values, and the Home Ventilating
Institute's sizing practice named as a rule of thumb, GOVERNANCE.general. Aliases: `bath fan cfm`, `bathroom exhaust fan
size`, `50 cfm or 80 cfm bath fan`, `kitchen exhaust 100 cfm`, `exhaust fan for a bathroom by square feet`.

## 2. The tile

### 2.1 `bath-exhaust-fan-sizing` -- Bathroom and Kitchen Exhaust Fan Sizing

```
code minimum    bathroom / toilet room: 50 cfm intermittent or 20 cfm continuous
                kitchen: 100 cfm intermittent or 25 cfm continuous (Table M1505.4.4(1))
8 ACH rule      cfm = L x W x H x 8 / 60: the volume changed eight times an hour
                (the HVI practice for bathrooms under 100 sq ft, equal to 1 cfm per sq ft
                at an 8 ft ceiling)
fixture rule    bathrooms over 100 sq ft (HVI): 50 cfm per toilet, shower or tub,
                100 cfm per jetted tub, summed
recommended     the larger of the code minimum and the chosen rule; rounded up to the
                next 10 cfm, which is how fans are sold
rated at        the listed rate must be met at 0.25 in wc static (M1505.3), so a fan
                is picked by its rating at that static, not its free-air number
```

The code sets a floor and the rules of thumb set the size. A 5 by 8 ft bathroom at a 9 ft ceiling holds 360 cu ft;
eight air changes an hour is 48 cfm, under the 50 cfm floor, so the floor governs and the smallest fan on the shelf
is right. An 8 by 10 ft bathroom at 8 ft holds 640 cu ft and wants 85 cfm, which is why the 50 cfm fan in it never
clears the mirror. A 12 by 14 ft master bath wants over 200 cfm by volume, or by fixtures a toilet, a shower and a
tub at 50 each plus 100 for a jetted tub.

Continuous operation is the other branch: a fan that runs all the time meets the code at 20 cfm (bathroom) or 25 cfm
(kitchen), and the tile reports both branches so a reader choosing a continuous fan with a boost speed sees both
numbers.

The static-pressure sentence is the one that catches installers. The code's rate is required at 0.25 in wc, and a
fan's box number is often its free-air rate; a 50 cfm fan that delivers 30 cfm at 0.25 in wc through 20 ft of flex
duct does not meet the code.

**Inputs:** room type (bathroom or kitchen), room length, width and ceiling height, operation (intermittent or
continuous), the sizing rule (8 ACH or fixtures), and for the fixture rule the counts of toilets, showers, tubs and
jetted tubs

**Outputs:** the code minimum for the chosen operation, the rule-of-thumb rate, the recommended fan rate rounded to
the next 10 cfm, the room volume and air changes the recommended fan delivers, and the 0.25 in wc rating reminder

## 3. Worked example

An 8 by 10 ft bathroom with an 8 ft ceiling, intermittent fan, 8 ACH rule:

```
volume      = 8 x 10 x 8 = 640 cu ft
8 ACH       = 640 x 8 / 60 = 85.3 cfm
code min    = 50 cfm (intermittent)
recommended = 90 cfm (85.3 rounded up to the next 10)
at 90 cfm   = 90 x 60 / 640 = 8.4 air changes per hour
```

**A 5 by 8 by 9 ft powder room computes 48 cfm by volume and the 50 cfm code floor governs**; a 12 by 14 by 9 ft
master bath computes 201.6 cfm by volume, 210 cfm recommended, and by the fixture rule with a toilet, a shower and a
jetted tub, 50 + 50 + 100 = 200 cfm.

## 4. Scope and non-goals

A sizing aid, not a 62.2 compliance certificate. It does not size the duct or compute the static pressure the duct
imposes (`dryer-duct-length`'s equivalent-length method and `duct-friction-static` serve), select a fan, address
makeup air (`kitchen-makeup-air-deficit` and `mua-tempering-load` do), size a range hood by the cooking appliance
(`hood-exhaust`), handle commercial kitchens or the whole-house rate (`ashrae-622-ventilation`). The adopted
mechanical code and the AHJ govern; free at codes.iccsafe.org.
