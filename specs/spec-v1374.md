# roughlogic.com Specification v1374 -- Stage Deck and Platform Live-Load Check (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group N has counterweight balance and a truss point-load check but nothing for the deck people stand on. Platform live load is a code number, the leg reaction is a division, and the two together decide whether a rented staging system is being used inside or outside its rating -- which is the most common structural question on a show site.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive deck area, leg count, or design live load, or a negative dead load, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the assembly and stage live-load provisions of IBC Table 1607.1 and ANSI E1.21 / ANSI E1.2 for temporary staging, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `stage-deck-live-load` -- Stage Deck and Platform Live-Load Check

```
deck area       = length x width
live load       = area x design psf
total load      = live load + deck dead weight
load per leg    = total load / number of legs
utilization     = load per leg / leg rating
concentrated    = compare the specified point load against the deck's rated point load
```

The IBC assigns stages and platforms a uniform live load -- 125 psf for stage floors, 100 psf for assembly
areas -- and the whole check is applying it to the deck's own footprint and dividing by the legs. A 4 x 8 deck at
125 psf carries two tons, and the four legs under it each take half a ton before the deck's own weight is added.
Rented staging legs are commonly rated somewhere between 1,000 and 2,500 lb, so a system can be well inside its
rating or well outside it depending on which product is on the truck, and nobody checks.

The concentrated-load line matters more often than the uniform one. A uniform live load is a design abstraction;
a piano wheel, a forklift, or a truss base plate is a real point load in a real square inch, and a deck that
passes the uniform check by a wide margin can fail under a single wheel. Both belong on the same screen.

**Inputs:** deck length and width (ft), number of legs, design live load (psf), deck dead weight (lb), leg
rating (lb), and the concentrated load to be checked with its bearing area.

**Outputs:** deck area, uniform live load, total load, load per leg, leg utilization, and the concentrated-load
comparison.

## 3. Worked example

A 4 x 8 ft deck at the 125 psf stage live load, 60 lb deck dead weight, four legs:

```
area        = 4 x 8            = 32 sq ft
live load   = 32 x 125         = 4,000 lb
total       = 4,000 + 60       = 4,060 lb
per leg     = 4,060 / 4        = 1,015 lb
```

Against a 1,000 lb leg rating this deck is already over at 101.5% utilization before anyone considers a point load,
and it needs a fifth leg or a lower design load. Against a 2,500 lb rating it sits at 41% and has real margin.
The difference is entirely which staging product was rented, and the check takes one line.

## 4. Scope and non-goals

A screen, not an engineered analysis. Real staging is a manufactured system whose capacity comes from the
manufacturer's load tables for the specific deck, leg, height, and bracing configuration -- and leg capacity falls
with height as buckling takes over, which this tile does not model. It does not check the deck panel itself in
bending, the connections, the lateral bracing, guardrails, or the surface the legs bear on, which is frequently
the real limit. Temporary structures over occupied areas are engineered and permitted work in most
jurisdictions. The staging manufacturer's load tables, a licensed engineer, and the AHJ govern.
