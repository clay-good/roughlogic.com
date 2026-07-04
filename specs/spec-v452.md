# roughlogic.com Specification v452 -- Hydronic Fill Pressure (Static Height) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the plumbing-systems trio (v450 air gap -> v451 hydronic expansion
> tank -> v452 hydronic fill pressure). Setting the fill (pressure-reducing) valve on a hydronic system is the first
> commissioning step, and the minimum fill pressure -- enough to lift water to the highest point plus a margin -- has no
> tile.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A closed heating loop must hold enough static pressure
> to push water to its highest point and keep a positive pressure there so air can be vented and the pump does not cavitate.
> Because a foot of water is `1/2.31 = 0.433 psi`, the minimum cold fill pressure is `height_ft / 2.31 + margin`, with a
> `4 to 5 psi` margin at the top. This fill pressure is exactly the `Pi` that `hydronic-expansion-tank` uses. No tile
> computes it. This adds the fill-pressure tile to the existing **`calc-plumbing.js`** module (Group B); no new group, trade,
> or dependency. Inherits spec.md through spec-v451.md.
>
> **The gap, and the evidence for it.** A system `30 ft` tall needs a cold fill pressure of `30 / 2.31 + 4 = 12.99 + 4 =
> 17.0 psi` to lift water to the top with a `4 psi` margin, which is why residential boilers are commonly set near
> `12 to 15 psi` for a two-story home and higher for taller buildings. A three-story, `35 ft` system needs `35/2.31 + 4 =
> 19.2 psi`. Set the fill too low and the top of the system goes negative, drawing air; too high and the relief valve weeps.
> No tile does this.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The system height is a length
(ft); the margin and the fill pressure are pressures (psi). The v18/v21 contract: any non-finite input, or a non-positive
height, returns `{ error }`; the margin defaults to `4 psi`, and the tile reports the minimum fill pressure and the static
pressure at the top of the system. Citation discipline (v19/v22): `GOVERNANCE.general` over the hydronic fill pressure by
name; `editionNote` names **the water column relation `1 psi = 2.31 ft` (a foot of water is `0.433 psi`), the minimum cold
fill pressure `= height_ft / 2.31 + margin` (a `4 to 5 psi` top margin to keep the high point positive for air venting and
pump NPSH), and that this fill pressure is the `Pi` for `hydronic-expansion-tank`**, and states that **this returns the
minimum fill (PRV) setting for a closed hydronic loop, that the actual setting also considers the relief valve rating and
pump head, and that it is a commissioning aid, not a substitute for the system design**.

## 2. The tile

### 2.1 `hydronic-fill-pressure` -- Hydronic Fill Pressure (Static Height)

```
inputs:
  height_ft    ft    height from the fill/gauge to the highest point
  margin_psi   psi   top-of-system margin (default 4)

fill_psi   = height_ft / 2.31 + margin_psi
top_static = margin_psi                    (static pressure remaining at the high point)
```

**Pinned worked example (30 ft system, 4 psi margin).** `fill = 30/2.31 + 4 = 12.99 + 4 = 17.0 psi`, leaving `4 psi` at the
top. **Cross-check (a taller building).** A `35 ft` system needs `35/2.31 + 4 = 19.2 psi`; every extra story adds about
`4.3 psi` of static lift. A non-positive height takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `hydronic-expansion-tank` / `hydronic-gpm-deltat`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, hydronic fill pressure, `editionNote` naming
the `2.31 ft/psi` relation, the `height/2.31 + margin` fill, and the expansion-tank tie-in);
`test/fixtures/worked-examples.json` (the 30 ft example + the 35 ft cross-check); `test/fixtures/compute-map.js`
(`hydronic-fill-pressure` -> `computeHydronicFillPressure` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (->
`hydronic-expansion-tank` / `hydronic-gpm-deltat` / `elevation-pressure-loss` / `supply-pressure-budget`);
`data/search/aliases.json` ("hydronic fill pressure", "boiler fill pressure", "PRV setting hydronic", "system fill
pressure", "2.31 feet per psi", "hydronic static pressure", "boiler pressure setting", "fill valve pressure", "hydronic
commissioning"); the id appended to the existing plumbing renderers block in `app.js`; the `// dims:` annotation (height
length, pressures pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
`2.31` relation, and the non-positive / non-finite error seams. No new module; re-pin `calc-plumbing.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the fill / top-static output wraps on a phone); render-no-nan +
a11y sweep, output read to the value (30 ft -> 17.0 psi).

## 5. Roadmap position

Closes the plumbing-systems trio: v450 the air gap, v451 the expansion tank, and v452 the fill pressure that sets the tank's
pre-charge. A cold-fill-to-hot-operating pressure-rise check against the relief valve rating is the deliberate next
follow-on.
