# roughlogic.com Specification v1026 -- Corner Bead / Drywall Trim Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1025.md.
>
> **The gap, and the evidence for it.** The drywall bench counts sheets, mud, tape, and screws (`drywall`,
> `drywall-fastener-takeoff`) and the wood-trim tile counts casing (`trim-linear-footage`) -- but no tile,
> alias, or compute returns corner-bead footage or stick count. Discovery batch 3: CLEAR, "no id, no alias,
> no compute." The `drywall` trade had 3 tiles before this campaign.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-integer or
negative counts, missing dimensions for a used branch, zero runs, or waste outside 0-50% return `{ error }`.
Citation discipline: takeoff arithmetic, no standard claimed. `GOVERNANCE.general`. Renderer: this module's
`_simpleRenderer`.

## 2. The tile

### 2.1 `corner-bead-takeoff` -- Corner Bead / Drywall Trim Takeoff

```
inputs:  outside_corners (count), corner_height_ft (8), wrapped_openings (count, 0),
         opening_width_ft (3), opening_height_ft (7), stock_length_ft (8), waste_pct (10)
compute: corner_lf = corners x height;  wrap_lf = openings x (2 x height + width)
         total_lf = (corner_lf + wrap_lf) x (1 + waste)
         pieces = MAX( ceil(total_lf / stock),
                       corners x ceil(height/stock) + openings x (2 ceil(oh/stock) + ceil(ow/stock)) )
outputs: corner_lf, wrap_lf, total_lf, pieces, pieces_by_lf, pieces_by_runs, note
```

**The one non-obvious rule, and why the tile exists.** Bead is not spliced mid-run -- a splice telegraphs
through the mud -- so the stick count must respect one-stick-per-run, not just the LF division. The pinned
example is exactly that case: 9 corners x 8 ft + 2 wrapped openings on 10-ft stock is 116.6 LF with waste,
which divides to 12 sticks -- but the per-run floor says 15 (9 corner sticks + 3 per wrap), and 15 is the
right buy. A pure LF calculator under-buys by 3 sticks on a small job.

## 3. Scope limits

Counting only: metal, vinyl, and paper-faced bead count the same; archway/bullnose per manufacturer. Mud
and tape quantities live in `drywall`; wood casing in `trim-linear-footage`. The finish schedule and crew
stock preference govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the worked example (per-run floor governing),
the LF-governing regime (few tall corners on short stock), additivity, the exact wrap formula, and error
seams. calc-construction.js cap checked post-build (was 95.9%).
