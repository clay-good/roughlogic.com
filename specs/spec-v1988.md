# roughlogic.com Specification v1988 -- Tile Substrate Flatness and Allowable Lippage (ANSI A108.02) (`calc-finish.js`, Group E Carpentry and Construction, tile, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built from the Ceramic Tile Education Foundation's quotation of ANSI A108.02 (read 2026-10-19; the standard itself is sold and was not read): for tile with all edges under 15 in, Section 4.1.4.3.2 is 1/4 in in 10 ft and 1/16 in in 12 in (1 ft), not the 1/8 in in 24 in this spec gives. The 2023-edition renumbering this spec mentions was not confirmed, so the tile cites the 4.1.4.3 and 4.3.7 numbers the quotation uses. The lippage chart is for pressed floor and porcelain tile and joints of 1/16 in or more.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group E, the tile bench in `calc-finish.js`, no new dependency and no network call.
>
> **The gap.** Large-format tile fails for one reason more than any other: the floor under it was not flat enough,
> and the lippage that results is argued about after the fact. ANSI A108.02 sets both numbers -- the substrate
> flatness the installer must have before setting a tile 15 in or longer, and the lippage allowed after -- and nothing
> in the catalog states them against a straightedge reading. `self-leveler-bags` fixes the floor; this says whether it
> needs fixing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive tile
edge, a negative joint, deviation or warpage, or a joint over 1 in returns `{ error }`. Citation: ANSI A108.02 (2013
edition sections 4.1.4.3.1 and 4.3.7; renumbered 4.2 and 4.4 in the 2023 edition) by name and section, with ANSI
A137.1 named as the source of the tile's allowable warpage the reader enters, GOVERNANCE.general; the standard's
values are stated as facts, the standard is not reproduced. Aliases: `tile lippage allowed 1/32`, `floor flatness for
large format tile 1/8 in 10 ft`, `is my floor flat enough for 24 inch tile`, `ANSI A108.02 lippage`, `substrate
flatness tile`.

## 2. The tile

### 2.1 `tile-flatness-lippage-check` -- Tile Substrate Flatness and Allowable Lippage (ANSI A108.02)

```
flatness, tile    maximum variation 1/8 in in 10 ft and 1/16 in in 24 in from the
15 in or longer   required plane, measured from the high points
flatness, shorter 1/4 in in 10 ft and 1/8 in in 24 in
lippage, joint    allowable lippage 1/32 in, plus the tile's inherent warpage
under 1/4 in
lippage, joint    allowable lippage 1/16 in, plus the inherent warpage
1/4 in or wider
checks            each straightedge reading against its limit; the total lippage
                  allowance = the lippage figure + the entered warpage
```

Two numbers, each with a threshold. Flatness tightens at a 15 in tile edge because a long tile bridges a hollow and
rocks on a hump, and the tolerance is a straightedge measurement the installer can make before the first tile: a 10
ft straightedge and a 2 ft one, reading the gap under each from the high points. Lippage tightens as the joint
narrows because a wide joint lets the eye and the foot ramp between tiles and a tight joint does not.

The warpage term is the one that settles arguments. A tile is allowed to be bowed by ANSI A137.1 within a tolerance
that depends on its type and size, and the lippage allowance is on top of that bow, so a 1/16 in lip on a tight-joint
floor is within tolerance when the tile's own warpage is 1/32 in and out of it when the tile is flat. The reader
enters the warpage from the tile's data sheet or a straightedge across the tile's back.

**Inputs:** the tile's longest edge, the grout joint width, the straightedge deviation measured over 10 ft and over
24 in, and the tile's inherent warpage

**Outputs:** the two flatness limits and pass/fail for each reading, the lippage figure for the joint, the total
lippage allowance including warpage, and the sentence that a failed flatness reading means grinding or leveling
before setting (`self-leveler-bags`)

## 3. Worked example

A 24 in tile at a 1/8 in joint, floor reads 3/16 in under the 10 ft straightedge and 1/16 in under the 24 in, tile
warpage 1/32 in:

```
tile 24 in >= 15 in    limits 1/8 in in 10 ft, 1/16 in in 24 in
10 ft reading  3/16 in > 1/8 in     FAIL: 1/16 in too much; level before setting
24 in reading  1/16 in <= 1/16 in   ok
joint 1/8 in < 1/4 in   lippage 1/32 in
allowance      1/32 + 1/32 warpage = 1/16 in between adjacent tile edges
```

**The same floor passes for a 12 in tile at a 1/4 in joint:** limits 1/4 in and 1/8 in, both readings within; lippage
1/16 in plus 1/32 in warpage, 3/32 in allowed.

## 4. Scope and non-goals

A check against the standard's stated tolerances. It does not measure the floor, compute the leveling quantity
(`self-leveler-bags`), address wall tile, mortar coverage (`thinset-coverage`), movement joints (EJ171), or the
pattern-specific offset limit (a running bond with over a 33 percent offset on tiles 15 in or longer carries its own
lippage expectation in the TCNA Handbook). ANSI A108.02 as cited in the project specification, the tile
manufacturer's warpage data and the installer govern.
