# roughlogic.com Specification v1450 -- Ruling (Equivalent) Span for a Line Section (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A line section between deadends is strung to ONE tension, but its spans are not equal. The ruling span is the single equivalent span whose sag-tension behaviour the whole section follows, and every stringing chart, sag table, and temperature correction in line work is entered with it. Without it a crew sags to the wrong number in every span but one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a span count below one, any non-positive span length, or a ruling span that does not exceed zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ruling-span relation and the square-law sag distribution as standard overhead line practice, `GOVERNANCE.general`.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`ruling span`, `equivalent span`, `line section sag`, `cube weighted span`, `stringing chart span`.

## 2. The tile

### 2.1 `ruling-span` -- Ruling (Equivalent) Span for a Line Section

```
ruling span  RS = sqrt( sum(L_i^3) / sum(L_i) )
sag in span i     = sag_RS x (L_i / RS)^2
approximate check RS ~ L_avg + (2/3)(L_max - L_avg)
```

The ruling span is not the average span and it is not the longest span. It is a cube-weighted mean, which
means the long spans dominate it: a section of four spans where one is nearly twice the others lands a ruling
span well above the arithmetic average, because the long span governs how the whole section moves when the
conductor heats up.

Two consequences a crew acts on. First, the stringing chart is entered at the ruling span, not at the span in
front of the truck. Second, once the section is sagged, the sag in any individual span scales as the SQUARE of
its own length over the ruling span, so a 300 ft span in a 436 ft ruling section sags less than half what the
ruling span does. Sagging every span to the ruling-span sag is a classic and expensive error: the short spans
end up badly overtensioned and the long ones end up in the road.

The field approximation `L_avg + (2/3)(L_max - L_avg)` is carried here alongside the exact value because it is
what gets used on a tailboard, and seeing the two side by side shows when it is good enough. It is close when
the spans are similar and drifts when one span dominates.

**Inputs:** a list of span lengths in the section (feet), and optionally a reference sag at the ruling span to distribute back to each span

**Outputs:** the ruling span, the arithmetic average span, the field approximation, the ratio of ruling to average, and (when a reference sag is given) the sag in each individual span

## 3. Worked example

A four-span deadend-to-deadend section of 300 ft, 450 ft, 380 ft, 520 ft:

```
sum L^3 = 27,000,000+91,125,000+54,872,000+140,608,000 = 313,605,000 ft^3
sum L   = 1,650 ft
RS      = sqrt(313,605,000 / 1,650) = sqrt(190,063.6) = 435.96 ft
L_avg   = 412.5 ft
field approximation = 412.5 + (2/3)(520 - 412.5) = 484.2 ft
```

The ruling span is 435.96 ft against a 412.5 ft average -- 23.5 ft higher, pulled up by the 520 ft span. The
tailboard approximation lands at 484.2 ft, 48.2 ft off, which for stringing purposes is close.

Now distribute a sag. If the section is sagged to 12.0 ft at the ruling span, the individual spans are:

```
300 ft span: 12.0 x (300/435.96)^2 =  5.68 ft
450 ft span: 12.0 x (450/435.96)^2 = 12.79 ft
380 ft span: 12.0 x (380/435.96)^2 =  9.12 ft
520 ft span: 12.0 x (520/435.96)^2 = 17.07 ft
```

The 300 ft span sags 5.68 ft and the 520 ft span sags 17.07 ft -- a factor of 3.0 between them, for the same
conductor at the same tension on the same day. Pulling all four to 12 ft would leave the short span at roughly
25 ft of equivalent ruling sag, which is to say massively overtensioned.

## 4. Scope and non-goals

One line section between deadends, one conductor, level or nearly level supports. It does not size the
conductor, choose a stringing tension, or produce a sag-tension chart across temperature -- `conductor-sag-at-temperature`
does the temperature move once a ruling span and an initial condition are known. Steeply inclined spans, where the
inclination factor matters, are outside the parabolic treatment here. Sections with a long span adjacent to a very
short one may not behave as a single ruling span at all, because the suspension insulators cannot swing enough to
equalize tension; that is a design judgment and this tile does not make it. The line design, the sag-tension run
from the conductor manufacturer's data, and the utility's construction standard govern.
