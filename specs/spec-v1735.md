# roughlogic.com Specification v1735 -- Fixed Ladder Rest Platform and Climb System Spacing (`calc-cross.js`, Group G Cross-Trade Utilities, industrial hygiene, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; industrial hygiene and safety), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Fixed ladders above a certain height need fall protection and, on long climbs, rest platforms -- and the rules changed recently enough that many existing ladders are non-compliant. The spacing is a division and the compliance dates are the part people miss.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive ladder height or platform spacing, or a spacing exceeding the applicable maximum returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the OSHA 29 CFR 1910 Subpart D fixed ladder requirements by name with the applicable compliance dates named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`fixed ladder fall protection`, `ladder cage no longer compliant`, `rest platform spacing ladder`, `ladder safety system retrofit`, `24 foot fixed ladder rule`.

## 2. The tile

### 2.1 `fixed-ladder-rest-platform` -- Fixed Ladder Rest Platform and Climb System Spacing

```
fall protection    required above 24 ft; a personal fall arrest system or a ladder
                   safety system on new ladders
cages              no longer accepted as fall protection on new fixed ladders, and
                   being phased out on existing ones
existing ladders   had to have a cage, well, or a fall protection system; by the
                   phase-out date all must have a personal fall arrest or ladder safety system
rest platforms     required at intervals on long climbs where a cage or well is used
                   under the older provisions
landing platforms  offset sections and platforms break up long climbs
pitch              fixed ladders are near vertical; the rungs, spacing, and clearances
                   are all specified
```

The rule change is the practical finding and it catches facilities with older infrastructure. Cages were
accepted for decades as fall protection on fixed ladders and are not accepted on new ones, because they do not
arrest a fall -- they may guide a falling worker but they do not stop them, and the injury data supports the
change. Existing caged ladders are subject to a phase-out, and a facility that has not surveyed its fixed ladders
against the current requirement is likely to have several that are out of compliance.

The 24 ft threshold is where fall protection becomes required, and above it the question is which system: a
personal fall arrest system requires an anchorage the ladder can support and a worker trained and equipped for it,
while a ladder safety system -- a rail or cable with a travelling attachment -- is a permanent installation that
does not depend on the worker bringing anything. Retrofitting the latter to an existing ladder is the common
remedy.

Rest and landing platforms serve a different purpose from fall protection: they break up a long climb so a worker
can rest, and they limit the fall distance in the older cage-based arrangements. On a very tall ladder the
climb itself is a physiological problem, and a worker who arrives at the top exhausted is at risk from that alone.

The dimensional requirements -- rung spacing, clearances behind and beside the ladder, extension above the
landing, and the pitch -- are specified and are checked at the same time.

**Inputs:** the total climb height, the existing fall protection arrangement, the installation date, the platform locations, the rung spacing and clearances, and the applicable compliance dates

**Outputs:** whether fall protection is required at the entered height, the platform count and spacing required under the applicable provision, the existing arrangement against the current requirement, the compliance status and the applicable phase-out date, and the dimensional checks against the standard

## 3. Worked example

A 48 ft fixed ladder with a cage, installed in the 1990s.

```
height 48 ft  -> above the 24 ft threshold, so fall protection is required
existing: a cage
```

**A cage is not fall protection under the current rule.** It was accepted historically and it is not accepted on
new ladders, because it does not arrest a fall -- and existing caged ladders are subject to a phase-out after
which a personal fall arrest system or a ladder safety system is required.

So this ladder needs a retrofit: a ladder safety system (a rail or cable with a travelling attachment) or a
personal fall arrest arrangement with adequate anchorage. The cage may remain, but it does not satisfy the
requirement.

**Rest platforms** under the older cage-based provisions were required at intervals on long climbs. At
48 ft this ladder would need them, and their presence or absence is part of the survey.

**The finding that matters at a facility level**: a plant with older fixed ladders almost certainly has several
in this condition, and they are non-compliant now rather than at some future date once the phase-out has passed.
A ladder survey against the current requirement -- height, existing protection, installation date, dimensional
compliance -- is the action, and it usually turns up more than expected.

The dimensional checks run alongside: rung spacing, clearance behind the ladder, clearance at the sides,
extension above the landing, and the arrangement at the top where a worker steps off, which is where a
disproportionate share of fixed ladder injuries occur.

## 4. Scope and non-goals

A screening comparison against requirements the user supplies. The fall protection requirements for fixed
ladders, the height thresholds, the acceptability of cages and wells, the compliance and phase-out dates, and
the rest and landing platform provisions are set by 29 CFR 1910 Subpart D and have changed; the current text and
the applicable dates govern, and this tile does not reproduce them. It does not design a fall protection system,
evaluate anchorage adequacy, or address the ladder's structural condition, which on older installations is
frequently the more urgent finding. It does not address the rescue plan that a personal fall arrest system
requires, or the training, inspection, and equipment requirements that accompany either system. It does not
address ladders in confined spaces, on towers, or those covered by other standards. 29 CFR 1910 Subpart D, the
ladder safety system manufacturer's instructions, and a qualified person govern.
