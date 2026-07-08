# roughlogic.com Specification v479 -- Sprinkler Pressure Demand at the Base of Riser (NFPA 13) (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter, and the sprinkler-demand follow-on the v249 tile's
> own citation named ("a full hydraulic calculation to the most-remote area including friction and elevation yields the
> governing demand and is a separate analysis") -- spec-v249 §5 defers it explicitly as the "most-remote-area hydraulic
> calculation with Hazen-Williams friction and elevation." Adds one tile to **`calc-firesprinkler.js`** (Group F); no new
> module, group, or dependency. Inherits spec.md through spec-v478.md.
>
> **The gap, and the evidence for it.** The catalog already turns the discharge density into a screening water supply
> (`sprinkler-system-demand`: gpm and stored gallons), lays out the heads (`sprinkler-head-layout`), solves one head's
> flow-vs-pressure (`sprinkler-k-factor`, `Q = K sqrt(P)`), and checks the pump that feeds the riser (`fire-pump-curve`).
> What it has never had is the number that ties them together: the **pressure** the water supply must deliver at the
> base of the riser to drive the hydraulically most remote sprinkler. That is a single published assembly of three
> familiar pieces -- the K-factor start pressure at the end head, the NFPA 13 Hazen-Williams friction the flow loses
> travelling back to the riser, and the elevation head to lift the water to the sprinkler. NFPA 13 prints the friction
> loss verbatim as `p = 4.52 Q^1.85 / (C^1.85 d^4.87)` psi per foot (Q in gpm, d the actual internal diameter in inches,
> C the Hazen-Williams roughness -- 120 for black or galvanized steel, 150 for copper or listed CPVC, 100 for old
> unlined cast iron), and elevation as 0.433 psi per foot of water. This tile assembles one representative flowing path;
> a full stamped design balances every node, branch, and grid loop in the remote area, which stays the fire-protection
> engineer's hydraulic model.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flows are volumetric
rates (`L^3 T^-1`), the pressures are pressures (`M L^-1 T^-2`), the diameter and the equivalent length and the
elevation are lengths (`L`), and the K-factor and the Hazen-Williams C annotate `dimensionless` (following the existing
`sprinkler-k-factor` precedent, which keeps the mixed gpm/psi^0.5 and roughness terms off the SI base-unit lint rather
than carrying half-powers). The v18/v21 contract: any non-finite input, a non-positive head flow, K-factor, total flow,
pipe diameter, or Hazen-Williams C, or a negative equivalent length returns `{ error }`; the elevation is signed (a
remote head below the base of riser is a legal negative) and so is not sign-guarded. Citation discipline (v19/v22):
`GOVERNANCE.general` over the assembly by name; `editionNote` names **NFPA 13 (Standard for the Installation of
Sprinkler Systems), 2022**, prints the Hazen-Williams friction `p = 4.52 Q^1.85 / (C^1.85 d^4.87)` psi/ft, the
elevation 0.433 psi/ft, and the K-factor start pressure `P1 = (Q_head / K)^2`, and states that **the C defaults are the
NFPA 13 pipe-type values (120 steel, 150 copper/CPVC, 100 old cast iron), the equivalent length is the actual pipe run
plus the fitting-and-valve equivalents from the NFPA 13 fitting table, the 7 psi minimum operating pressure at the end
sprinkler is the standard-spray floor the tile flags but does not enforce, and the result is a single representative
flowing path -- a full stamped design balances every node and grid loop in the remote area** -- a sizing aid, not a
stamped hydraulic submittal; a qualified fire-protection engineer and the AHJ govern.

## 2. The tile

### 2.1 `sprinkler-pressure-demand` -- The Base-of-Riser Pressure the Remote Sprinkler Implies

```
inputs:
  q_head_gpm       gpm            flow at the hydraulically most remote sprinkler
  k_factor         gpm/psi^0.5    that sprinkler's K-factor (5.6 standard 1/2 in orifice, 8.0 large-orifice, 11.2/14.0 ESFR)
  q_total_gpm      gpm            total flow carried through the governing run to the base of riser (>= q_head)
  pipe_id_in       in             internal diameter of the governing run (actual, not nominal)
  c_factor         -              Hazen-Williams C (120 steel, 150 copper/CPVC, 100 old cast iron)
  equiv_length_ft  ft             total equivalent length: actual pipe + fitting/valve equivalents
  elevation_ft     ft             elevation of the remote head above the base of riser (negative if below)

P1        = (q_head_gpm / k_factor)^2                                  [psi, K-factor discharge relation]
pf        = 4.52 x q_total_gpm^1.85 / (c_factor^1.85 x pipe_id_in^4.87) [psi/ft, NFPA 13 Hazen-Williams]
friction  = pf x equiv_length_ft                                       [psi]
elev      = 0.433 x elevation_ft                                       [psi]
P_bor     = P1 + friction + elev                                       [psi, demand at the base of riser]
flag: P1 < 7 psi  -> below the NFPA 13 standard-spray minimum operating pressure
```

**Pinned worked example (Ordinary Hazard Group 2 remote area, steel main).** Most remote head flowing 26 gpm through a
K = 5.6 sprinkler: `P1 = (26 / 5.6)^2 = ` **21.56 psi** (above the 7 psi floor). The remote area's 260 gpm travels back
through 150 equivalent feet of 3 in Schedule 40 steel (internal diameter 3.068 in, C = 120):
`pf = 4.52 x 260^1.85 / (120^1.85 x 3.068^4.87) = ` **0.0804 psi/ft**, so `friction = 0.0804 x 150 = ` **12.06 psi**.
The head sits 15 ft above the base of riser: `elev = 0.433 x 15 = ` **6.50 psi**. Demand at the base of riser:
`P_bor = 21.56 + 12.06 + 6.50 = ` **40.11 psi at 260 gpm** -- the point that must fall under the water-supply curve (and
under the `fire-pump-curve` rated point). **Cross-check (the same run in listed CPVC).** Nothing changes but the
roughness, C = 150: the smoother pipe cuts the friction to `pf = 0.0529 psi/ft`, `friction = 7.98 psi`, and the demand
drops to **36.03 psi** -- the ~4 psi the pipe material is worth on this run, and why the C-factor is a design lever, not
a constant.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the OH2 steel example + the CPVC
cross-check); `test/fixtures/compute-map.js` (`sprinkler-pressure-demand` -> `computeSprinklerPressureDemand` in
`../../calc-firesprinkler.js`); `scripts/related-tiles.mjs` (-> `sprinkler-system-demand` / `sprinkler-k-factor` /
`fire-pump-curve`); `data/search/aliases.json` ("base of riser", "sprinkler pressure demand", "hydraulic calculation",
"hazen williams sprinkler", "most remote sprinkler", "friction loss sprinkler", "sprinkler system pressure",
"nfpa 13 hydraulic"); the id appended to the firesprinkler renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the below-7-psi flag, the
signed (negative) elevation path, and the error seams (non-finite, q_head / K / q_total / pipe_id / C <= 0, negative
equiv length). Uses the module's existing `_simpleRenderer` factory (all-number fields). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the start / friction / elevation / demand stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the OH2 example -> 40.11 psi at 260 gpm).

## 5. Roadmap position

Closes the fire-sprinkler bench's open pressure question: `sprinkler-system-demand` gives the gpm and the gallons,
`fire-pump-curve` gives the pump that must cover them, and this tile gives the pressure at the base of riser those two
have to meet -- the three now read as one water-supply story. A multi-segment path builder (a fitting-equivalent-length
table and a node-by-node schedule) and an available-vs-required supply-curve plot are deliberate future follow-ons;
those stay the fire-protection engineer's stamped hydraulic model. Further Group F growth stays evidence-driven.
