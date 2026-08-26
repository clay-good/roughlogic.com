# roughlogic.com Specification v1377 -- Minimum Tiedown Count (49 CFR 393.110) (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog checks aggregate working load limit against cargo weight but not the *count* rule, which is the other half of 393.110 and the half that is enforced at the scale. The count is a length rule, the WLL is a weight rule, and either one can govern -- a short heavy article and a long light one fail for opposite reasons.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive article length, weight, or tiedown working load limit, or a tiedown count below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): 49 CFR 393.106 and 393.110 (minimum number of tiedowns and aggregate working load limit), cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `tiedown-count` -- Minimum Tiedown Count (49 CFR 393.110)

```
length <= 5 ft and weight <= 1,100 lb   ->  1 tiedown
length <= 5 ft and weight >  1,100 lb   ->  2 tiedowns
5 ft < length <= 10 ft                  ->  2 tiedowns, any weight
length > 10 ft                          ->  2 + 1 for each additional 10 ft or fraction

aggregate WLL required = 0.5 x cargo weight
```

Two independent rules, and the securement has to satisfy both. The count rule is about the article's *length*:
long cargo needs more attachment points so it cannot rotate or shift within the securement, and the count keeps
climbing every ten feet no matter how light the piece is. The aggregate working load limit rule is about
*weight*: the sum of the tiedowns' working load limits must be at least half the cargo weight, on the reasoning
that a tiedown restrains in more than one direction.

The two rules govern in different situations, which is why the tile reports both and names the controlling one. A
24 ft steel beam is a count problem. A 4 ft granite block is a WLL problem. A crew that has internalized only one
of the two will be wrong about half the time.

**Inputs:** article length (ft), article weight (lb), number of tiedowns planned, working load limit per tiedown
(lb), and whether each tiedown is attached and secured at both ends.

**Outputs:** minimum tiedown count from the length rule, required aggregate WLL, aggregate WLL provided, which
rule governs, and pass or fail against each.

## 3. Worked example

A 24 ft steel beam weighing 12,000 lb, secured with four 3/8 in Grade 70 chains at 6,600 lb WLL each -- but a
tiedown that passes over the load and is secured at both ends counts its full WLL, while one anchored at only one
end counts half. Assume all four are secured at both ends and take a working figure of 5,400 lb:

```
count rule    = 2 + ceil((24 - 10)/10) = 2 + 2 = 4 tiedowns minimum
required WLL  = 0.5 x 12,000           = 6,000 lb
provided WLL  = 4 x 5,400              = 21,600 lb
```

The count rule governs: four tiedowns is exactly the minimum, and the WLL has enormous margin. Drop to three
chains and the WLL is still fine at 16,200 lb but the load is out of service on the count. Reverse it -- a 4 ft,
14,000 lb block -- and the count rule asks for only two tiedowns while the WLL rule needs 7,000 lb aggregate, so
the count is trivially met and the chain rating is what decides.

## 4. Scope and non-goals

The general cargo-securement rules only. Subpart I of Part 393 contains commodity-specific rules -- logs, dressed
lumber, metal coils, paper rolls, concrete pipe, intermodal containers, automobiles, heavy machinery, boulders --
and where a commodity rule applies it *replaces* these general minimums, often with more tiedowns and always with
additional requirements about blocking, chocking, and orientation. The tile does not evaluate whether the article
is blocked against forward movement, whether edge protection is needed, whether the anchor points on the trailer
are rated, or the condition of the tiedowns, all of which are inspected. FMCSA and the roadside inspector govern.
