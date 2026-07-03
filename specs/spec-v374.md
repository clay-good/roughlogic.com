# roughlogic.com Specification v374 -- Conduit Jam Ratio for Three Same-Size Conductors (NEC Ch. 9) (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.131.0). The 100th tile of the trades-only catalog-expansion campaign
> (v275..v374). Where `conduit-fill` checks that conductors fit by cross-sectional percentage, this tile catches the
> pulling problem percent fill misses: jamming, when three same-size conductors wedge in a bend as they cross over each
> other.**
> In-scope catalog expansion under the spec-v106 trades-only charter: `conduit-fill` passes a raceway on the 40% fill rule,
> but three same-diameter conductors can still jam in a bend when the conduit's inside diameter is close to three times the
> conductor's outside diameter -- an NEC Chapter 9 informational-note concern that a fill check never flags, and the reason
> a pull that "should fit" locks up. Adds one tile to the existing **`calc-electrical.js`** module (Group A); no new group,
> trade, or dependency. Inherits spec.md through spec-v373.md.
>
> **The gap, and the evidence for it.** When three conductors of the same diameter are pulled through a raceway, they can
> triangulate and wedge in a bend if the ratio of the conduit inside diameter to the conductor outside diameter falls in the
> jam-prone band -- roughly `2.8 to 3.2` (jamming is most likely right at 3.0). The jam ratio is `D_conduit_ID / D_conductor_OD`.
> For three conductors of `0.65 in` OD in a 2 in EMT (`ID = 2.067 in`), the ratio is `2.067/0.65 = 3.18` -- inside the
> jam-prone band, a pull to plan carefully (a larger conduit or a different conductor count avoids it). Drop to a 1-1/4 in
> conduit (`ID = 1.61`) with `0.5 in` conductors and the ratio is `3.22`, just clear. The `conduit-fill` tile confirms the
> conductors fit; this tile confirms they will pull.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The conduit inside diameter
and the conductor outside diameter are lengths (in); the jam ratio is dimensionless; the jam-prone verdict is boolean. The
v18/v21 contract: any non-finite input, or a diameter at or below zero, returns `{ error }`; the jam check applies only to
exactly three same-size conductors (flagged for other counts, where jamming is not the governing concern). Citation
discipline (v19/v22): `GOVERNANCE.general` over the conduit-jam concern by name; `editionNote` names **the NEC Chapter 9
informational note on jamming of three conductors in a raceway, the jam ratio `D_conduit_ID/D_conductor_OD`, and the
jam-prone band of about 2.8 to 3.2 (most likely at 3.0), with the conduit inside diameters from NEC Chapter 9 Table 4**,
and states that **this returns the jam ratio and a jam-prone flag -- it applies to three same-diameter conductors pulled
around a bend, uses the actual conduit inside diameter (Table 4) and conductor outside diameter (Table 5), and is a pulling
concern separate from the 40% cross-sectional fill (`conduit-fill`), the pulling tension (`pulling-tension`), and the
sidewall pressure; and this is an installation aid, not a substitute for the AHJ** -- the authority having jurisdiction and
good pulling practice govern.

## 2. The tile

### 2.1 `conduit-jam-ratio` -- Conduit Jam Ratio for Three Same-Size Conductors

```
inputs:
  conduit_id_in    in   conduit inside diameter (NEC Ch. 9 Table 4)
  conductor_od_in  in   conductor outside diameter (NEC Ch. 9 Table 5)
  n_conductors     -    number of conductors (jam check applies at exactly 3)

ratio = conduit_id_in / conductor_od_in
jam_prone = (n_conductors == 3) AND (2.8 <= ratio <= 3.2)
```

**Pinned worked example (three 0.65 in conductors in 2 in EMT, ID 2.067).** `ratio = 2.067/0.65 = 3.18`, inside the
`2.8 to 3.2` band with three conductors -> **jam-prone**; plan the pull carefully or upsize the conduit. **Cross-check (a
ratio just outside the band).** Three `0.5 in` conductors in a 1-1/4 in conduit (`ID = 1.61`): `ratio = 1.61/0.5 = 3.22`,
just above 3.2 -> **not jam-prone**. And a two-conductor pull at the same 3.18 ratio is not flagged, since triangulation
jamming needs three -- the count matters as much as the ratio. The non-finite and non-positive error paths bracket the
result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, matching `conduit-fill`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the NEC Chapter 9 jam concern, `editionNote` naming the jam ratio, the
2.8 to 3.2 band, the Table 4/Table 5 diameters, and the three-conductor, separate-from-fill caveats);
`test/fixtures/worked-examples.json` (the jam-prone example + the just-clear cross-check); `test/fixtures/compute-map.js`
(`conduit-jam-ratio` -> `computeConduitJamRatio` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (->
`conduit-fill` / `pulling-tension` / `cable-bend-radius` / `min-bend-radius`); `data/search/aliases.json` ("conduit jam
ratio", "conductor jamming", "three conductors jam", "jam ratio conduit", "NEC jamming", "cable jam in bend", "wire pull
jam", "conduit ID conductor OD", "jam probability conduit"); the id appended to the existing electrical renderers block in
`app.js`; the `// dims:` annotation (diameters length, ratio dimensionless); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the 2.8 to 3.2 band, the three-conductor condition, and the
non-positive / non-finite error seams. No new module; re-pin `calc-electrical.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the band and count assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `ratio` / jam-prone pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (2.067/0.65 -> 3.18, jam-prone).

## 5. Roadmap position

The 100th tile of the trades-only expansion campaign (v275..v374), and the last of the electrical raceway checks: with
`conduit-fill` (cross-sectional fit), `pulling-tension` (capstan tension and sidewall pressure), and now the jam ratio, the
three independent conduit-pull failure modes are all covered. A NEC Chapter 9 Table 4 conduit-ID and Table 5 conductor-OD
lookup, a jam-probability gradient rather than a hard band, and a chain into `pulling-tension` are the deliberate next
follow-ons once it lands.
