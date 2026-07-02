# roughlogic.com Specification v270 -- Reinforced CMU Shear Wall In-Plane Allowable Shear (TMS 402 ASD, Fvm + Fvs) (calc-masonry.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v269..v271 (the TMS 402-16 reinforced-masonry member trio -- flexure /
> shear / axial for a reinforced CMU wall). This spec is the middle limit state: the same wall the flexure tile (v269)
> bends out-of-plane is, in the building's lateral system, a shear wall taking wind or seismic in-plane, and this tile
> resolves how much of that in-plane shear it carries.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: masonry is a first-class trade, and the catalog now
> resolves the out-of-plane moment of a reinforced CMU wall (`cmu-wall-flexure`, v269) but nothing tells the designer how
> much *in-plane* shear that wall carries as part of the lateral-force-resisting system. The catalog computes an ASCE 7
> seismic base shear (`seismic-base-shear`) but has no member to hand that shear to on the masonry side. Adds one tile to
> the **`calc-masonry.js`** Group E cluster (opened by v269); no new group, trade, or dependency. Inherits spec.md through
> spec-v269.md.
>
> **The gap, and the evidence for it.** A masonry shear wall resists in-plane lateral force with two mechanisms working
> together: the masonry itself (a diagonal-tension / shear-friction contribution that grows with axial compression and
> shrinks as the wall gets tall and slender), and the horizontal shear reinforcement crossing the crack. TMS 402
> allowable-stress design sums them as allowable shear stresses:
> `Fvm = 0.5 [ (4.0 - 1.75 (M/(Vdv))) sqrt(f'm) ] + 0.25 (P/An)` for the masonry and
> `Fvs = 0.5 (Av Fs dv) / (An s)` for the reinforcement, with the total `Fv = Fvm + Fvs` capped by a maximum that itself
> depends on the shear-span ratio `M/(Vdv)` -- `3 sqrt(f'm)` for a squat wall (`M/(Vdv) <= 0.25`), `2 sqrt(f'm)` for a
> slender one (`M/(Vdv) >= 1.0`), linear between. The allowable in-plane shear force is then `Fv An`. For an 8 in fully
> grouted 8 ft wall (`f'm = 1,500 psi`) under `20 kip` of axial load with #4 horizontal bars at 48 in, at a mid-range
> shear-span ratio of `0.5`, that works out to about `76 psi` allowable shear stress and roughly `56 kip` of allowable
> in-plane shear -- the number a designer compares against the story shear the wall picks up, and one that no one wants to
> assemble by hand from three stress terms and an interpolated cap at a plan-check desk. `seismic-base-shear` produces the
> demand; this tile produces the capacity it is checked against.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specified masonry
strength `f'm`, the allowable steel stress `Fs`, and the resulting allowable stresses `Fvm`, `Fvs`, `Fv`, and the cap
`Fv_max` are stresses (psi); the wall net thickness `b`, the shear depth `dv` (wall length in the direction of shear), and
the horizontal-bar spacing `s` are lengths (in); the net shear area `An = b dv` is an area (in^2); the horizontal bar area
`Av` is an area (in^2); the axial load `P` is a force (lb); the shear-span ratio `M/(Vdv)` is dimensionless (input
directly, taken as a non-negative magnitude); the allowable shear force `Va = Fv An` is a force (reported kip, computed
lb). The v18/v21 contract: any non-finite input, a masonry strength, thickness, shear depth, or bar spacing at or below
zero, a negative axial load or negative shear-reinforcement area, or a negative shear-span ratio, returns `{ error }`; the
shear-span ratio `M/(Vdv)` is clamped to `<= 1.0` inside the `Fvm` term per the code (values above 1.0 use 1.0), while the
cap interpolation uses the raw ratio. Citation discipline (v19/v22): `GOVERNANCE.general` over the TMS 402 ASD masonry-
shear method by name; `editionNote` names **the TMS 402-16 (ACI 530 / ASCE 5) allowable-stress in-plane shear provisions:
`Fvm = 0.5[(4.0 - 1.75(M/(Vdv))) sqrt(f'm)] + 0.25(P/An)` with `M/(Vdv)` taken positive and not greater than 1.0,
`Fvs = 0.5 (Av Fs dv)/(An s)`, the combined `Fv = Fvm + Fvs`, and the maximum `Fv` cap of `3 sqrt(f'm)` at
`M/(Vdv) <= 0.25` grading linearly to `2 sqrt(f'm)` at `M/(Vdv) >= 1.0`, as compiled in the Masonry Designers' Guide and
CMHA TEK 14-07C**, defaults `f'm` to **1,500 psi**, `Fs` to **32,000 psi (Grade 60)**, and the shear-span ratio to
**0.5**, and states that **this returns the allowable service-level in-plane shear of a reinforced, fully grouted masonry
shear wall by the allowable-stress method -- the axial `P` is the sustained gravity compression (a larger `P` raises the
masonry term, so use the load combination that actually acts with the shear), `M/(Vdv)` is the shear-span ratio the
designer supplies from the wall's height and length, the special-reinforced detailing and minimum-reinforcement rules of
TMS 402 are the engineer's to satisfy separately, and this is a design aid, not a substitute for the engineer of record's
stamped lateral design** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `cmu-shear-wall` -- Reinforced CMU Shear Wall In-Plane Allowable Shear (TMS 402 ASD)

```
inputs:
  fm_psi     psi   specified masonry compressive strength f'm (default 1500)
  b_in       in    net wall thickness (fully grouted actual width)
  dv_in      in    shear depth dv (wall length in the direction of shear)
  p_lb       lb    sustained axial compression P on the wall (default 0)
  mvd        -     shear-span ratio M/(Vdv), non-negative (default 0.5)
  av_in2     in2   horizontal shear-reinforcement bar area Av (default 0)
  s_in       in    horizontal bar spacing s (default 48)
  fs_psi     psi   allowable steel stress Fs (default 32000, Grade 60)

An      = b_in * dv_in                                   ; net shear area, in^2
root    = sqrt(fm_psi)                                   ; sqrt(f'm), psi^0.5
mvd_c   = min(mvd, 1.0)                                  ; clamp inside the masonry term
Fvm     = 0.5*((4.0 - 1.75*mvd_c) * root) + 0.25*(p_lb/An)   ; masonry allowable shear stress, psi
Fvs     = (av_in2 > 0) ? 0.5 * (av_in2 * fs_psi * dv_in) / (An * s_in) : 0   ; reinforcement, psi
Fv      = Fvm + Fvs                                      ; combined allowable shear stress, psi
; maximum allowable Fv, interpolated on the raw shear-span ratio
Fv_max  = (mvd <= 0.25) ? 3*root
        : (mvd >= 1.0)  ? 2*root
        : (3 - (mvd - 0.25)/0.75) * root
Fv_gov  = min(Fv, Fv_max)                                ; governing allowable shear stress, psi
Va_lb   = Fv_gov * An                                    ; allowable in-plane shear force, lb
Va_kip  = Va_lb / 1000
capped  = (Fv > Fv_max)                                  ; true when the max-Fv cap governs
```

**Pinned worked example (an 8 in fully grouted 8 ft wall, f'm = 1,500 psi, #4 horizontals at 48 in, 20 kip axial).**
`b = 7.625 in`, `dv = 96 in`, so `An = 732 in^2`; `P = 20,000 lb`; `M/(Vdv) = 0.5`; `Av = 0.20 in^2`, `s = 48 in`,
`Fs = 32,000 psi`. `root = sqrt(1,500) = 38.73`. Masonry term: `mvd_c = 0.5`, so
`Fvm = 0.5 x ((4.0 - 1.75 x 0.5) x 38.73) + 0.25 x (20,000/732) = 0.5 x (3.125 x 38.73) + 0.25 x 27.32 = 60.52 + 6.83 =
67.35 psi`. Reinforcement: `Fvs = 0.5 x (0.20 x 32,000 x 96) / (732 x 48) = 0.5 x 614,400 / 35,136 = 8.74 psi`. Combined
`Fv = 67.35 + 8.74 = 76.09 psi`. Cap at `M/(Vdv) = 0.5`: `Fv_max = (3 - (0.5 - 0.25)/0.75) x 38.73 = (3 - 0.3333) x 38.73
= 103.3 psi`, so `Fv = 76.09 < 103.3` -- not capped. Allowable shear `Va = 76.09 x 732 = 55,700 lb = ` **55.7 kip**.
**Cross-check (drop the axial to zero and go slender, M/(Vdv) = 1.0).** Hold the geometry and reinforcement, set `P = 0`
and `M/(Vdv) = 1.0`: `Fvm = 0.5 x ((4.0 - 1.75) x 38.73) + 0 = 0.5 x (2.25 x 38.73) = 43.57 psi`; `Fvs = 8.74 psi`
(unchanged); `Fv = 52.31 psi`; cap `Fv_max = 2 x 38.73 = 77.46 psi`, so still uncapped; `Va = 52.31 x 732 = 38,290 lb = `
**38.3 kip**. Losing the axial compression and stretching the shear span both cut the masonry contribution, and the
allowable shear falls as expected. A third seam -- push `Av` up so `Fv` exceeds `Fv_max` -- exercises the `capped = true`
branch. The non-finite, `fm_psi <= 0`, `b_in <= 0`, `dv_in <= 0`, `s_in <= 0`, `p_lb < 0`, `av_in2 < 0`, and `mvd < 0`
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the TMS 402 ASD in-plane shear provisions, `editionNote` naming `Fvm`, `Fvs`, the combined
`Fv`, the `M/(Vdv)`-graded `3 sqrt(f'm)` to `2 sqrt(f'm)` cap, the Masonry Designers' Guide / CMHA TEK 14-07C compilation,
and the sustained-axial, shear-span-input, special-detailing-separate, and design-aid caveats);
`test/fixtures/worked-examples.json` (the 20 kip / `M/(Vdv) = 0.5` example + the zero-axial / `M/(Vdv) = 1.0` cross-check);
`test/fixtures/compute-map.js` (`cmu-shear-wall` -> `computeCmuShearWall` in `../../calc-masonry.js`);
`scripts/related-tiles.mjs` (-> `cmu-wall-flexure` / `cmu-wall-axial` / `seismic-base-shear` / `cmu-grout-volume`);
`data/search/aliases.json` ("masonry shear wall", "CMU shear capacity", "TMS 402 shear", "Fvm Fvs masonry", "allowable
shear masonry wall", "in-plane shear block wall", "shear span ratio masonry", "how much shear can a block wall take",
"lateral force masonry wall"); the id appended to the `MASONRY_RENDERERS["cmu-shear-wall"]=` block at the file end of
`app.js`'s masonry bundle; the `// dims:` annotation (`fm_psi`/`fs_psi` pressure, `b_in`/`dv_in`/`s_in` length,
`av_in2` area, `p_lb` force, `mvd` dimensionless, `Va` force); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `Fvm`/`Fvs`/`Fv`/`Fv_max` intermediates, the `capped` branch, the
`mvd` clamp inside `Fvm`, and the eight error seams. Bump the `calc-masonry.js` size in the `check:module-sizes` allowlist
if the gate flags it (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the eight error paths, the `capped` and `mvd`-clamp assertions); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Fvm` / `Fvs` / `Fv` /
`Fv_max` / `Va` stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (8 ft wall, 20 kip axial,
M/(Vdv) 0.5 -> 76 psi, 55.7 kip allowable shear).

## 5. Roadmap position

The middle member of the TMS 402-16 reinforced-masonry batch (v269..v271): out-of-plane flexure was v269, this is the
in-plane shear-wall check, and the allowable axial-compression check is v271. It is the masonry limit state that the
existing `seismic-base-shear` demand ultimately lands on. A shear-friction sliding check at the wall base, a boundary-
element / special-reinforced detailing helper, and a strength-design (LRFD) shear companion are the deliberate next
follow-ons once the trio lands; with the batch complete the masonry cluster stands beside the steel-member,
reinforced-concrete, and geotechnical clusters in Group E.
