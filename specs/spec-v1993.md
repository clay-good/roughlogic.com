# roughlogic.com Specification v1993 -- Accessibility Module Split

> **Status: LANDED -- 2026-10-20.** Move the spec-v1159 through spec-v1183
> accessibility and floodplain band from `calc-construction.js` to a dedicated
> lazy-loaded `calc-accessibility.js` module. This is structural hardening:
> calculator IDs, formulas, fields, outputs, citations, examples, and Group E
> assignments remain unchanged.

## Why

`calc-construction.js` sat at 331,450 B gz against its 335,000 B cap (98.9%).
CI builds measure about 0.2% larger than a local build, so a few more lines
in any construction tile would have turned the integration job red. Its cap
ledger has asked for a split rather than another raise since 2026-07-27.

## Scope

Move the contiguous band of 20 calculators: accessible-parking-count,
sign-character-height, reach-range, protruding-object-check,
accessible-route-width, door-clear-width, floor-level-change,
turning-clear-floor-space, handrail-geometry, knee-toe-clearance,
flood-opening-area, ada-stair-check, tactile-sign-mounting,
drinking-fountain-check, accessible-shower-check,
substantial-improvement-check, accessible-parking-geometry,
water-closet-location, lavatory-tub-clearance, ramp-detail-check.

The band reads nothing else in `calc-construction.js` except the module-local
`_finiteGuard` and `_simpleRenderer`, which the new module carries as copies,
and nothing left behind reads the band. `ada-ramp-slope` (spec-v474) is not in
the contiguous band and stays.

## Result

| Module | Before (B gz) | After (B gz) | Cap |
| --- | --- | --- | --- |
| `calc-construction.js` | 331,450 | 272,830 | 335,000 -> 305,000 |
| `calc-accessibility.js` | -- | 60,788 | 70,000 |

Renderers 244 -> 224 + 20, exports 546 -> 506 + 40: nothing dropped or
duplicated.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry name (`ACCESSIBILITY_RENDERERS`).
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-construction.js` is under a reduced cap; the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass, and the moved tiles
   mount in the browser.
