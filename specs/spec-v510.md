# roughlogic.com Specification v510 -- Wheel Offset and Backspacing (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v509.md.
>
> **The gap, and the evidence for it.** `tire-gearing` covers rolling diameter and speedometer error, but wheel fitment
> -- how far a wheel sits in or out on the hub -- is unrepresented, and it is where a wheel-shopping math error hides.
> Two quantities describe the same thing in different systems: **offset** (ET, millimeters, from the mounting face to
> the wheel centerline) and **backspacing** (inches, from the mounting face to the inboard rim edge). People shop by one
> and measure clearance with the other. The tile converts between them, and it bakes in the two traps. First, the rim
> "width" is the **bead seat**, but the wheel is about an inch wider overall (half an inch per flange), so backspacing is
> figured off the overall width -- the omission that makes a fitment come out an inch wrong. Second, a more positive
> offset pulls the wheel **inboard**, gaining fender clearance but losing brake and strut clearance, so a swap from 0 to
> +45 mm moves the wheel about 1.8 inches inward. The tile takes the rim width and either offset or backspacing, and
> returns the other plus the overall width, so a wheel is checked against the fender and the strut before it is bought.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rim width, overall
width, backspacing, and frontspacing are lengths (`L`, in inches); the offset is a length (`L`, in millimeters, worked
through the `25.4` mm-per-inch conversion); the `0.5` in flange allowance and `25.4` are `dimensionless` unit-bearing
constants. The v18/v21 contract: any non-finite input, a non-positive rim width, or (when solving backspacing from
offset) a missing offset -- or (when solving offset from backspacing) a non-positive backspacing -- returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the wheel-dimension geometry by name (Tire & Rim Association
wheel dimensions); `editionNote` names the **wheel offset / backspacing conversion**, prints
`overall_width = rim_width + 1`, `backspacing = rim_width / 2 + 0.5 + offset_mm / 25.4`, and
`offset_mm = (backspacing - rim_width / 2 - 0.5) x 25.4`, and states that **the rim width is the bead seat and the wheel
is about one inch wider overall (half an inch per flange), a more positive offset pulls the wheel inboard (more fender
clearance, less brake and strut clearance), backspacing and offset describe the same geometry in different units and
directions, and the actual wheel, hub, and suspension clearances govern** -- a fitment aid, not a guarantee it clears.

## 2. The tile

### 2.1 `wheel-offset-backspacing` -- Converting Offset to Backspacing (and Where the Inch Hides)

```
inputs:
  rim_width_in     in    the wheel bead-seat width (the "width" on the wheel)
  offset_mm        mm    wheel offset ET (positive = outboard mounting face; 0 if solving from backspacing)
  backspacing_in   in    backspacing (0 if solving from offset)

overall_width = rim_width_in + 1                                                  [in]
backspacing   = offset_mm known ? rim_width_in / 2 + 0.5 + offset_mm / 25.4       [in]
              : backspacing_in
offset_mm_out = backspacing_in known ? (backspacing_in - rim_width_in / 2 - 0.5) x 25.4   [mm]
              : offset_mm
frontspacing  = overall_width - backspacing                                       [in]
```

**Pinned worked example (an 8 in wheel at +45 mm offset).**
`overall = 8 + 1 = 9 in`; `backspacing = 8/2 + 0.5 + 45/25.4 = 4 + 0.5 + 1.772 = ` **6.27 in**, and
`frontspacing = 9 - 6.27 = ` **2.73 in**. **Cross-check (a zero-offset wheel sits nearly two inches further out).**
Keep the 8 in wheel but at `0 mm` offset: `backspacing = 4 + 0.5 + 0 = ` **4.50 in** -- the +45 mm wheel sits
`6.27 - 4.50 = 1.77 in` further inboard than the zero-offset one, the clearance shift a fender-vs-strut fitment check
turns on. The tile returns the overall width, the backspacing, the offset, and the frontspacing.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the +45 mm example + the zero-offset
cross-check); `test/fixtures/compute-map.js` (`wheel-offset-backspacing` -> `computeWheelOffsetBackspacing` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `tire-gearing` / `bolt-proof-load` / `brake-pedal-hydraulic`);
`data/search/aliases.json` ("wheel offset", "backspacing", "et offset", "wheel fitment", "offset to backspacing",
"positive negative offset", "rim backspacing", "wheel poke"); the id appended to the mechanic renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the offset-backspacing round-trip conversion, the overall = rim + 1 relation, the inboard shift with positive
offset, and the error seams (non-finite, non-positive rim, missing conversion input). Hand-writes its renderer
(mirroring the calc-mechanic.js `tire-gearing` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the overall / backspacing / frontspacing stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the +45 mm example -> 6.27 in backspacing).

## 5. Roadmap position

Adds wheel fitment beside `tire-gearing` (rolling diameter). A tire-and-wheel clearance-swing helper (how much a plus-
size tire pokes at full lock and compression) and a hub-bore / lug-pattern compatibility note are deliberate future
follow-ons. Further Group K growth stays evidence-driven.
