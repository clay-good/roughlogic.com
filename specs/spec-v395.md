# roughlogic.com Specification v395 -- Crack-Control Bar Spacing (ACI 318-19 24.3.2) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the concrete design-details trio (v393 T-beam flange ->
> v394 minimum flexural steel -> v395 crack-control spacing). The catalog develops and splices bars (`rc-development-length`,
> `rebar-lap-splice`) but never checks the serviceability rule that limits how far apart tension bars can sit to keep flexural
> cracks tight.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Widely spaced tension bars let flexural cracks open;
> ACI 318-19 §24.3.2 caps the center-to-center spacing of the closest tension reinforcement at
> `s = 15*(40000/fs) - 2.5*cc`, but not more than `12*(40000/fs)`, where `fs` is the service-load steel stress (permitted as
> `2/3*fy`) and `cc` is the clear cover to the bar. Nothing in the catalog does this crack-control check. This adds the
> spacing tile to the existing **`calc-concrete.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md
> through spec-v394.md.
>
> **The gap, and the evidence for it.** For Grade 60 steel at the permitted service stress `fs = 2/3*60000 = 40000 psi` and
> `2 in` clear cover, `s = 15*(40000/40000) - 2.5*2 = 15 - 5 = 10 in`, and the `12*(40000/40000) = 12 in` cap does not
> govern, so the maximum spacing is `10 in`. Increase the cover to `3 in` and the spacing tightens to
> `15 - 2.5*3 = 7.5 in` -- more cover means bars must sit closer to hold the crack. No tile does this; a detailer had to
> apply the two limits by hand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The service steel stress `fs`
is a pressure (psi); the clear cover `cc` is a length (in); the maximum spacing is a length (in). The v18/v21 contract: any
non-finite input, or a non-positive `fs` or negative cover, returns `{ error }`; `fs` defaults to `2/3*fy` when a yield
strength is entered instead, the governing spacing is the lesser of the two limits, and a computed spacing at or below zero
(very high stress and cover) is flagged as requiring a redesign. Citation discipline (v19/v22): `GOVERNANCE.general` over
the ACI crack-control spacing by name; `editionNote` names **ACI 318-19 §24.3.2, `s = 15*(40000/fs) - 2.5*cc` not greater
than `12*(40000/fs)`, `fs` the service-load stress (permitted `2/3*fy`), `cc` the least clear cover to the tension bar, and
`40000` the reference stress in psi**, and states that **this returns the maximum center-to-center spacing of the closest
tension bars for flexural crack control, that it is a serviceability limit (strength and minimum-steel checks are separate),
and that it is a design aid, not a substitute for the engineer of record**.

## 2. The tile

### 2.1 `concrete-crack-control-spacing` -- Crack-Control Bar Spacing (ACI 318-19)

```
inputs:
  fs_psi   psi   service-load steel stress (default 2/3*fy)
  cc_in    in    clear cover to the tension bar

s1   = 15*(40000/fs_psi) - 2.5*cc_in
s2   = 12*(40000/fs_psi)
s_max = min(s1, s2)     in
```

**Pinned worked example (fs 40000 psi, cc 2 in).** `s1 = 15*(40000/40000) - 2.5*2 = 15 - 5 = 10 in`;
`s2 = 12*(40000/40000) = 12 in`; the first governs, `s_max = 10 in`. **Cross-check (more cover, tighter spacing).** At
`cc = 3 in`, `s1 = 15 - 7.5 = 7.5 in` (still below the 12 in cap), so `s_max = 7.5 in`. A non-positive `fs` or a spacing
that drops to zero takes the error/redesign path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete"]`, beside `rc-development-length` / `rebar-lap-splice`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, ACI 318-19 §24.3.2, `editionNote` naming
`s = 15*(40000/fs) - 2.5*cc <= 12*(40000/fs)`, the `fs = 2/3*fy` default, and the cover definition);
`test/fixtures/worked-examples.json` (the 2 in-cover example + the 3 in-cover cross-check); `test/fixtures/compute-map.js`
(`concrete-crack-control-spacing` -> `computeConcreteCrackControlSpacing` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `concrete-beam-min-flexural-steel` / `rc-development-length` / `rebar-lap-splice` /
`concrete-shrinkage-temperature-steel`); `data/search/aliases.json` ("crack control spacing", "bar spacing crack", "maximum
bar spacing", "aci 24.3.2", "15 40000 fs", "flexural crack control", "tension bar spacing", "crack width spacing", "service
stress spacing"); the id appended to the existing concrete renderers block in `app.js`; the `// dims:` annotation (fs
pressure, cover/spacing length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the governing-limit switch, and the non-positive / non-finite error seams. No new module; re-pin `calc-concrete.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the governing-limit assertion, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `s_max` / governing-limit output
wraps on a phone); render-no-nan + a11y sweep, output read to the value (fs 40000, cc 2 -> 10 in).

## 5. Roadmap position

Closes the concrete design-details trio: v393 sizes the flange, v394 the minimum steel, and v395 the bar layout that keeps
cracks tight. An ACI 224.1R / Gergely-Lutz crack-width estimate is the deliberate next follow-on.
