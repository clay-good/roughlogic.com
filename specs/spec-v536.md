# roughlogic.com Specification v536 -- Michaelis-Menten Enzyme Kinetics (calc-lab.js, Group T, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lab.js`**
> (Group T, bench science and lab math); no new module, group, or dependency. Inherits spec.md through spec-v535.md.
>
> **The gap, and the evidence for it.** The lab bench has `beer-lambert` and `linear-regression` but no enzyme-kinetics
> tile, and the Michaelis-Menten equation is the workhorse of biochemistry: it gives the reaction velocity at a
> substrate concentration from two constants, `Vmax` (the saturating rate) and `Km` (the Michaelis constant). The catch
> that trips students and techs is what `Km` means: it is the substrate concentration at **half** of Vmax, an affinity
> proxy, not a rate -- a **low** Km means **high** affinity. Two more points the tile makes explicit: the hyperbola
> never actually reaches Vmax, so "saturating substrate" is an approximation, and the equation assumes steady state with
> substrate far in excess of enzyme. The tile takes Vmax, Km, and the substrate concentration and returns the velocity,
> the percent of Vmax, and the affinity note -- or, given two velocity/substrate points, it solves back for Km and Vmax.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The maximum velocity and
the computed velocity are rates carried in the user's velocity units (`dimensionless` to the lint, as concentration-per-
time cancels against Vmax); the Michaelis constant and the substrate concentration are concentrations (carried in the
same units, so their ratio is `dimensionless`); the percent of Vmax is `dimensionless`. The v18/v21 contract: any non-
finite input, a non-positive Vmax or Km, or a negative substrate concentration returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the Michaelis-Menten relation by name (enzyme kinetics); `editionNote` names the
**Michaelis-Menten equation**, prints `v = Vmax x [S] / (Km + [S])` and `percent_vmax = v / Vmax x 100`, notes that at
`[S] = Km` the velocity is exactly half of Vmax, and states that **Km is the substrate concentration at half of Vmax (an
affinity proxy where a low Km means high affinity, not a rate), the hyperbola approaches but never reaches Vmax so
saturating substrate is an approximation, the equation assumes steady state with substrate far in excess of enzyme, and
the actual assay conditions govern** -- an analysis aid, not a validated kinetic assay.

## 2. The tile

### 2.1 `michaelis-menten` -- Velocity From Vmax and Km (and Why Km Is Not a Rate)

```
inputs:
  vmax          -     maximum velocity (saturating rate)
  km            -     Michaelis constant (substrate concentration at half Vmax)
  substrate     -     substrate concentration [S]

v            = vmax x substrate / (km + substrate)          [velocity units]
percent_vmax = v / vmax x 100                               [%]
at_half      = (substrate == km) -> v is exactly Vmax / 2
```

**Pinned worked example (Vmax = 100, Km = 25, at a substrate concentration equal to Km).** With `[S] = 25 = Km`,
`v = 100 x 25 / (25 + 25) = 100 x 0.5 = ` **50** -- exactly **half** of Vmax, the defining property of Km, and the
reason Km is read as an affinity marker rather than a speed. **Cross-check (four times Km still is not saturated).**
Raise the substrate to `[S] = 100` (4x Km): `v = 100 x 100 / (25 + 100) = 100 x 0.8 = ` **80** -- only **80% of Vmax**
even at four times Km, because the hyperbola only approaches Vmax asymptotically, which is why "saturating" substrate is
always an approximation. The tile returns the velocity, the percent of Vmax, and the half-Vmax note.

## 3. Wiring

A `tools-data.js` row (group `T`, trades `["lab"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the [S]=Km example + the 4x-Km
cross-check); `test/fixtures/compute-map.js` (`michaelis-menten` -> `computeMichaelisMenten` in `../../calc-lab.js`);
`scripts/related-tiles.mjs` (-> `beer-lambert` / `linear-regression` / `doubling-time`); `data/search/aliases.json`
("michaelis menten", "enzyme kinetics", "vmax km", "reaction velocity enzyme", "km affinity", "half vmax", "substrate
velocity", "enzyme rate"); the id appended to the lab renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the exact half-Vmax at
[S]=Km, the asymptotic approach to Vmax, and the error seams (non-finite, non-positive Vmax / Km, negative substrate).
Hand-writes its renderer (mirroring the calc-lab.js `beer-lambert` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the velocity / percent-Vmax stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the [S]=Km example -> 50, 50% Vmax).

## 5. Roadmap position

Adds enzyme kinetics to the lab bench beside `beer-lambert` and `linear-regression`. A Lineweaver-Burk / Eadie-Hofstee
two-point solver for Km and Vmax, and a competitive/uncompetitive inhibition variant (apparent Km and Vmax) are
deliberate future follow-ons. Further Group T growth stays evidence-driven.
