# roughlogic.com Specification v1983 -- Hearth Extension Size and Thickness (IRC R1001.9, R1001.10) (`calc-masonry.js`, Group E Carpentry and Construction, masonry, 1 New Tile)

> **Status: PROPOSED 2026-10-19. Single-tile spec.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the masonry fireplace bench in `calc-masonry.js` beside
> `fireplace-flue-area`, no new dependency and no network call.
>
> **The gap.** `fireplace-flue-area` checks the flue against the opening under R1003.15.1 and stops at the firebox.
> The hearth extension in front of that opening is sized from the same opening by R1001.10, with a step at 6 sq ft
> that doubles as the most common hearth red-tag: a 36 by 30 in opening is 7.5 sq ft and needs 20 in in front, not
> the 16 in the tile setter poured.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive
opening dimension, a negative measured extension or thickness, or a firebox-bottom height under 0 returns `{ error }`.
Citation: IRC 2024 R1001.10 (hearth extension dimensions) and R1001.9.1 (hearth extension thickness) by name, values
unchanged since the 2015 edition, free at codes.iccsafe.org, GOVERNANCE.general. Aliases: `hearth extension size`,
`how far does the hearth extend in front of the fireplace`, `16 inch or 20 inch hearth`, `hearth extension 6 square
feet rule`, `R1001.10 hearth`.

## 2. The tile

### 2.1 `hearth-extension-check` -- Hearth Extension Size and Thickness (IRC R1001.9, R1001.10)

```
opening area     A = width x height / 144, in sq ft
under 6 sq ft    extension at least 16 in in front of the opening and 8 in beyond each
                 side (R1001.10)
6 sq ft or more  at least 20 in in front and 12 in beyond each side
extension plan   (width + 2 x side) by front: the minimum noncombustible footprint
thickness        hearth extension at least 2 in thick (R1001.9.1); exception: 3/8 in
                 where the bottom of the firebox opening is at least 8 in above the
                 extension
check            measured front, sides and thickness each against the requirement
```

The hearth extension is the noncombustible floor an ember lands on, and the code sizes it by the opening it faces. A
small firebox throws less, so an opening under 6 sq ft takes 16 in in front and 8 in to each side; at 6 sq ft and over
the numbers step to 20 and 12. The step is the whole tile: a 36 in wide opening is 7.5 sq ft at 30 in tall and 5.5 sq
ft at 22 in, and only the first needs the larger hearth.

Thickness is the second check. Two inches of masonry is the rule, and the exception that lets a raised firebox get by
with 3/8 in (a tile on a slab) applies only when the bottom of the opening is 8 in or more above the extension. The
tile asks for that height and applies the exception only when it is met.

**Inputs:** the fireplace opening width and height, the measured extension in front and to each side, the measured
extension thickness, and the height of the firebox bottom above the extension

**Outputs:** the opening area, the required front and side extension, the minimum extension footprint, the required
thickness, and pass/fail for each measured dimension

## 3. Worked example

A 36 in wide by 30 in tall opening, extension measured 18 in in front and 12 in to each side, 2 in thick, firebox
bottom flush with the hearth:

```
area      = 36 x 30 / 144 = 7.50 sq ft  -> 6 sq ft or more
required  front 20 in, sides 12 in; footprint 60 x 20 in
front     18 in < 20 in    FAIL (2 in short)
sides     12 in >= 12 in   ok
thickness 2 in >= 2 in     ok (firebox bottom 0 in: the 3/8 in exception does not apply)
```

**Two inches short in front is a failed final and a demolished hearth.** A 30 by 24 in opening (5.0 sq ft) needs 16
and 8 in, footprint 46 by 16 in; a 42 by 32 in opening (9.33 sq ft) needs 20 and 12, footprint 66 by 20 in.

## 4. Scope and non-goals

A check against the code's dimensions, not a hearth design. It does not check the hearth itself (R1001.9, 4 in thick
under the firebox), the hearth extension's support (R1001.9.2 cantilever rule), clearance of combustibles around the
opening (`fireplace-clearance-check`, [spec-v1992](spec-v1992.md)), factory-built fireplaces (which follow their
listing, R1004), or the flue (`fireplace-flue-area`). The adopted edition and the AHJ govern; free at
codes.iccsafe.org.
