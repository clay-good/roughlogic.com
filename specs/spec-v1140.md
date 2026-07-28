# roughlogic.com Specification v1140 -- Drainage Cleanout Layout (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1139.md.
>
> **The gap.** A dupe scan for "cleanout" and "change of direction" returned zero hits, in a module that
> already sizes drains, vents, and their terminals.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
run, spacing, or pipe size, a negative or non-integer count, more changes grouped away than entered, or a
negative clearance return `{ error }`. Hand-written renderer, matching this module's convention.

## 2. The tile

### 2.1 `cleanout-layout` -- Drainage Cleanout Layout (IPC 708)

```
inputs:  horizontal_run_ft, max_spacing_ft (100), direction_changes,
         changes_grouped_away, stack_count, pipe_size_in, clear_space_in, crawl_height_in
compute: spacing  = max(0, ceil(run / spacing) - 1)     run assumed to begin at one
         changes  = min(changes - grouped away, ceil(run / 40))    the grouping cap
         stacks   = one per waste or soil stack
         total    = the three, ADDED
         access   = 18 in clear at the opening (6 in and smaller)
                    and 24 in pathway height in a crawl space
outputs: spacing_cleanouts, change_cap, change_cleanouts, cap_governs, stack_cleanouts,
         total_cleanouts, small_bore, clear_ok, in_crawl, crawl_ok, access_ok, note
```

**Three triggers, and they add.** Counting from any one of them comes out wrong: a run counted only by
the 100 ft spacing misses the bends and the stack bases, and a run counted bend-by-bend overshoots.

**The grouping allowance is the interesting rule.** Because the cleanout at the *first* change of
direction over 45 degrees serves every such change within 40 ft of developed length, the change-driven
count can never exceed `ceil(run / 40)` however many elbows are drawn. A 240 ft run with **nine** bends is
capped at **six** -- total 10, not 13. The tile reports the cap beside the entered count and says which
governed; the fuzzer pins the cap across sixteen run/bend combinations.

**Access is a requirement, not a courtesy.** It is where cleanouts get value-engineered into uselessness:
18 in of clear space at the opening for 6 in and smaller, and 24 in of unobstructed pathway height in a
crawl space. The cross-check fixture has the right *count* and fails anyway on both. A cleanout that
cannot be reached and turned does not count as one, and the tile says so. Cleanouts over 6 in carry their
own larger clearance requirement, so the tile returns `null` there rather than a false pass.

**One stated assumption:** the spacing count assumes the run *begins* at a cleanout -- a stack base, an
upstream cleanout, or wherever the code otherwise puts one. If it does not, add one at the head.

## 3. Scope

Not checked: cleanout size relative to the pipe, whether a fitting or fixture may serve as the cleanout,
the building drain and sewer junction, manholes on large sewers, the direction the cleanout must face,
concealed piping and access covers, and material and thread type.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `vent-terminal-check`,
`aav-install-check`, and `plumbing-fixture-count`. Fuzzer pins both fixtures, the grouping cap and the
additive total across sixteen combinations, grouping-away behaviour, the exact spacing seams at and just
past 100 ft, that an editable spacing limit touches only the spacing count, both access seams with their
compliant boundary values, the `null` path for large bores and for a non-crawl location, that access never
changes the counts, and every error seam.
