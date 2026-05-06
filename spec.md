# roughlogic.com Specification

A complete, step-by-step build specification for roughlogic.com, a 100 percent client-side public utility for the trades. This document is the single source of truth for the project. It contains the product definition, architecture, security posture, build instructions, Claude Code prompts for each step, and the README format. No code appears in this document. All code is to be produced by Claude Code following the prompts in section 14.

Repository: github.com/clay-good/roughlogic.com

Domain: roughlogic.com

License: MIT

## 1. Product Definition

roughlogic.com is a single-page static web application that helps electricians, plumbers, HVAC technicians, water damage and mold restoration techs, carpenters, general contractors, and fire-ground engineers do the math they actually do during a workday. It does this entirely in the browser using bundled physical constants, public reference data, and original plain-English summaries. There is no server, no account, no analytics, no telemetry, no AI inference, no API key, and no ongoing operating cost beyond domain renewal.

The product follows the encryptalotta.com and sophiewell.com architectural pattern. A single index.html, vendored data, and a Content Security Policy that forbids outbound network connections except to the same origin. The user can save the page and use it offline forever.

The product is light theme, monochrome, responsive, accessible, and free of decorative graphics. No emojis. No em-dashes. No icons that imply meaning beyond plain typographic glyphs. The design is slightly higher contrast than sophiewell because the site will be used in bright outdoor light and on phones with screen-protector glare.

The footer reads "Made with love by Clay Good" and "View source on GitHub" linking to the public repository.

## 2. Audience and Positioning

The site serves six trade audiences, all of whom are field workers who currently do quick calculations multiple times per day. Each utility tile is tagged with the trade or trades it serves, and the home view default shows all tiles with a filter bar to narrow.

The six audiences are: Electrical (licensed electricians, apprentices, control technicians, low-voltage installers), Plumbing (licensed plumbers, pipe fitters, gas fitters, irrigation), HVAC (HVAC technicians, refrigeration techs, building controls), Restoration (water damage, mold remediation, fire damage, biohazard cleanup), Carpentry and Construction (framers, finish carpenters, general contractors, deck builders, roofers), and Fire-Ground Engineering (firefighters and fire officers performing the physical and hydraulic calculations of fireground operations, distinct from the medical-response work that lives on sophiewell).

The product position is the same as sophiewell, applied to a different vocabulary: a calm, fast, ad-free, account-free, ever-free reference. The Unix philosophy applied to trade-specific math. Each tool does one thing. The home page is scannable in five seconds.

The voice is plainspoken. No marketing language, no exclamations, no "amazing" or "powerful" or "professional grade." Field workers can spot bullshit instantly and a single overpromise destroys the trust the site is trying to build.

## 3. Scope and Non-Scope

### In Scope

The application provides a curated set of deterministic utilities organized into seven groups. Each utility is independent, runs entirely in the browser, and operates on either user-supplied input or bundled reference data.

Group A: Electrical
1. Ohm's Law Calculator (V, I, R, P, any two known)
2. Wire Ampacity Lookup (by gauge, conductor material, insulation temperature rating, ambient correction)
3. Voltage Drop Calculator (single-phase and three-phase)
4. Conduit Fill Calculator (by conduit type and conductor count)
5. Box Fill Calculator (by box volume and conductor count)
6. Circuit Breaker Sizing Calculator (continuous load 125 percent rule)
7. Motor Full Load Amps Reference (by horsepower, voltage, phase)
8. Transformer Sizing Calculator (kVA from load)
9. Three-Phase Power Calculator (kW, kVA, power factor)
10. Resistance of Copper and Aluminum at Temperature (first-principles)
11. Equipment Grounding Conductor Sizing Reference

Group B: Plumbing and Gas
12. Pipe Sizing Calculator (water supply by fixture units, drainage by DFU)
13. Friction Loss Calculator (Hazen-Williams for water, Darcy-Weisbach for gas)
14. Pipe Volume Calculator (gallons per foot by diameter)
15. Pump Sizing Calculator (head and flow requirements)
16. Static Pressure Loss in Piping
17. Gas Pipe Sizing Reference (BTU capacity by pipe size, length, gas type)
18. Slope Calculator for Drainage (1/4 inch per foot rule and variants)
19. Pressure Conversion (PSI, head feet, inches of water column)
20. Backflow and Cross-Connection Reference

Group C: HVAC
21. Manual J Cooling Load Estimator (simplified, not full Manual J)
22. Manual J Heating Load Estimator (simplified)
23. Duct Sizing Calculator (by CFM and friction rate)
24. Static Pressure Calculator
25. Refrigerant P-T Chart (R-410A, R-32, R-22 legacy, R-134a, R-404A, R-407C)
26. Superheat and Subcool Calculator
27. SEER and EER Conversion
28. Heat Pump Balance Point Calculator
29. Sensible Heat Ratio Calculator
30. CFM per Ton Reference
31. Combustion Air Calculator

Group D: Water Damage and Mold Restoration
32. Psychrometric Calculator (relative humidity, dew point, GPP from temp and RH)
33. Drying Goal Calculator (target GPP based on outdoor conditions)
34. Dehumidifier Sizing (AHAM and field methods)
35. Air Mover Placement Reference (CFM coverage by class)
36. Class and Category of Water Loss Reference
37. Material Drying Times Reference
38. Mold Growth Conditions Reference (temp, RH, time thresholds)
39. PPE Selection Reference (by category and contamination type)

Group E: Carpentry and Construction
40. Stair Calculator (rise, run, total rise, number of treads)
41. Roof Pitch Calculator (rise over run, degrees, percent)
42. Rafter Length Calculator
43. Square Footage Calculator (rectangle, triangle, trapezoid, circle)
44. Lumber Board Footage Calculator
45. Concrete Volume Calculator (slab, footing, column, footing-with-stem)
46. Rebar Spacing and Quantity Calculator
47. Span Tables for Common Lumber (reference, with citation)
48. Nail and Screw Pull-Out Reference
49. Beam Loading Calculator (simple span, simply supported, point and uniform loads)
50. Material Quantity Estimator (for common assemblies)

Group F: Fire-Ground Engineering
51. Friction Loss Calculator (fire hose by diameter, length, GPM)
52. Pump Discharge Pressure Calculator
53. Hydrant Flow Calculator (Pitot gauge to GPM)
54. Required Fire Flow Estimator (by structure square footage, ISO method)
55. Master Stream Reach Calculator
56. Aerial Ladder Reach Calculator (geometry by angle and extension)
57. Foam Concentrate Calculator (Class A and Class B percentages)
58. Smoke Reading Reference (volume, velocity, density, color)

Group G: Cross-Trade Utilities
59. Unit Converter (length, area, volume, mass, force, pressure, temperature, energy, power, flow, electrical)
60. Material Cost Estimator (input price per unit and quantity, returns total)
61. Markup and Margin Calculator
62. Time and Materials Estimator (with labor rate and hours)
63. Sales Tax Calculator (by state)
64. Tip Out Calculator (for crews)

### Out of Scope

The site does not reproduce any code, standard, or licensed publication. The site does not interpret code requirements; it provides math and reference data. The site does not generate code-compliant designs. The site does not give safety advice beyond what is published as fact. The site does not handle anything that varies by jurisdiction in a way that resists deterministic treatment without context the site does not have (for example, the site does not tell a user whether a specific installation passes inspection in their jurisdiction).

The site does not include a HazMat reference. That belongs on a future hazardous-materials reference site or on sophiewell as a field-medicine extension. The fire-ground engineering content here is the physical and hydraulic side of fire response only.

## 4. Design Principles

The product adheres to the same seven principles as sophiewell, applied to this domain.

The first principle is honesty. Every value, formula, and reference table must be traceable to either a published physical principle, a public-domain standard, an original plain-English summary written by the project author, or a manufacturer-published technical specification that is unrestricted. The source and version of every data element is visible to the user.

The second principle is zero trust of the network. CSP `connect-src 'self'`. No analytics. No fonts CDN. No script CDN. No telemetry.

The third principle is zero dependencies at runtime. Plain HTML, CSS, vanilla JavaScript. Build pipeline may use minimal Node tooling.

The fourth principle is offline by default. After first load, the site works without network access.

The fifth principle is monochrome and minimal. Light theme only. Grayscale palette identical to sophiewell, with a slightly darker primary text for outdoor readability (#0A0A0A instead of #111111). System fonts only.

The sixth principle is accessibility. WCAG 2.2 Level AA. Full keyboard operability. Touch targets at least 44 by 44 pixels because the site will be used on phones with gloved hands. Voice input compatibility (the site does not block dictation; numeric inputs accept dictation cleanly).

The seventh principle is durability. One HTML file, one CSS file, one JS file or vanilla ES modules, and a data folder. No build dependencies that go stale.

## 5. Legal and Data Sourcing Posture

This section is non-negotiable. Every dataset and every reference must satisfy one of the following: it is public domain, it is a mathematical or physical fact (not copyrightable), it is published by a United States government agency without copyright restriction, or it is licensed under terms permitting redistribution in an MIT open-source project.

The site does not bundle or reproduce any of the following copyrighted publications: NEC (NFPA 70), IPC (International Plumbing Code), UPC (Uniform Plumbing Code), IRC (International Residential Code), IECC, IFC, IBC, ASHRAE Fundamentals, ACCA Manual J, ACCA Manual D, ACCA Manual S, NFPA standards beyond what is publicly summarized, or any commercial code body's published code text.

The path that works for everything in this site is the same one that works for sophiewell. The numeric facts (resistance of copper at temperature, water density, refrigerant pressure-temperature relationships, friction coefficients, gas constants) are physical and not copyrightable. Calculations performed using these facts produce the same numbers as the licensed code tables, but they are computed from first principles in your own implementation, with citations to the underlying physics rather than to the code. The plain-English narrative explaining what each calculator does is original work by the project author.

The following sources are confirmed safe.

Physical constants and material properties: density, specific heat, thermal conductivity, electrical resistivity, viscosity, and similar values for common materials. These are published in physics and engineering reference works and are facts, not copyrighted expression.

Wire ampacity from physics: the temperature rise of a conductor at a given current depends on the conductor's resistance, the heat capacity, and the heat dissipation to the surrounding insulation and air. Computing ampacity from these inputs and from the insulation's published temperature rating produces the same answers as the NEC tables for the same inputs. Cite the underlying physics and the insulation temperature rating, not the NEC table.

Hazen-Williams equation for friction loss in water pipes. Published 1905. Public domain.

Darcy-Weisbach equation for friction loss. Public physical principle.

Manning's equation for open-channel flow. Public.

Ohm's law and Kirchhoff's laws. Public.

Power equations for single-phase, three-phase, and DC circuits. Public.

Refrigerant pressure-temperature relationships. Published by manufacturers (DuPont, Honeywell, others) in technical bulletins. The values are physical facts. Bundle a curated table of common refrigerants and cite the publishing manufacturer.

Stair geometry, roof pitch math, basic structural span tables (where the underlying math is structural mechanics applied to lumber properties published by the AWC Wood Design Manual or by lumber grading agencies). Span tables are tricky: the AWC tables are licensed by the American Wood Council, but the underlying mechanics (deflection limit, fiber stress, modulus of elasticity) plus published lumber properties produce the same results. Cite the mechanics and the species properties, not the table.

ISO standard fire flow estimation methods. The ISO Public Protection Classification methodology has public-domain components published in NFPA and ISO documents that are available without licensing for the basic formulas. Verify each formula's licensing before bundling; when in doubt, derive the calculation from first principles plus a published structural-fire-load reference.

Fire hose friction loss formulas. The standard fireground formula (CQ^2L) and its coefficients per hose diameter are published in firefighter training materials by the National Fire Academy, which is a public-domain U.S. government source.

US government publications: NIST physical constants, NOAA climate data (for HVAC heating and cooling design temperatures by location), USGS soil data (for foundation calculations), Census Bureau (for demographic context where relevant), DOT engineering standards. All public.

Manufacturer technical data: motor full-load amps, transformer ratings, common lumber dimensions and properties, refrigerant specifications. These are published by manufacturers in technical bulletins and product catalogs. Bundle the values with proper attribution; do not bundle marketing material.

Original plain-English summaries: the project author writes original short summaries for each calculator describing what it does, what inputs it requires, and what the result means. These are MIT-licensed creative work belonging to the project. They are written without reference to copyrighted code text.

The following items require care.

Lumber span tables. The AWC and various lumber grading agencies publish tables that are widely reproduced but technically licensed. Implement span calculations from first principles using the underlying structural mechanics and published material properties (allowable bending stress, modulus of elasticity for each species and grade), with citations to the mechanics. The result is your own implementation that produces the same answers, not a reproduction of the published table.

Manual J cooling and heating load methodology. ACCA holds copyright on the published Manual J. The underlying methodology (sensible heat gain from solar, conductive, latent loads) is engineering practice. Implement a simplified load estimator from the underlying engineering principles, with the inline note that the result is a simplified estimate not a Manual J load and that a code-compliant load calculation requires Manual J. Cite ASHRAE Fundamentals (which has its own licensing) by reference but do not reproduce its tables; use NIST and NOAA data for the climate inputs.

NFPA standards. Public summaries exist for many standards but the standards themselves are licensed. Reference NFPA standards by number where appropriate ("see NFPA 13 for sprinkler design") without reproducing their text.

Manufacturer-specific product data. Use cautiously and only when the manufacturer's technical bulletin permits redistribution. A motor full-load amps table compiled from manufacturer data is generally fine if attributed; a reproduction of a specific manufacturer's catalog page is not.

A LEGAL.md file in the docs folder documents this posture in detail and is updated whenever a new dataset is added. A separate docs/derivations.md file documents how each first-principles calculation was derived, so that any user, reviewer, or attorney can verify that the implementation is original work computing from physics rather than reproduction of a licensed table.

## 6. Architecture

Structurally identical to sophiewell.com. A single static page with all logic embedded or loaded as same-origin sibling files.

### File Layout

```
roughlogic.com/
  index.html
  styles.css
  app.js
  sw.js
  data/
    electrical/
      manifest.json
      ampacity-physics.json
      motor-fla.json
      conductor-properties.json
      conduit-fill-tables.json
    plumbing/
      manifest.json
      pipe-properties.json
      fixture-units.json
      gas-pipe-capacity.json
    hvac/
      manifest.json
      refrigerants.json
      duct-friction.json
      climate-data.json (NOAA per-location heating and cooling design temps)
    restoration/
      manifest.json
      psychrometrics.json
      water-classes.json
      drying-times.json
      mold-conditions.json
    construction/
      manifest.json
      lumber-properties.json
      concrete-mixes.json
      span-derivations.json (first-principles outputs, not reproduced tables)
    fire/
      manifest.json
      hose-friction.json (from NFA training)
      fire-flow-formulas.json
    physical-constants/
      constants.json (NIST values)
      material-properties.json
    crosswalks/
      unit-conversions.json
      state-tax-rates.json (revenue department published rates)
    summaries/
      manifest.json
      summaries.json (original plain-English summaries by utility)
  _headers
  robots.txt
  sitemap.xml
  favicon.ico
  apple-touch-icon.png
  site.webmanifest
  scripts/
    build-data.mjs
    verify-integrity.mjs
    expected-hashes.json
    sources.md
    derivations.md (how each first-principles calc was derived)
  test/
    unit/
    integration/
    fixtures/
  docs/
    architecture.md
    data-sources.md
    legal.md
    derivations.md
    accessibility.md
    threat-model.md
  .github/
    workflows/
      ci.yml
      data-refresh.yml
  README.md
  spec.md
  package.json
  .nvmrc
  .gitignore
  CHANGELOG.md
```

### Runtime Architecture

The user navigates to roughlogic.com. The browser receives index.html, styles.css, and app.js. The application boots, registers a service worker for offline use, and renders the home view with a tile grid. The tile grid filters by trade audience tag (All, Electrical, Plumbing, HVAC, Restoration, Carpentry and Construction, Fire-Ground) and by group (A through G). A search box at the top of the page searches all tile names and descriptions.

Selecting a tile loads only the data shards relevant to that utility. No data is loaded eagerly. Largest shard kept under one megabyte after gzip.

Most computation runs in the main thread. The Manual J load estimators (utilities 21, 22) and the duct sizing calculator (utility 23) run inside a Web Worker so the UI remains responsive on multi-zone inputs.

The service worker caches the application shell on first load. Data shards are cached on first access. Cache version is keyed to the build hash.

### Data Pipeline (Build Time Only)

scripts/build-data.mjs runs in CI on a schedule. It downloads canonical public files (NOAA climate data, NIST physical constants), parses them, produces sharded JSON in data/, writes per-dataset manifests with version and integrity hashes, and commits the result via a pull request. The build script never runs in production.

Most of roughlogic's data is static and will rarely change (physical constants do not change; lumber properties update slowly; refrigerant data is stable). The data refresh job runs monthly rather than weekly to reflect this lower cadence.

### Threat Model Summary

Same threat model as sophiewell.com. Cross-site scripting from user-pasted text mitigated by treating all input as text only. Supply chain attacks mitigated by vendoring all data and zero runtime dependencies. Network exfiltration mitigated by `connect-src 'self'`. Stale data mitigated by visible version stamps and the monthly data refresh.

A specific threat for roughlogic that does not apply to sophiewell: misuse as a code-compliance authority. A user who treats the calculator's output as code-compliant and skips the inspector's review could create a real safety issue. Mitigated by per-utility notices that the calculator is a math aid and that the authority having jurisdiction governs all installations and inspections.

## 7. Security Posture

Same controls as sophiewell.com section 7.

CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'`.

Strict-Transport-Security with one-year max-age and preload.

X-Content-Type-Options nosniff. X-Frame-Options DENY. Referrer-Policy no-referrer. Cross-Origin-Opener-Policy same-origin. Cross-Origin-Embedder-Policy require-corp. Cross-Origin-Resource-Policy same-origin. Permissions-Policy disabling camera, microphone, geolocation, payment, USB, and accelerometer.

innerHTML is forbidden in the codebase, enforced by ESLint and CI grep.

No sessionStorage, cookies, or IndexedDB. localStorage is used by `theme.js` for one key (`rl-theme`, value `"light"` or `"dark"`) so the chosen theme survives reloads without a flash of the wrong palette; no calculator inputs, pinned set, recents ring, or bundle data is written there. The service worker cache holds only same-origin static shell files and bundled data shards.

A startup integrity check verifies the SHA-256 hash of each data manifest matches the hash recorded in `data/integrity.json` (a build-time sidecar produced by `scripts/build-data.mjs`).

## 8. Visual Design

Light monochrome theme with slightly higher contrast than sophiewell to support outdoor use. Pure white #FFFFFF background. Near-black #0A0A0A primary text (slightly darker than sophiewell). Mid-gray #4A4A4A secondary text (slightly darker for contrast in bright light). Light gray #DDDDDD borders. Very light gray #F5F5F5 disabled states. No color other than grayscale.

Typography: system stack only. `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Monospace `ui-monospace, "SF Mono", Menlo, Consolas, monospace`. No web fonts.

Slightly larger default body text than sophiewell (17px instead of 16px) because the site will be used at arm's length on a phone in awkward positions. Touch targets at least 48 by 48 pixels (slightly larger than the WCAG minimum of 44) for gloved-hand operation.

Layout: single column on mobile, two columns on tablet, three columns on desktop. Maximum content width 960 pixels.

No emojis, no em-dashes, anywhere in the application or its source code.

Header: wordmark "roughlogic" in lowercase with slightly heavier weight than the body text. Tagline "field math for the trades." Navigation row with a single "Tools" link to scroll to the tile grid.

Footer: "Made with love by Clay Good" line; "View source on GitHub" link to the repository; data version line.

Each tile: bordered card with utility name as heading, one-sentence description, trade tag pills, and "Open tool" link.

Each utility view: "Back to tools" link, h1 with utility name, one-paragraph description, the section 9 inline notice, the inline citation per spec section 11, the input region, the output region, the data sources or derivation note at the bottom.

A filter bar above the tile grid: trade audience toggle (All, Electrical, Plumbing, HVAC, Restoration, Carpentry, Fire) and group toggle (All, A through G). Default state shows All.

Search box at the top searches tile names and descriptions.

## 9. Accessibility and Field Usability

The application meets WCAG 2.2 Level AA. The same accessibility requirements as sophiewell apply, plus three field-specific items.

Touch targets at least 48 by 48 pixels for gloved-hand operation.

Numeric inputs use `inputmode="decimal"` to surface the right mobile keyboard, with appropriate `min`, `max`, and `step` attributes.

Voice input compatibility: the site does not block dictation. Numeric inputs accept dictated values cleanly. The "Test with example" button (per section 11) is named so dictation can trigger it.

Every calculator displays an inline notice immediately above the input region: "This is a math aid for verification. Local codes, manufacturer specifications, and the authority having jurisdiction govern all installations and inspections."

For fire-ground utilities, the notice expands: "This is a math aid for verification. Departmental SOPs and incident command govern all fireground operations."

## 10. Universal Disclaimers and Liability Posture

A persistent footer disclaimer appears on every utility view. It reads: "roughlogic.com provides math and reference information from public physical principles, manufacturer specifications, and original summaries. It is not a substitute for code interpretation, professional engineering, or the authority having jurisdiction. Verify all values against authoritative sources and applicable codes before relying on them for any installation or design."

A docs/legal.md file expands on this with the legal posture, dataset attributions, and limits of liability under the MIT license.

Each calculator view carries the section 9 inline notice. The fire-ground utilities carry the SOP-and-incident-command variant.

These disclaimers reduce liability genuinely by ensuring no user can credibly claim the site presented itself as a code authority.

## 11. Speed, Trust, and Stability Requirements (Built In From v1)

The lessons from sophiewell's spec-v2 apply to roughlogic from v1. Build them in from the start; do not defer them.

### 11.1 Performance Budget

Same budget as sophiewell spec-v2 section 2.1. FCP under 1.0 second, LCP under 1.5 seconds, TTI under 1.5 seconds, TBT under 100 milliseconds, CLS under 0.05, all measured on Slow 4G in Chrome DevTools. Total transfer size under 100 KB for the home view, under 250 KB for any utility view including its primary data shard. Lighthouse CI step in the pipeline; build fails below 95 on any score.

### 11.2 Live-Render Calculator Pattern

Every calculator updates its output as the user types, with no submit button anywhere on the site. Debounce 50 milliseconds. Output region uses `aria-live="polite"`. Invalid inputs display a brief plain-text reason in the same field; the previous valid output remains visible with a strikethrough until the input is valid.

### 11.3 Copy Affordances

Every numeric output has a "Copy" button immediately adjacent. Clipboard API. "Copied" announcement via the live region. Calculators with multiple outputs also provide a "Copy all" button that produces a labeled multi-line plaintext summary.

### 11.4 Keyboard-First Input

Every calculator input is reachable by Tab in visual order. Numeric inputs use appropriate `inputmode` and `step` attributes. The tile grid is arrow-key navigable when focused. Global leader-key shortcuts (G prefix): G H Home, G S Search, G P Pinned, G U Unit Converter, G O Ohm's Law, G W Wire Ampacity, G V Voltage Drop, G F Friction Loss, G D Duct Sizing, G R Refrigerant P-T, G L Lumber Span, G C Concrete Volume, G T Static Pressure. The `?` key opens a shortcut help overlay.

### 11.5 Hash-Based Pinning and Calculator State

URL hash carries pinned-tile state and calculator input state. No cookies. The only localStorage key is `rl-theme` for the persisted light/dark theme preference; no tool data is stored there. Pinned format: `#p=ohms-law,wire-ampacity,refrigerant-pt`. Calculator state format: `#duct-sizing?cfm=400&friction=0.08`. Bookmarkable. Shareable. Updates via history.replaceState.

### 11.6 Inline Citations and Test With Example Buttons

Every calculator shows its citation directly on the calculator view, immediately below the inputs and above the result. Citations cite the underlying physics or published source.

Every calculator has a "Test with example" button immediately above the inputs. Activating populates the inputs with a known test case and renders the expected result. The example values are the same values used in the unit test for that calculator. The unit test asserts that running the formula with the example inputs produces the example output.

Example for Ohm's Law: V=12, I=2, R=6 (or any pair, computing the third).

Example for Wire Ampacity: 12 AWG copper THHN at 30 C ambient, no derating, expected ampacity around 30 A from physics computation that matches NEC 75 C column.

Example for Hazen-Williams Friction Loss: 100 ft of 1-inch Schedule 40 PVC at 10 GPM, water at 60 F, expected friction loss approximately 4.8 psi (computed; verify against published worked examples).

Example for Refrigerant P-T: R-410A at 100 psig saturated, expected temperature approximately 30 F.

Example for Stair Calculator: Total rise 108 inches, 14 risers, 13 treads, riser height 7.71 inches, run by IRC default of 10 inches, expected total run 130 inches.

Each calculator's spec entry requires a test-example value driving both the unit test and the button.

### 11.7 Inline Data Source Stamps

Every reference utility displays the source dataset and its version date directly on the view. Format: "Source: <dataset name>, <version>, fetched <date>." For first-principles calculators, the citation cites the underlying physics, not a database.

### 11.8 Stability Commitments

No A/B testing, ever. No user-visible feature flags. Public changelog at CHANGELOG.md and accessible via a footer link. 90-day deprecation notice for any utility being removed or having its formula changed. Semantic versioning. No tracking. No email capture. No notifications.

## 12. Utility Specifications

This section defines what each utility does, what data or formula it uses, and what the user sees. The common pattern is described once per group; utility-specific notes follow.

### Group A: Electrical (utilities 1 through 11)

Common pattern: numeric inputs with appropriate units, live-rendered output, inline citation to the underlying physics or NEC reference, "Test with example" button, copy affordance.

Utility 1 Ohm's Law: any two of V, I, R, P known; computes the others. Citation: Ohm's Law.

Utility 2 Wire Ampacity: gauge, conductor material (Cu/Al), insulation temperature rating (60/75/90 C), ambient temperature, conductor count for derating. Output: ampacity from physics-based calculation with derating applied. Citation: physics-based ampacity computation referencing IEEE conductor sizing methodology and the insulation's published temperature rating, not the NEC table. The values are equivalent to the NEC 75 C column for typical conditions; the user can verify against their NEC edition.

Utility 3 Voltage Drop: single-phase or three-phase, conductor material, length one-way, current. Output: voltage drop in volts and percentage. Citation: V = 2 * K * I * D / cmils for single-phase, sqrt(3) replaces 2 for three-phase, with K being the resistivity of the conductor material.

Utility 4 Conduit Fill: conduit type (EMT, PVC, IMC, RMC) and trade size, list of conductors (gauge and insulation type). Output: percent fill and pass/fail at the 40 percent / 31 percent / 53 percent thresholds. Cite the threshold rules generally; bundle conductor cross-sectional area data per insulation type.

Utility 5 Box Fill: box volume input (or selection from a small set of common box volumes), conductor count by gauge, device count, internal clamps. Output: cubic inch fill and pass/fail.

Utility 6 Circuit Breaker Sizing: load type (continuous or non-continuous), load current. Output: minimum breaker size after the 125 percent rule for continuous loads.

Utility 7 Motor Full Load Amps: horsepower, voltage, phase. Output: typical FLA from manufacturer-published reference data with attribution.

Utility 8 Transformer Sizing: load in kVA or kW with power factor, voltage primary and secondary. Output: required transformer kVA and primary/secondary FLA.

Utility 9 Three-Phase Power: line voltage, line current, power factor. Output: kW, kVA, kVAR.

Utility 10 Resistance of Copper and Aluminum at Temperature: gauge, length, conductor material, temperature. Output: resistance in ohms at the specified temperature using temperature coefficient of resistivity from physics.

Utility 11 Equipment Grounding Conductor Sizing: ungrounded conductor size or overcurrent device rating. Output: minimum EGC size from a reference table that is computed from the underlying impedance considerations and is equivalent to NEC Table 250.122 for typical conditions.

### Group B: Plumbing and Gas (utilities 12 through 20)

Utility 12 Pipe Sizing: water supply by fixture units (Hunter's Curve method), drainage by DFU. Output: minimum pipe size. Cite the underlying methodology and bundle the fixture unit values from public-domain plumbing texts.

Utility 13 Friction Loss: Hazen-Williams for water (citation: Hazen and Williams 1905). Inputs are pipe material (which sets C value), nominal pipe size, length, flow rate. Output: friction loss in psi or feet of head. For gas piping, Darcy-Weisbach with appropriate gas properties.

Utility 14 Pipe Volume: nominal diameter, length. Output: gallons or cubic feet.

Utility 15 Pump Sizing: required flow, total dynamic head (input or computed from utility 13 plus elevation). Output: required pump horsepower and selection guidance.

Utility 16 Static Pressure Loss: applies to HVAC ducts but lives here for piping; redirect to Group C utility 24 if user picks ducts.

Utility 17 Gas Pipe Sizing: BTU load, pipe length, gas type, pressure drop allowable. Output: required pipe size from published gas-flow capacity formulas.

Utility 18 Slope Calculator: rise required, run available. Output: slope as fraction (1/4 inch per foot) and degrees and percent.

Utility 19 Pressure Conversion: bidirectional between PSI, head feet, inches of water column, kPa, bar.

Utility 20 Backflow and Cross-Connection Reference: original plain-English summaries of common backflow scenarios and the typical preventer types. No code reproduction.

### Group C: HVAC (utilities 21 through 31)

Utility 21 Manual J Cooling Load Estimator (Simplified): inputs are floor area, window area, insulation level, climate zone (from NOAA design temps), occupancy. Output: simplified sensible and latent cooling load in BTU/hr. Inline notice: "Simplified estimate. A code-compliant load calculation requires Manual J."

Utility 22 Manual J Heating Load Estimator (Simplified): same input pattern. Output: simplified heating load. Same notice.

Utility 23 Duct Sizing: CFM and friction rate. Output: required duct size for round and rectangular. Computed from Darcy-Weisbach with standard duct surface roughness.

Utility 24 Static Pressure: list of duct elements with their pressure drops. Output: total external static pressure.

Utility 25 Refrigerant P-T Chart: refrigerant selector (R-410A, R-32, R-22, R-134a, R-404A, R-407C), pressure or temperature input. Output: corresponding saturated value. Bundle published manufacturer P-T data with attribution.

Utility 26 Superheat and Subcool: discharge or liquid line temperature, system pressure, refrigerant. Output: superheat or subcool degrees.

Utility 27 SEER and EER Conversion: bidirectional between rating systems with appropriate caveats about rating conditions.

Utility 28 Heat Pump Balance Point: heating capacity at design temp, heat loss at design temp. Output: balance point temperature.

Utility 29 Sensible Heat Ratio: total cooling load, sensible cooling load. Output: SHR.

Utility 30 CFM per Ton Reference: standard 400 CFM per ton with adjustments for high humidity (350 CFM) and dry climate (450 CFM).

Utility 31 Combustion Air Calculator: appliance BTU input, available room volume. Output: required combustion air opening size from published combustion-air requirements.

### Group D: Water Damage and Mold Restoration (utilities 32 through 39)

Utility 32 Psychrometric Calculator: temperature, relative humidity, atmospheric pressure. Output: dew point, GPP (grains per pound), specific humidity, vapor pressure. From psychrometric equations (citation to ASHRAE-equivalent first-principles psychrometric formulas).

Utility 33 Drying Goal: outdoor temperature and RH, indoor conditions. Output: target indoor GPP for effective drying (typically outdoor GPP minus a margin).

Utility 34 Dehumidifier Sizing: room cubic feet, water class, expected pints per day to remove. Output: required dehumidifier capacity in pints per day per AHAM and field methods, with both shown.

Utility 35 Air Mover Placement: water class and affected square footage. Output: number of air movers and CFM per affected square foot per IICRC S500 reference (cited but not reproduced).

Utility 36 Class and Category of Water Loss Reference: IICRC categories 1, 2, 3 and classes 1-4 with original plain-English summaries.

Utility 37 Material Drying Times: material type and contamination class. Reference table of typical drying times with original notes.

Utility 38 Mold Growth Conditions: temperature, RH, time. Output: relative growth risk based on published mold growth research.

Utility 39 PPE Selection: water category and contamination type. Output: typical PPE recommendation per OSHA and IICRC references.

### Group E: Carpentry and Construction (utilities 40 through 50)

Utility 40 Stair Calculator: total rise (or floor-to-floor height), preferred riser height range. Output: number of risers, riser height, run, total run, headroom check.

Utility 41 Roof Pitch: rise/run. Output: pitch as fraction, degrees, percent. Bidirectional inputs.

Utility 42 Rafter Length: span, pitch, overhang. Output: rafter length using Pythagorean theorem.

Utility 43 Square Footage: shape selector (rectangle, triangle, trapezoid, circle). Output: area.

Utility 44 Lumber Board Footage: thickness, width, length, count. Output: total board feet.

Utility 45 Concrete Volume: shape selector (slab, footing, column, footing-with-stem). Output: cubic yards with waste factor toggle.

Utility 46 Rebar Spacing and Quantity: slab dimensions, spacing on center, edge clearance. Output: total linear feet of rebar with bend deductions.

Utility 47 Span Tables for Common Lumber: species, grade, size, span, load. Computed from first principles using published material properties (allowable bending stress, modulus of elasticity by species and grade) and the engineering equations for simple-span beams. Cite the mechanics and material properties, not the AWC table. Output: maximum span for typical loads.

Utility 48 Nail and Screw Pull-Out Reference: fastener type, wood species, length of penetration. Output: typical pull-out resistance from published fastener engineering data.

Utility 49 Beam Loading Calculator: simple span, simply supported, point and uniform loads. Output: maximum moment and deflection. From standard beam mechanics.

Utility 50 Material Quantity Estimator: assembly type (drywall, paint, flooring, roofing, siding) and area. Output: quantity needed with waste factor.

### Group F: Fire-Ground Engineering (utilities 51 through 58)

All Group F utilities carry the SOP-and-incident-command notice from section 9.

Utility 51 Friction Loss: hose diameter, length, GPM. Output: friction loss in psi using the standard CQ^2L formula with coefficients per hose diameter (cited to NFA training materials).

Utility 52 Pump Discharge Pressure: nozzle pressure, friction loss, elevation, appliance loss. Output: required PDP.

Utility 53 Hydrant Flow: Pitot gauge reading, hydrant outlet diameter, coefficient of discharge. Output: GPM via standard hydrant flow formula.

Utility 54 Required Fire Flow: structure square footage, occupancy classification, exposure factor. Output: required fire flow in GPM using the ISO method (cited).

Utility 55 Master Stream Reach: nozzle pressure, nozzle type. Output: typical reach in feet from published master-stream data.

Utility 56 Aerial Ladder Reach: angle, extension. Output: horizontal and vertical reach via geometry.

Utility 57 Foam Concentrate: fire size, application rate, foam type. Output: required foam concentrate volume.

Utility 58 Smoke Reading Reference: original plain-English reference for volume, velocity, density, and color interpretation per established fire science training.

### Group G: Cross-Trade Utilities (utilities 59 through 64)

Utility 59 Unit Converter: comprehensive bidirectional unit conversions across length, area, volume, mass, force, pressure, temperature, energy, power, flow, and electrical units.

Utility 60 Material Cost Estimator: price per unit, quantity. Output: total cost with optional tax and delivery.

Utility 61 Markup and Margin Calculator: cost, desired markup or margin. Output: selling price.

Utility 62 Time and Materials Estimator: hours, labor rate, material cost. Output: total billable amount.

Utility 63 Sales Tax Calculator: state, subtotal. Output: tax amount and total. Uses bundled state revenue department published rates.

Utility 64 Tip Out Calculator: total revenue, crew hours by member. Output: per-person split.

## 13. Build, Test, and Deployment

Same approach as sophiewell.com section 12.

### Build

Single Node script copies index.html, styles.css, app.js, sw.js, and data into dist. No bundler or transpiler in the runtime path. Optional minification by esbuild as a build-time tool only.

scripts/build-data.mjs runs in CI on a monthly schedule (slower cadence than sophiewell because most data is stable physical constants).

### Tests

Node's built-in test runner. No framework dependency.

Unit tests cover every formula against worked examples (especially important for first-principles implementations of physics-derived calculations to verify they produce the same answers as published code tables for the same inputs). At least 10 test cases per calculator. Cross-verification against published worked examples wherever the underlying physics has documented reference cases.

Integration tests use Playwright as a CI-only dev dependency.

Accessibility tests use axe-core in CI.

Data integrity tests verify shard SHA-256 hashes match manifests on every build.

CI grep checks fail the build on innerHTML, emoji codepoints, em-dashes in source, or any string longer than 25 words that closely matches a known NEC, IPC, ASHRAE, or ACCA published text (a fuzzy duplicate detector run against a private hash list of code n-grams kept off the public repo, similar to the AMA descriptor check from sophiewell).

A separate "first-principles verification" test suite confirms that for each physics-derived calculator, the implementation produces values within tolerance of published code-table values for representative inputs. The tolerance is documented per calculator. This test does not assert that the implementation matches a copyrighted table; it asserts that the implementation's output is consistent with the underlying physics.

### Deployment

Cloudflare Pages connected to main branch for production at roughlogic.com. develop branch for preview. HTTPS enforced. HSTS preloaded. Section 7 security headers via _headers file.

## 14. Step-by-Step Build Instructions and Claude Code Prompts

These are the working instructions for building roughlogic.com using Claude Code. Each step builds on the previous; tests must pass before advancing. Prompts are designed to be pasted directly into Claude Code with the repository as the working directory.

### Step 1: Repository Scaffolding

> Create the directory and file structure for roughlogic.com using section 6 of spec.md as the exact reference. Create empty placeholder files for index.html, styles.css, app.js, sw.js, README.md, CHANGELOG.md, package.json, .nvmrc, .gitignore, and the LICENSE file with the standard MIT license text. Create the data, scripts, test, docs, and .github/workflows directories. Add a .gitkeep file in each empty directory. The package.json declares type module, sets a Node engines field of >=20, and defines empty npm scripts for dev, build, test, test:unit, test:e2e, test:a11y, lint, data:refresh, data:verify, and clean. No dependencies. Set .nvmrc to current Node 20 LTS. Set .gitignore to exclude node_modules, dist, .DS_Store, and temp build artifacts. Verify the structure matches section 6. Do not write application code yet.

### Step 2: Documentation Skeleton

> Read spec.md in the repository root. Create six documents in docs: architecture.md, data-sources.md, legal.md, derivations.md, accessibility.md, and threat-model.md. architecture.md contains the runtime architecture from section 6 of spec.md, expanded with an ASCII architecture diagram. data-sources.md lists every dataset with canonical URL, publishing source, license or public-domain status, update cadence, and shard layout. legal.md contains the section 5 posture verbatim with citations and a clear statement of the code-licensing situation, the first-principles approach, and the original-summaries policy. derivations.md is the critical document: for each physics-derived calculator (wire ampacity, friction loss, span tables, ampacity from temperature coefficient of resistivity, beam mechanics), document how the calculation is derived from first principles, cite the underlying physics references, and explain why the implementation is original work rather than reproduction of a copyrighted table. accessibility.md contains the section 9 requirements as a checklist. threat-model.md enumerates threats and controls. No emojis. No em-dashes. Plain prose, technical tone.

### Step 3: README

> Write README.md per the format in section 13 of spec.md (which inherits the same section structure as sophiewell.com's README per spec.md section 11). Sections in order: title and elevator pitch; the problem; the solution; quick start; how it works and how to use it; system design and architecture overview; deterministic logic versus LLM usage (state explicitly that roughlogic uses zero LLM and zero AI); list of all commands (CLI reference); safety guarantees (read only versus write); limitations (honest assessment including the first-principles equivalence to code tables and the explicit non-reproduction of code text); stability commitments (no A/B testing, no flags, no tracking, no email capture, 90-day deprecation, semver, public changelog); documentation. Do not include Contributing, License, Support, Acknowledgments, Security, or Roadmap sections. No emojis, no em-dashes, no marketing superlatives. Reference the six trade audiences and seven utility groups.

### Step 4: Visual Skeleton (HTML, CSS)

> Build index.html and styles.css per sections 8 and 9 of spec.md. Light theme, monochrome, slightly higher contrast than sophiewell. System font stack only. Grayscale palette per section 8. Header with wordmark "roughlogic" lowercase and tagline "field math for the trades." Search box for filtering tiles. Trade audience filter row (All, Electrical, Plumbing, HVAC, Restoration, Carpentry, Fire). Group filter row (All, A through G). Tile grid with one card per utility (64 utilities total per section 12; render placeholder tiles for now). Footer with "Made with love by Clay Good" and "View source on GitHub" link to https://github.com/clay-good/roughlogic.com. No framework. No external font or asset. No emojis or em-dashes. Tile grid one column on mobile, two on tablet, three on desktop. Each tile has a heading, one-sentence description, trade tag pills, "Open tool" link. Touch targets at least 48 by 48 pixels. Add the CSP from section 7 as a meta tag. Add the universal disclaimer from section 10 in the footer. Verify the page passes the W3C HTML validator and that contrast on body text exceeds 7:1.

### Step 5: Routing, Tool Shell, and Filters

> Create app.js using vanilla JavaScript and ES module patterns. Implement hash-based routing with routes for the home view and for every utility (use kebab-case identifiers: ohms-law, wire-ampacity, voltage-drop, conduit-fill, box-fill, breaker-sizing, motor-fla, transformer-sizing, three-phase, copper-resistance, egc-sizing, pipe-sizing, friction-loss, pipe-volume, pump-sizing, static-pressure-piping, gas-pipe-sizing, slope, pressure-conversion, backflow, manual-j-cooling, manual-j-heating, duct-sizing, static-pressure-hvac, refrigerant-pt, superheat-subcool, seer-eer, balance-point, shr, cfm-per-ton, combustion-air, psychrometric, drying-goal, dehumidifier, air-movers, water-classes, drying-times, mold, ppe, stairs, roof-pitch, rafter, square-footage, board-footage, concrete, rebar, lumber-spans, fastener-pullout, beam-loading, material-quantity, fire-friction, pdp, hydrant-flow, required-fire-flow, master-stream, aerial-ladder, foam, smoke-reading, unit-converter, material-cost, markup, time-and-materials, sales-tax, tip-out). Each route renders a view with a "Back to tools" link, an h1 with the tool name, the section 9 inline notice (with the SOP-and-incident-command variant for fire-ground utilities), the inline citation block, the input region, the output region, and the data sources or derivation note. All DOM updates use textContent or createElement; never innerHTML. Add ESLint config banning innerHTML, eval, Function constructor. Add CI grep check failing on emoji codepoints, em-dashes, or innerHTML. Implement the trade audience and group filters and the search box. Implement keyboard navigation: tile grid arrow-keys, Tab order, focus rings, leader-key shortcuts per section 11.4 of spec.md, `?` shortcut overlay. Implement hash-based pinning per section 11.5. Verify routes work end to end via tile clicks and the browser back button.

### Step 6: Service Worker and Offline

> Add sw.js. Pre-cache index.html, styles.css, app.js, and the manifest.json files in each data folder. Cache data shards on first fetch with a cache-first strategy. Cache name includes a build hash bumped by the build script. On activation, old caches are deleted. Register the service worker from app.js, only when served over HTTPS or localhost. Verify offline behavior: load the page, go offline, reload; the application should still render. Verify the service worker scope is correct.

### Step 7: Data Pipeline

> Implement scripts/build-data.mjs as a standalone Node 20 script using only built-ins. The script downloads, parses, and shards datasets per sections 5 and 6 of spec.md. For each dataset: fetch canonical URL where applicable, verify SHA-256 against scripts/expected-hashes.json, parse the source format, produce sharded JSON, write a manifest.json per dataset with version metadata and integrity hashes. Limit each shard to under one megabyte after gzip. Document each dataset's source in scripts/sources.md. The data work for roughlogic is more curation than fetching: bundle physical constants from NIST, NOAA climate data for HVAC design temperatures by ASHRAE climate zone, manufacturer-published refrigerant P-T data with attribution, manufacturer-published motor FLA data with attribution, lumber properties from public-domain engineering references, fire hose friction coefficients from NFA training materials, state sales tax rates from state revenue department publications. Do not bundle NEC, IPC, IRC, ASHRAE Fundamentals, ACCA Manual J, or any other licensed code text. The original plain-English summaries for each utility live in data/summaries/summaries.json and are written by the project author as original work. Run the script once and commit the resulting data folder. Verify all manifests are valid JSON and all shard hashes match.

### Step 8: First-Principles Calculation Foundation

> Before implementing any specific calculator, build a small library of first-principles physics functions in app.js (or a sibling pure-math.js file): conductor resistance from temperature coefficient of resistivity, ampacity from conductor properties and insulation rating, Hazen-Williams friction loss, Darcy-Weisbach friction loss, beam mechanics (moment, deflection, allowable stress), psychrometric equations (dew point, GPP, vapor pressure), basic three-phase power equations, refrigerant P-T interpolation. Each function is pure: no DOM, no globals, no I/O. Each function has unit tests against published worked examples or against values that match what code tables produce for the same inputs (within documented tolerance). The tests are the load-bearing verification that the implementation is correct. Cite the source physics in code comments. Verify that for each function, the test suite passes against at least 10 representative inputs.

### Step 9: Group A Electrical (Utilities 1 through 11)

> Implement Group A utilities 1 through 11 per section 12 of spec.md. Build each calculator using the live-render pattern from section 11.2 (no submit button, debounced 50ms re-render, aria-live output region). Each calculator includes the inline citation per section 11.6, the Test with example button, the copy affordance per section 11.3, and the section 9 inline notice. For utility 2 Wire Ampacity, use the conductor-resistance and ampacity-from-physics functions from step 8; the implementation produces values matching NEC 75 C column for typical conditions but is computed from physics, not reproduced from the table. For utility 4 Conduit Fill, bundle conductor cross-sectional area data per insulation type as factual values; the threshold percentages (40, 31, 53) are cited as code thresholds. Add unit tests for each calculator with at least 10 test cases. Add Playwright tests for keyboard-only operation. Verify each manually with realistic test cases and compare results against published code-table values for the same inputs to confirm equivalence within tolerance.

### Step 10: Group B Plumbing and Gas (Utilities 12 through 20)

> Implement Group B utilities 12 through 20 per section 12. Use the friction-loss functions from step 8. For utility 12 Pipe Sizing, implement Hunter's Curve method from public-domain plumbing texts. For utility 17 Gas Pipe Sizing, use the published gas-flow capacity formulas (Spitzglass, Weymouth, IGT) with proper citation. For utility 19 Pressure Conversion, bidirectional unit conversion between PSI, head feet, inches of water column, kPa, bar with high precision. For utility 20 Backflow Reference, original plain-English summaries of common backflow scenarios and preventer types from data/summaries/summaries.json. Add unit tests per calculator. Verify manually.

### Step 11: Group C HVAC (Utilities 21 through 31)

> Implement Group C utilities 21 through 31 per section 12. Utility 21 and 22 (Manual J Cooling and Heating Load Estimators) are simplified estimators using engineering principles plus NOAA climate data; each carries the explicit notice that the result is a simplified estimate not a Manual J load. Utility 23 Duct Sizing uses Darcy-Weisbach with standard duct surface roughness. Utility 25 Refrigerant P-T uses bundled manufacturer P-T tables with attribution to the publishing manufacturer. Utility 28 Heat Pump Balance Point is a linear computation. Run utilities 21 and 22 inside a Web Worker. Add unit tests per calculator. Verify manually against published worked examples.

### Step 12: Group D Restoration (Utilities 32 through 39)

> Implement Group D utilities 32 through 39 per section 12. Utility 32 Psychrometric Calculator uses the standard psychrometric equations from physics (citation to ASHRAE Handbook of Fundamentals as a reference, but compute from first principles, do not reproduce ASHRAE tables). Utilities 33-39 are reference tables and calculators based on IICRC S500 methodology (reference IICRC standards by name; do not reproduce their text). Utility 36 Class and Category of Water Loss is a reference page with original plain-English summaries. Add unit tests for the psychrometric calculator against published worked examples. Verify manually.

### Step 13: Group E Carpentry and Construction (Utilities 40 through 50)

> Implement Group E utilities 40 through 50 per section 12. Utility 47 Lumber Spans is the most legally-sensitive: implement from first principles using simple-span beam mechanics (moment of inertia, allowable bending stress, modulus of elasticity, deflection limit) and bundled lumber material properties (allowable bending stress and modulus of elasticity by species and grade from public engineering references, not reproduced from the AWC table). Verify the output matches AWC table values within tolerance for representative cases; this is the verification that the first-principles implementation is correct, not a reproduction. Utility 49 Beam Loading uses standard beam mechanics formulas. Other utilities are direct geometry or simple math. Add unit tests per calculator with worked examples. Verify manually.

### Step 14: Group F Fire-Ground Engineering (Utilities 51 through 58)

> Implement Group F utilities 51 through 58 per section 12. All Group F utilities carry the SOP-and-incident-command variant of the section 9 inline notice. Utility 51 Friction Loss uses the standard fireground formula CQ^2L with coefficients per hose diameter from National Fire Academy training materials (which are public-domain U.S. government sources). Utility 53 Hydrant Flow uses the standard formula with appropriate coefficient of discharge. Utility 54 Required Fire Flow uses the ISO method (publicly available formulas, cited). Add unit tests per calculator against published fireground hydraulic worked examples. Verify manually.

### Step 15: Group G Cross-Trade Utilities (Utilities 59 through 64)

> Implement Group G utilities 59 through 64 per section 12. Utility 59 Unit Converter is a comprehensive bidirectional converter; implement it with full precision and cover all units listed in section 12. Utility 63 Sales Tax bundled state rates from data/crosswalks/state-tax-rates.json fetched from state revenue departments. Add unit tests per calculator.

### Step 16: Performance Budget and Lighthouse CI

> Add a Lighthouse CI step to .github/workflows/ci.yml. Configure it to run against the home view and against three representative utility views (ohms-law, refrigerant-pt, friction-loss) on Slow 4G emulation. The job fails if any score drops below 95. Document the budget in docs/performance.md per section 11.1 of spec.md. Verify the budget passes against the current build.

### Step 17: Accessibility Pass

> Run an accessibility audit using axe-core against every utility view. Fix every "serious" or "critical" violation. Verify WCAG 2.2 Level AA per section 9 of spec.md. Verify touch targets are at least 48 by 48 pixels. Confirm focus rings visible, tab order matches visual order, every input has a label, page has a single h1 per view, color contrast exceeds 7:1 on body text, live regions announce results. Verify voice input compatibility manually with the dictation function on a test device. Add the axe-core CI check; the build fails on any new violation.

### Step 18: Security Headers and CSP

> Add the _headers file at the repository root with all headers from section 7 of spec.md. Add the same CSP as a meta tag in index.html. Verify the deployed site reports A-plus on Mozilla Observatory and securityheaders.com. Confirm no script or style loads from any origin other than the page's own. Verify connect-src 'self' is enforced.

### Step 19: Test Suite Completion and CI

> Bring the test suite to completion. Unit tests use Node's built-in runner. Integration tests use Playwright as a CI-only dev dependency. Add npm scripts: test, test:unit, test:e2e, test:a11y. Add .github/workflows/ci.yml that runs lint, test:unit, test:e2e, test:a11y, the grep check, and the first-principles verification suite on every push and pull request to main and develop. Add .github/workflows/data-refresh.yml that runs scripts/build-data.mjs monthly, opens a pull request with the updated data folder if anything changed, and runs the full test suite on the PR. Verify both workflows pass on a clean run.

### Step 20: Data Change Analysis

> Implement scripts/analyze-data-changes.mjs as a Node 20 script using only built-ins. It compares previous and freshly generated data shards (previous via git in CI) and produces a Markdown summary suitable for pasting into a pull request body. The summary covers any changes to physical constants (rare), refrigerant P-T data updates from manufacturers, NOAA climate data updates, state sales tax rate changes, and any added or removed datasets. Update .github/workflows/data-refresh.yml to run the script after build-data.mjs and set the resulting Markdown as the PR body. Add a "Changelog" link in the footer that opens CHANGELOG.md as a static HTML view.

### Step 21: Deployment

> Configure Cloudflare Pages deployment. Build command is the simple npm build script that copies files into dist. Output directory is dist. Connect main branch to production at roughlogic.com and develop to a preview environment. Verify HTTPS enforced, HSTS preloaded, section 7 security headers served correctly. Verify the site loads, every utility works, the service worker registers, offline use works after first load. Update the README's Quick Start to reflect the live URL.

### Step 22: Final Review and Launch Checklist

> Walk through the launch checklist and produce a written report. Items: every utility renders and works on Chrome, Firefox, Safari on desktop and mobile; the page passes the W3C HTML validator; the page passes Mozilla Observatory at A-plus; axe-core reports zero serious or critical violations on any view; touch targets are at least 48 by 48 pixels; voice input compatibility verified; all unit and integration tests pass; the first-principles verification suite passes against published worked examples for every physics-derived calculator; the CSP blocks third-party connections in the console; the service worker caches the shell and shards correctly; the legal posture from section 5 is implemented and verified by automated tests where applicable; the original plain-English summaries are present and have been reviewed for non-derivation from copyrighted code text; every utility shows the section 9 inline notice; fire-ground utilities show the SOP-and-incident-command variant; the universal disclaimer from section 10 is present in the footer; the README and docs are accurate; the data manifests show fresh dates; the footer includes "Made with love by Clay Good" and the View source on GitHub link to the correct repository. Produce a written report listing each item and pass/fail status.

## 15. Operations and Ongoing Maintenance

The site is intended to be near-zero-maintenance. Recurring work is the monthly data refresh PR, which the maintainer reviews and merges. A quarterly review covers any new public datasets to add, any data sources whose format has changed, any newly raised legal concerns, and any user-suggested utility additions worth considering.

A yearly review covers code edition updates: when a new NEC, IPC, ASHRAE, or NFPA edition is published, the maintainer reviews the relevant first-principles calculators to verify they still produce equivalent answers. Most of the time they do, because physics doesn't change. Occasionally a code revision changes a derating factor or a calculation method in a way that requires the calculator's underlying methodology to be revised; the maintainer makes that revision, updates the citation, and announces the change in the changelog.

The cost of operating the site is the domain renewal (approximately ten dollars per year) and zero compute cost on the Cloudflare Pages free tier. The site is designed to remain free to operate indefinitely.

## 16. Closing Note

roughlogic.com is built on the same principle as encryptalotta.com and sophiewell.com: the math and reference data needed to do the trades are mostly public physics, mostly stable across years, and mostly buried in either licensed code books or paid apps that nag the user constantly. Pulling the math into a clean, free, account-free, ad-free site doesn't compete with the code books; it competes with the gap between needing the math and getting the math. A single tile, a single calculation, a single citation, a single copy of the answer to the clipboard. The user goes back to work.

If a feature cannot be implemented as a deterministic function over public physics, public data, or original creative work, it does not belong here. If it requires reproducing licensed code text, it does not belong here. If it requires telling a user whether something passes inspection in their jurisdiction, it does not belong here. The site is math and reference. The user is the judgment. The authority having jurisdiction is the authority.

That's the whole pitch. Build it that way and it lasts.
