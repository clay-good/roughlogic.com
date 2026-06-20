# roughlogic.com Specification v106 -- Product Scope Charter: The Trades-Focus Doctrine and the Honesty / Legal Boundary (Standing Policy, No Catalog Change)

> **Status: ADOPTED 2026-06-20 as standing policy. This is a doctrine spec, not a tile
> landing.** v106 changes no tile, no module, and no count. It records *what roughlogic.com is
> and is not*, the test every future trade and tile must pass to enter the catalog, and the
> tier system that ranks where effort goes. It is the first scope-policy spec in the series;
> prior specs (spec.md through spec-v105.md) defined *what to build*, and v106 defines *what is
> in scope to build at all*. Its first consequence -- retiring four non-trade groups -- is
> specified separately in **spec-v107.md** so that the policy and the catalog change are
> reviewable independently.
>
> **Why now.** The catalog grew to 669 tiles across 25 groups, and four of those groups
> (Legal, Veterinary, EMS / Pre-hospital, Pilots / General Aviation) are not trades and carry
> the highest legal exposure and the lowest credibility return for the trades audience. The
> mission is to be the best US-based, fully honest, free, and legal field-math tool *for the
> building trades*. Breadth across unrelated professional and safety-of-life domains dilutes
> that mission and concentrates liability. v106 draws the line so the catalog cannot quietly
> re-overextend.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Mission

roughlogic.com is the fastest, best-cited, jurisdiction-aware on-ramp from a field question to
the answer an inspector, a manufacturer's chart, or the authority having jurisdiction (AHJ)
will accept -- for the US building trades. It is always free, account-free, ad-free,
telemetry-free, and offline-capable. It computes from public physics and public-domain data
and it never claims to be the authority. It is the index to the source of truth, not the
source of truth.

## 2. What roughlogic is and is not (the legal boundary)

These are bright lines, not aspirations. Every tile must stay on the permitted side.

**roughlogic MAY:**

- Compute from public physics and published formulas (Ohm's law, friction loss, Gay-Lussac,
  the fixed-orifice superheat approximation). Formulas and physical facts are not copyrightable
  or licensable.
- Cite a code section by number and edition and link to the free official text (for example
  `nfpa.org/freeaccess`, the eCFR, ASHRAE read-only). Short attributed quotation is fair use.
- Reproduce genuine government and public-domain data (eCFR, DOT, NWS, USGS, federal tables).
  US government works carry no copyright.
- Show the worked math so the user can defend the number to an AHJ.

**roughlogic MUST NOT:**

- Reproduce a copyrighted code table wholesale (NEC Table 310.16, ICC tables, ASHRAE tables).
  The *value* is a fact; the *table compilation* belongs to NFPA / ICC / ASHRAE. Cite and
  link; never mirror. Any bundled `data/` shard that is a verbatim copyrighted table is a
  defect to be replaced with a citation and a link.
- Be the record of a licensed professional act: a stamped Manual J for a permit, an engineered
  load or structural number that gets built to, a medical dosing decision, legal advice. Every
  such tile is a *check*, never the *stamp*, and says so.
- Imply "approved," "to code," or "compliant." The canonical framing is "math aid for
  verification; the AHJ / manufacturer / licensed professional governs." This phrasing is an
  asset and is never removed.

## 3. The honesty boundary

- Every tile carries a source stamp with publication and edition, and a limitation notice
  stating what the tile is *not*.
- Where an edition is cited, the AHJ-adopted edition governs and the tile says so. See the
  jurisdiction-awareness pillar in section 7.
- Provenance is public: derivations are documented and formula corrections are logged in the
  open (see the errata pillar in section 7). Visible corrections build more trust with skeptical
  tradesmen than any test-count badge.

## 4. The inclusion test (every future trade and tile must pass all four)

A candidate enters the catalog only if it passes every gate:

1. **Trades-aligned.** The user is a licensed or working US tradesperson in the building and
   field trades, not a doctor, lawyer, pilot, or other professional whose governing authority
   is a board, a court, or a federal safety regulator.
2. **Public-method.** The output is a deterministic function of public physics or
   public-domain data. No copyrighted table is reproduced; no licensed method is required to be
   embedded.
3. **AHJ / manufacturer governs.** The final authority is the AHJ, the manufacturer's spec, or
   the licensed tradesperson holding the final call -- not a professional of record whose
   error becomes roughlogic's liability.
4. **Defensible failure mode.** A wrong number causes a failed inspection or a redo, not death,
   injury, or unauthorized practice of a licensed profession (medicine, law, aviation
   command).

A candidate that fails gate 1 or gate 4 is out of scope regardless of how useful or
well-built it is. Usefulness is not the test; scope is.

## 5. The tier system

Tiers rank where effort and brand focus go. They do not change a tile's group letter.

- **Tier 1 (own these; go deep; the brand is built around them):** Electrical (A), Plumbing
  and Gas (B), HVAC (C), Carpentry and Construction (E), and the field-service benches within
  them. These are NEC / IPC / UPC / ACCA / AHRI / manufacturer anchored, AHJ-governed, and
  computed from public physics.
- **Tier 2 (legitimate trades; keep; lighter investment):** Water Damage and Mold Restoration
  (D), Fire-Ground Engineering (F, an edge-case keep -- see section 8), Cross-Trade Utilities
  (G), Knowledge References (H), Trucking and Logistics (J), Mechanic incl. auto / marine /
  aircraft maintenance (K), Agriculture and Forestry (L), Water and Wastewater Operations (M),
  Stage and Live Production (N), Historical Reference (Q), Rigging and Heavy Lift (Z), and the
  tradesperson's own shop math: Accounting / Tax / Small-Business (R -- a KEEP, see section 8).
- **Tier 3 (retired or frozen):** Legal (S), Veterinary (U), EMS and Pre-hospital (V), and
  Pilots / General Aviation (W) are **CUT** (section 6, executed in spec-v107). Kitchen and Food
  Service (O), Field / Backcountry / SAR (P), Bench Science and Laboratory (T), Real Estate (X),
  and Educators / K-12 (Y) are **FROZEN with salvage** (section 8, designed in spec-v108): their
  trade-useful tiles re-home into live groups and the remainder moves to the off-brand annex.

Note on group letters: existing letters are stable ids and are never reassigned. When a group
is retired its letter is retired with it; remaining groups keep their letters even though the
A..Z sequence then has gaps. Aircraft *maintenance* (an A&P mechanic trade) stays under
Mechanic (K); the retired aviation group (W) is *pilot / flight operations* content, which
fails inclusion gate 1. Disposition follows the inclusion test, not the group a tile sits in:
the `weight-balance` (Aircraft Weight and Balance) tile is filed under Mechanic (K) but is
pilot flight-ops content and is CUT with the aviation group (spec-v107 §2.1).

### 5.1 The three dispositions: CUT, FREEZE, KEEP

A group or tile that fails the inclusion test is not automatically deleted. The disposition
depends on *why* it fails:

- **CUT (remove from the codebase entirely).** Reserved for real liability: a failure mode of
  death, injury, or unauthorized practice of a licensed profession (gate 4), or no plausible
  trade connection at all. The four retired groups (section 6) and the stray flight-ops tile are
  CUTs because they carry liability, not merely because they are off-brand.
- **FREEZE (keep live, stop investing, move off the trades index).** For groups that are simply
  off-brand -- they fail gate 1 (not a trade) but carry no harm or UPL liability. Freezing moves
  them into a clearly-labeled **off-brand annex**: a general / allied-tools wing reachable by
  direct link and search, absent from the trades home browse-by-trade index, and visually
  separated. This honors work already invested and protects the trades brand without deleting
  working, correct tools. A frozen tile gets no further feature work.
- **SALVAGE (re-home into a live trades group, then freeze the remainder).** Off-brand groups
  often contain individual tiles that *are* trade-useful. Before a group is frozen, its
  salvageable tiles migrate into an existing live trades group so they stay first-class; only the
  genuinely off-brand remainder is frozen. Salvage keeps the brand clean *and* recovers the value
  of the cut work.
- **KEEP.** The group passes the inclusion test, or is run by the tradesperson themselves (the
  small-business case).

Counting note: a CUT tile leaves the catalog and lowers the gate-anchored tile / group / module
/ sitemap counts. A FROZEN tile stays live in the annex, so the count model must distinguish the
**trades catalog** (the home index) from the **total live catalog** (trades plus annex). The
exact gate wiring for that split is an execution detail deferred to the relevant landing spec;
the doctrine here is only that freezing removes a group from the trades-facing surface without
deleting it.

## 6. Decisions recorded -- NOT DOING (CUT)

The following are out of scope and are being removed from the codebase and the website
entirely. Each fails the inclusion test as noted.

| Group | Name | Fails | Reason |
|---|---|---|---|
| S | Legal Plain-English and Statutory Math | Gate 1, Gate 4 | Not a trade. Court deadlines, garnishment, and statute math risk unauthorized practice of law (UPL), which is regulated state by state. The governing authority is a court, not an AHJ. |
| U | Veterinary | Gate 1, Gate 4 | Not a trade. Dosing and fluid-plan errors cause animal harm and product-liability exposure; the governing authority is a licensed veterinarian. |
| V | EMS and Pre-hospital | Gate 1, Gate 4 | Not a trade. Dosing, triage, and pediatric-tube-depth errors cause patient harm; the governing authority is a medical director, not an AHJ. |
| W | Pilots and General Aviation | Gate 1, Gate 4 | Not a trade. Weight-and-balance and performance numbers are safety-of-life under the FAA; the governing authority is the pilot in command and the FAA. |

The complete removal -- every tile, module, registry, gate count, and prerendered URL -- is
specified in **spec-v107.md**. v106 records the decision; v107 executes it.

## 7. Roadmap pillars -- getting as close to the source of truth as is legal

These are the accepted directions for making roughlogic the closest legal thing to the
authority. Each becomes its own implementation spec when designed; v106 records them as
committed direction, not yet as detailed specs.

1. **Jurisdiction / edition awareness (highest leverage).** The user sets their state once;
   every code-anchored tile reports which edition that state has actually adopted (NEC adoption
   ranges from 2017 to 2023 by state) and flags when the answer would differ across editions.
   Pure public data, zero copyright exposure. This is the single feature that turns "a
   calculator" into "the closest legal thing to the source of truth," because it meets the user
   at *their enforced code*.
2. **Official free-source deep links at the point of answer.** Every citation links to the
   free official text (NFPA free access, eCFR, ASHRAE read-only). Extends the existing
   `nfpa.org/freeaccess` and eCFR references to a clickable per-tile link.
3. **Worked-math transparency.** An expandable "show the steps" on every tile so the number is
   defensible to an inspector on the spot.
4. **Annex-example verification, displayed.** Where a code ships a worked example (for example
   NEC Annex D), the tile shows "matches NEC Annex D Dx" so the user can trust the method.
5. **Feedback channel (request a tool / report a wrong number).** A dead-simple, no-tracking,
   no-account channel (a mailto or a static public board). Fixes the blind spot created by
   having no telemetry: it is how coverage gets aimed at real demand and how errors get caught.
6. **Public errata log.** An open record of every formula correction. Integrity over a
   perfection claim.

## 8. Resolved dispositions for the remaining edge groups

The groups that sat near the scope edge have been reviewed against the inclusion test (section
4) and resolved per the three dispositions (section 5.1). The detailed tile-level plan -- which
tiles salvage, where they re-home, and what the annex looks like -- is designed in
**spec-v108.md**. This section records the decisions; v108 is the design; a later pass executes.

- **R -- Accounting / Tax / Small-Business: KEEP.** A tradesperson is the small-business owner;
  markup-vs-margin, breakeven, loan amortization, mileage, payroll, and prime cost are shop math
  at the center of the trade. The group passes inclusion via the owner-operator reading of gate
  1. Discipline note: the IRS-form tiles (Schedule SE, Quarterly Estimated Tax, MACRS, Section
  179, Home-Office Deduction) brush the regulated-practice edge that retired Legal. They stay,
  but are held to "estimate; your CPA and the IRS govern," the tax analog of "the AHJ governs."
  Tax math is not UPL the way legal advice is, and the disclaimer pattern is sufficient.

- **F -- Fire-Ground Engineering: KEEP (edge case, eyes open).** By the strict test it fails gate
  1 (firefighter, not a building trade) and gate 4 (safety-of-life). It is kept anyway because
  the content is clean public hydraulics (friction loss, pump discharge, hydrant flow, NFPA
  1142 / 14, K-factor) and, unlike EMS dosing, the pump operator is the trained person doing the
  math live and owning the call -- closer to how a tradesperson owns a number than to a patient
  passively bearing a dosing error. It carries the strongest "incident command governs" framing.
  This is the one documented override of the test; a future maintainer may revisit it.

- **O -- Kitchen / Food Service: FREEZE.** Restaurant operations (plate cost, recipe scaling,
  prime cost), not a building trade. The food-safety tiles (Sous-Vide Pasteurization, Food Safety
  Cooling Curve, Brine / Cure Concentration) carry a mild foodborne-illness failure mode and are
  **CUT** rather than frozen; the operations tiles freeze to the annex.

- **P -- Field / Backcountry / SAR: SALVAGE then FREEZE.** The surveying and navigation tiles
  (magnetic declination, UTM / lat-lon, area by coordinates, traverse closure, pacing) salvage
  into the existing Survey trade; the backcountry / SAR safety tiles (avalanche, lightning 30-30,
  Naismith, search probability) freeze to the annex.

- **T -- Bench Science / Laboratory: SALVAGE then FREEZE.** The general chemistry tiles (molarity
  and dilution, molecular weight, Beer-Lambert, Henderson-Hasselbalch) salvage into Water and
  Wastewater Operations (M), where operators genuinely use them; the molecular-biology tiles (PCR
  master mix, OD600, hemocytometer, primer Tm, agarose gel, CFU, resuspension) freeze to the
  annex.

- **X -- Real Estate: FREEZE.** Realtor / lender / investor finance (LTV, DTI, PITI, cap rate,
  commission split, loan limits, HUD FMR, 1031). No safety liability, but the strongest
  brand-dilution signal to a tradesperson after the four cuts. Freezes wholesale; a later spec
  may revisit a full CUT.

- **Y -- Educators / K-12: SALVAGE then FREEZE.** The gradebook and teaching tiles (GPA, Lexile,
  grade-curve, final-exam-needed, readability) freeze to the annex; the genuinely general
  utilities (number-base converter, quadratic formula, significant figures, scientific notation)
  salvage into Cross-Trade Utilities (G), where a tradesperson may actually reach for them.
