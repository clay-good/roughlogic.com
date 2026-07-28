# roughlogic.com Specification v1127 -- Mixed-Length Bar Nesting (calc-fab.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`**
> (Group E), no new module or group. Adds one import to an existing dependency (`makeTextarea` from
> `ui-fields.js`, already used elsewhere in the repo). Inherits spec.md through spec-v1126.md.
>
> **The gap, self-declared.** `barstock-cutlist` handles one piece length and says so: *"Mixed-length
> nesting, end trim, and clamping loss are not modeled."* Fourth tile this session from the
> self-declared-gap grep.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an empty or
malformed cut list, a non-positive length, a non-integer or non-positive quantity, a piece longer than
the usable stick, a non-positive stock length, a negative kerf or trim, or trim consuming the whole stick
return `{ error }`. Hand-written renderer with a textarea, matching this module's convention (calc-fab.js
has no `_simpleRenderer` factory).

## 2. The tile

### 2.1 `bar-nesting` -- Mixed-Length Bar Nesting (Cutting Stock)

```
inputs:  cut_list (one line per size, "length,quantity"), stock_length_in, kerf_in, end_trim_in
compute: usable = stock - trim;  pieces expanded and sorted DESCENDING
         first-fit-decreasing: place each piece in the first stick where
             used + length + (kerf if that stick is not empty) <= usable
         total kerf = (pieces - sticks) x kerf     one fewer cut per stick
         drop = total stock - part - kerf - trim;  yield = part / total stock
         lower bound = ceil((part + (pieces - sticks) x kerf) / usable)
outputs: sticks, total_pieces, size_count, usable_in, total_stock_in, total_piece_in,
         total_kerf_in, total_trim_in, total_drop_in, yield_pct, longest_drop_in,
         theoretical_min_sticks, at_theoretical_min, patterns, note
```

**One length is division; several is packing.** That is the whole reason this is a separate tile. With a
mixed list the question stops being "how many fit" and becomes "which pieces share a stick."

**Why longest-first.** The long pieces have the least flexibility, so placing them while every stick is
still empty leaves the short ones to fill the gaps they leave behind. Reversing the order strands long
pieces on sticks that short ones have already nibbled, and the stick count goes up.

**Kerf is charged per cut, not per piece.** A stick holding *n* pieces takes *n-1* kerfs, so a stick that
cuts clean to its end takes one fewer than a stick with drop left over -- the detail hand estimates miss.
The worked example makes it concrete: three 62s, a 38, and a 14.5 come to 238.5 in of part plus four
0.125-in kerfs, filling the 239-in usable length to **exactly zero drop**. The fuzzer pins the identity
`total kerf = (pieces - sticks) x kerf` across 36 kerf/trim/stock combinations.

**Honesty about the method.** First-fit-decreasing is a near-optimal heuristic, not an optimum. The tile
computes a material lower bound alongside its answer and states plainly whether the packing has reached
it -- when it has, no rearrangement saves a stick; when it has not, a hand rearrangement or a true
cutting-stock solver may do better. It never claims optimality it has not verified.

**A pair of fixtures that teaches something.** Zeroing the kerf and trim recovers 7.375 in of material and
raises the drop from 59.6 to 67 in, yet the stick count and the yield are **identical** -- the packing
already had slack, and the binding constraint is the piece mix, not the sawdust.

## 3. Scope

Not modeled: clamping and chuck loss, grain or finish direction, mill tolerance on the stock length,
reusable drop carried in from an earlier job, or nesting across more than one stock size. The list is
capped at 5,000 pieces to keep the packing responsive in the browser. The longest single drop is reported
precisely so it can be checked against the next cut list before it goes in the rack.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `barstock-cutlist` (which now links
forward), `metal-weight`, `coil-length`, and `weld-cost-per-foot`. Fuzzer pins both fixtures, then across
36 kerf/trim/stock combinations asserts the material balance closes exactly, that every piece is placed
once, that no stick overflows, that each reported drop matches its stick's contents, and the per-cut kerf
identity. It also pins descending placement within every stick, that zeroing kerf and trim does not always
save a stick, monotonicity in stock length and kerf, that a single-size list reduces to the plain
cut-list division, whitespace-or-comma parsing with blank lines ignored, and every error seam.
