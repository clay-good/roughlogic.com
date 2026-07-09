# roughlogic.com Specification v517 -- ABYC E-11 Marine DC Wire Sizing (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v516.md.
>
> **The gap, and the evidence for it.** `voltage-drop` is an NEC one-way copper calculation, and a dockside NEC wire
> size undersizes on a boat for two reasons the tile makes explicit. First, ABYC E-11 sizes on the **round-trip** length
> (out and back), not the one-way run the NEC habit uses, so the same load and distance demand a larger conductor.
> Second, the marine allowable voltage drop is stricter for the circuits that matter: **3%** for panelboard feeders and
> navigation/critical loads, versus 10% for non-critical. On a low-voltage 12 V system a 3% drop is only 0.36 V of
> headroom, which drives the conductor up fast. The ABYC circular-mils relation, `CM = 10.75 x I x 2L / V_drop`, returns
> the copper cross-section, and the ABYC ampacity table (with its engine-space derate) sets a floor the drop number must
> also clear. The tile takes the load current, the one-way run, the system voltage, and the allowable drop, and returns
> the required circular mils and the AWG to pick -- the size that keeps nav gear and windlasses working at the end of a
> long run.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The load current is a
current (`I`); the one-way run length is a length (`L`, in feet); the system voltage and the allowable voltage drop are
`M L^2 T^-3 I^-1` (volts); the circular-mils result is an area (`L^2`, in the circular-mil convention, carried as
`dimensionless` since a circular mil is a defined unit); the drop percent and the `10.75` copper constant are
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive current, run length, or system voltage, or a
drop percent outside `(0, 100]` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the ABYC
sizing relation by name (ABYC E-11 AC & DC Electrical Systems on Boats); `editionNote` names the **ABYC E-11 DC wire
sizing (circular mils by voltage drop)**, prints `V_drop = drop_pct / 100 x system_voltage`,
`CM = 10.75 x current x (2 x length) / V_drop`, and the AWG selected as the smallest standard size with at least that
circular-mil area, and states that **the length is doubled for the round trip (out and back) unlike the NEC one-way
habit, 3% drop is required for panelboard feeders and navigation/critical loads (10% for non-critical), the ABYC
ampacity table with its engine-space and bundling derates sets a separate floor the drop size must also clear, and the
standard, the wire's temperature rating, and the installation govern** -- a design aid, not the ABYC standard itself.

## 2. The tile

### 2.1 `abyc-dc-wire` -- Why a Dockside NEC Wire Size Undersizes on a Boat

```
inputs:
  current_a         A     load current
  run_length_ft     ft    one-way run length (the tile doubles it)
  system_voltage_v  V     nominal system voltage (12 / 24 / 32)
  drop_pct          %     allowable voltage drop (3 critical / 10 non-critical)

V_drop_v = drop_pct / 100 x system_voltage_v                         [V]
CM       = 10.75 x current_a x (2 x run_length_ft) / V_drop_v        [circular mils]
awg      = smallest standard AWG with circular-mil area >= CM
```

**Pinned worked example (a 20 A nav feeder, 25 ft one-way, 12 V, 3% critical).** The allowable drop is
`0.03 x 12 = 0.36 V`, so the copper needed is `CM = 10.75 x 20 x (2 x 25) / 0.36 = 10,750 / 0.36 = ` **29,861 circular
mils**. The smallest AWG that meets it is **#4** (41,740 CM) -- #6 at 26,251 CM falls short -- a much heavier wire than
an NEC one-way 3% estimate would call, which is the whole point. **Cross-check (a non-critical load relaxes to 10%).**
Take the identical run as a 10% non-critical circuit: `V_drop = 1.2 V`, so `CM = 10,750 / 1.2 = ` **8,958 CM**, met by
**#10** (10,381 CM) -- three sizes smaller, because the allowable drop, not the ampacity, governed. The tile returns the
allowable drop, the required circular mils, and the AWG to pick.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 3% critical example + the 10%
non-critical cross-check); `test/fixtures/compute-map.js` (`abyc-dc-wire` -> `computeAbycDcWire` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `voltage-drop` / `anchor-rode-scope` / `wire-ampacity`);
`data/search/aliases.json` ("marine wire size", "abyc e-11", "boat dc wire", "12v wire gauge", "round trip voltage
drop", "3 percent drop marine", "circular mils marine", "nav feeder wire"); the id appended to the mechanic renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the round-trip length doubling, the AWG selection from circular mils, the 3%-vs-10% size shift,
and the error seams (non-finite, non-positive current / length / voltage, drop out of range). Hand-writes its renderer
(mirroring the calc-mechanic.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the drop / circular-mils / AWG stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 3% example -> 29,861 CM, #4 AWG).

## 5. Roadmap position

Adds marine DC wiring beside `voltage-drop` (the NEC one-way cousin) and the other Group K marine tiles. An ABYC-
ampacity-floor cross-check (whether the ampacity table drives a larger size than the drop), a bundling/engine-space
derate helper, and an AC-shore-power variant are deliberate future follow-ons. Further Group K growth stays evidence-
driven.
