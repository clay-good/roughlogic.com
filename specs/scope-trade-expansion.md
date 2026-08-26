# Scope: The 2026-08-26 Trade Expansion (specs v1350-v1449, 100 New Tiles)

> **Status: PROPOSED (2026-08-26). Program charter, no catalog change of its own.**
> Inherits the spec-v106 trades-only charter and every convention through spec-v1349.
> Each of the 100 tiles is specified in its own file, `spec-v1350.md` through `spec-v1449.md`.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Why this program exists

The catalog stands at 1,708 tiles. Earlier expansion work concluded the catalog was saturated,
but that conclusion was drawn from three narrow search methods -- self-declared sibling gaps,
inverse-of-a-forward-tile, and family completion -- run mostly against the dense construction,
electrical, and mechanical groups. A group-by-group census tells a different story.

| Group | Tiles today | Read |
| --- | --- | --- |
| E Carpentry / Construction | 466 | dense, genuinely near-saturated |
| A Electrical | 206 | dense |
| C HVAC | 154 | dense |
| B Plumbing / Gas | 141 | dense |
| K Mechanic | 135 | dense |
| G Cross-Trade | 93 | moderate |
| L Agriculture | 72 | moderate |
| M Water / Wastewater | 66 | moderate |
| D Restoration | 51 | thin |
| F Fire-Ground | 50 | **thin** |
| R Accounting | 31 | thin |
| J Trucking | 30 | **thin** |
| P Field / Survey / SAR | 28 | **thin** |
| N Stage / Live Production | 27 | **thin** |
| T Laboratory | 27 | thin |
| O Kitchen / Food Service | 19 | **thinnest** |

Saturation was measured where the digging had already happened. The thin groups -- and the
specialty trades that no group has yet claimed (elevator, glazing, door hardware, sign,
industrial finishing, dust collection) -- were never swept. This program sweeps them.

## 2. The entry test each tile had to pass

Every one of the 100 was checked against the live `TOOLS` registry by keyword before it earned
a spec number. A candidate was cut when an existing tile serves the same user need, even under
a different name. Cut this way, among others: reefer pre-cool (`Product Pull-Down Time` already
answers it), point-to-point short circuit (`Short-Circuit Current at Panel`), countersink depth,
keyseat size, weld heat input, line-set charge adder, dryer exhaust developed length, duct
leakage CFM25, step-and-touch voltage, conductor thermal withstand, motor starting voltage dip,
cable tray fill, abrasive blast consumption, and engine displacement.

That first screen was keyword-based and it was not good enough. A second pass -- token-overlap
scoring of every proposed tile's id and name against every one of the 1,708 catalog rows, then
reading the description of each close match -- found **nine duplicates the keyword sweep had
missed**. A keyword probe does not match across hyphenation ("arc flash" against "Arc-Flash"), and
reading only the top two hits of a long list hides the third. All nine were cut:

| Cut | Already in the catalog as |
| --- | --- |
| chip load and feed rate | `radial-chip-thinning` |
| reaming stock allowance | `reaming-drill-allowance` |
| press-fit interference | `press-fit-pressure` |
| press brake tonnage | `press-brake-tonnage` (the same id) |
| shielding gas consumption | `shielding-gas-runtime` |
| filler metal per joint | `weld-metal-volume` |
| compressor capacity derate | `compressor-volumetric-efficiency` |
| arc-flash incident energy | `arc-flash-screen` |
| freestanding sign wind | `wind-solid-sign` |

Their spec numbers were reused for nine verified-new tiles: band saw blade pitch, tube bend wall
thinning, ISO 1940 balance grade, bearing regrease interval, hydraulic reservoir and cooler duty,
curtain wall mullion deflection, refrigerant leak rate against the EPA threshold, IEEE 80 ground
grid conductor sizing, and attached canopy uplift.

Adjacent math is **not** a duplicate. A tile is a duplicate only when it answers the same field
question. That is why the ground-grid conductor tile earns a spec alongside three existing IEEE 80
tiles, and why the curtain wall mullion tile earns one even though the catalog carries a general
required-moment-of-inertia tile: one is an engineer sizing a beam, the other is a glazier against an
AAMA limit. Where two tiles sit close, the new spec names the existing one and says what it adds.

## 3. What is in scope, and the lines that hold

The v106 boundary is unchanged and every tile in this program sits inside it:

- Public physics and published formulas only. Plank's equation, Faraday's law, the capstan
  equation, the ANSI E1.21 wind-pressure form, IEEE 1584's incident-energy model.
- Code sections are **cited by number and edition and linked**, never mirrored. No tile in this
  program reproduces an NFPA, ICC, ASHRAE, or ASTM table.
- Every tile is a check, never a stamp. The arc-flash, glass-thickness, stairwell-pressurization,
  and sign-wind tiles say so in their own words, because those four are the ones a reader is most
  likely to mistake for an engineered result.
- Three candidates were rejected on the honesty boundary rather than on duplication: a
  hazardous-materials exposure-limit lookup, a food-allergen substitution table, and a
  fall-protection rescue-time calculator. All three would have been read as the authority.

## 4. The 100, by band

| Specs | Band | Group | Module |
| --- | --- | --- | --- |
| v1350-v1363 | Kitchen and food service | O | `calc-kitchen.js` |
| v1364-v1376 | Stage and live production | N | `calc-stage.js` |
| v1377-v1385 | Trucking and logistics | J | `calc-trucking.js` |
| v1386-v1393 | Fire-ground and fire protection | F | `calc-fire.js`, `calc-firesprinkler.js` |
| v1394-v1401 | Field, survey, and SAR | P | `calc-field.js`, `calc-survey.js` |
| v1402-v1405 | Machining and fabrication | E | `calc-machining.js`, `calc-fab.js` |
| v1406-v1409 | Rotating equipment and hydraulics | G | `calc-shop.js` |
| v1410, v1412 | Welding | E | `calc-fab.js` |
| v1411 | Curtain wall | E | `calc-construction.js` |
| v1413-v1419 | HVAC and refrigeration service | C | `calc-refrigerant.js`, `calc-hvacservice.js` |
| v1420-v1424 | Electrical power system | A | `calc-elecdesign.js` |
| v1425-v1434 | Specialty trades | E / G / K | `calc-construction.js`, `calc-shop.js`, `calc-mechanic.js` |
| v1435-v1444 | Industrial and finishing | G | `calc-shop.js` |
| v1445-v1446 | Restoration | D | `calc-restoration.js` |
| v1447-v1449 | Finish trades | E | `calc-finish.js` |

The bands drifted from their original plan when the second duplicate audit forced nine
replacements; this table is the actual assignment, not the intended one.

## 5. Conventions every tile in the program inherits

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer sign-off apply
unchanged. The v18/v21 error contract applies: a non-positive dimension, a zero denominator, a
temperature difference of the wrong sign, or a fraction outside 0-1 returns `{ error }`, and no
numeric field is ever `Infinity` or `NaN`. Citation discipline (v19/v22) applies: every tile names
its method and its governing authority by name.

Each spec carries a worked example whose arithmetic was computed and checked before the spec was
written, so the fixture that lands with the tile has a verified target.

## 6. Landing order

The bands are independent and can land in any order. Within a band, specs are ordered so that a
tile never depends on one specified later. Nothing in this program changes an existing tile,
renames an id, or moves a tile between groups.

### Landed so far

| Band | Specs | Status |
| --- | --- | --- |
| Kitchen and food service (Group O) | v1350-v1363 | **landed 2026-08-26**, 14 tiles; catalog 1,709 -> 1,723 |
| Stage and live production (Group N) | v1364-v1376 | **landed 2026-08-26**, 13 tiles; catalog 1,723 -> 1,736 |
| Every other band | v1377-v1449 | not yet built |
