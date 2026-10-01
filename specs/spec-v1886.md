# roughlogic.com Specification v1886 -- Worksite Toilet and Handwash Count (`calc-reliefwater.js`, Group G Cross-Trade Utilities, emergency sanitation, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A recovery site fills with crews faster than it fills with portable toilets, and the count is set by three different federal tables depending on whether the work is construction, general industry, or agriculture. `plumbing-fixture-count` applies the building code's occupant-load table, which does not govern a jobsite.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a worker count below 1, or a non-integer count, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): 29 CFR 1926.51(c) Table D-1 (construction), 29 CFR 1910.141(c)(1) Table J-1 and its footnotes (general industry), and 29 CFR 1928.110(c)(2) (agriculture) -- federal regulation, public domain, reproduced -- named as the rule, OSHA and the state plan named as governing, GOVERNANCE.worker_safety.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`portable toilets per worker`, `osha toilet requirements construction`, `how many porta potties jobsite`, `jobsite sanitation count`, `field sanitation toilets handwashing`.

## 2. The tile

### 2.1 `osha-toilet-count` -- Worksite Toilet and Handwash Count

```
construction     20 or less          1 facility
(1926.51 D-1)    20 or more          1 toilet seat + 1 urinal per 40 workers
                 200 or more         1 toilet seat + 1 urinal per 50 workers
general          1-15: 1   16-35: 2   36-55: 3   56-80: 4   81-110: 5
industry         111-150: 6   over 150: 6 + 1 per additional 40
(1910.141 J-1)   urinals may replace water closets where not used by women,
                 but water closets not below 2/3 of the minimum
agriculture      1 toilet and 1 handwashing facility per 20 employees or
(1928.110)       fraction; within a 1/4-mile walk; not required where field
                 work, including travel, lasts 3 hours or less
```

Three industries, three tables, and they do not agree. A demolition and debris crew is construction; a warehouse
running relief supplies is general industry; a crew clearing an orchard after a storm is agriculture. The tile asks
which, because the same 45 workers need 2 seats and 2 urinals under the construction table, 3 water closets under
the general-industry table, and 3 toilets with 3 handwashing stations under the agricultural one.

The construction table has two quirks that the tile reports rather than smoothing over. Its rows overlap: "20 or
less" and "20 or more" both include exactly 20, and at 20 the per-40 rule gives 1 seat and 1 urinal while the first
row gives 1 facility. And it steps down at 200: 199 workers need 5 seats and 5 urinals at one per 40, but 200 workers
need only 4 and 4 at one per 50. The regulation is written that way; a site right at the line should not read the
drop as permission to remove units.

The general-industry footnote is a floor, not a substitution rate. Urinals may stand in for water closets only where
the facilities will not be used by women, and even then the water closets cannot fall below two-thirds of the
table's minimum. Handwashing is required alongside toilets under all three rules, but only the agricultural rule
states it as a count, so the tile reports a handwash count only there.

**Inputs:** the industry (construction, general industry, agriculture), the number of workers, and for general industry whether the facilities will be used by women

**Outputs:** the toilet seats and urinals or water closets required, the handwashing facilities where the rule counts them, the two-thirds floor where urinals substitute, and any table-boundary note

## 3. Worked example

**A debris-removal contractor with 85 workers on one site (construction):**

```
85 is 20 or more, under 200 -> ceil(85 / 40) = 3 seats + 3 urinals
```

**Three toilet seats and three urinals.** With 199 workers the count would be 5 and 5; with 200 it is ceil(200 / 50)
= 4 and 4, **the step down at the table's 200 line.**

**A relief distribution warehouse with 230 employees (general industry):**

```
over 150 -> 6 + ceil((230 - 150) / 40) = 6 + 2 = 8 water closets
men only -> water closets not below ceil(2/3 x 8) = 6, so 6 water closets + 2 urinals
```

**Eight water closets, or six plus two urinals where the facilities are not used by women.**

**A 45-person crew clearing storm-damaged orchards (agriculture):**

```
ceil(45 / 20) = 3 toilets + 3 handwashing facilities, within a 1/4-mile walk
```

## 4. Scope and non-goals

A minimum-count aid under the federal OSHA sanitation standards. It does not apply the building code's plumbing fixture table (`plumbing-fixture-count`), the camp standard for workers who sleep on site (`responder-camp-sanitation`), or shelter standards for the public (`shelter-capacity-sanitation`). It does not set a service interval for portable units, which the federal standards do not specify, or address the construction exemption for mobile crews with transportation to nearby facilities, state plans that are more stringent, or accessibility requirements for units. It counts minimums; heat, shift overlap, and remote work areas commonly justify more. The cited OSHA standards, the state plan, and the competent person on site govern.
