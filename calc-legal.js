// Group S: Legal Plain-English and Statutory Math (utilities 246-254).
// See spec-v5.md section 2.2 / Step 59.
//
// Audience: small-business owner reading a contract, tenant reading a
// lease, paralegal verifying a deadline, self-represented litigant.
// All content is either statutory math from a public formula, a
// per-state parameters file sourced from the state's own published
// statutes, or an original plain-English summary written by the project
// author. No reproduction of bar-association practice guides. No
// "legal advice." Every Group S utility carries the v5 legal-information
// variant inline notice.
//
// State coverage in v5 starter: a working subset of states. Coverage
// expands quarterly per docs/data-sources.md recheck cadence.

import {
  DEBOUNCE_MS, debounce, makeNumber, makeSelect, makeText, makeTextarea,
  makeOutputLine, attachExampleButton, fmt,
} from "./ui-fields.js";
import { attachGlossaryTooltip } from "./v5-platform.js";

// --- Bundled per-state parameters ---
//
// data/legal/judgment-interest-rates.json
// Each entry: rate_pct, accrual ("simple" or "compound"), citation,
// verified_on. Starter coverage; expand quarterly.
export const JUDGMENT_INTEREST_RATES = {
  CA: { rate_pct: 10.0, accrual: "simple",   citation: "Cal. Civ. Proc. Code 685.010",            verified_on: "2025-01-15" },
  TX: { rate_pct: 5.00, accrual: "simple",   citation: "Tex. Fin. Code 304.003",                  verified_on: "2025-01-15" },
  NY: { rate_pct: 9.00, accrual: "simple",   citation: "N.Y. C.P.L.R. 5004",                      verified_on: "2025-01-15" },
  FL: { rate_pct: 7.97, accrual: "simple",   citation: "Fla. Stat. 55.03 (CFO-set, 2025)",        verified_on: "2025-01-15" },
  OH: { rate_pct: 8.00, accrual: "simple",   citation: "Ohio Rev. Code 1343.03 (2025)",           verified_on: "2025-01-15" },
  IL: { rate_pct: 9.00, accrual: "simple",   citation: "735 ILCS 5/2-1303",                       verified_on: "2025-01-15" },
  PA: { rate_pct: 6.00, accrual: "simple",   citation: "42 Pa.C.S. 8101",                         verified_on: "2025-01-15" },
  MA: { rate_pct: 12.0, accrual: "simple",   citation: "Mass. Gen. Laws ch. 231, 6B / 6C",        verified_on: "2025-01-15" },
  NJ: { rate_pct: 5.50, accrual: "simple",   citation: "N.J. Ct. R. 4:42-11 (Treasury-set)",      verified_on: "2025-01-15" },
  WA: { rate_pct: 12.0, accrual: "simple",   citation: "Wash. Rev. Code 4.56.110",                verified_on: "2025-01-15" },
  GA: { rate_pct: 7.00, accrual: "simple",   citation: "O.C.G.A. 7-4-12",                         verified_on: "2025-01-15" },
  CO: { rate_pct: 8.00, accrual: "compound", citation: "Colo. Rev. Stat. 5-12-102",               verified_on: "2025-01-15" },
  AZ: { rate_pct: 10.0, accrual: "simple",   citation: "Ariz. Rev. Stat. 44-1201",                verified_on: "2025-01-15" },
  MI: { rate_pct: 6.00, accrual: "compound", citation: "Mich. Comp. Laws 600.6013 (Treasury-set)", verified_on: "2025-01-15" },
  NC: { rate_pct: 8.00, accrual: "simple",   citation: "N.C. Gen. Stat. 24-1",                    verified_on: "2025-01-15" },
  VA: { rate_pct: 6.00, accrual: "simple",   citation: "Va. Code Ann. 6.2-302",                   verified_on: "2025-01-15" },
  MN: { rate_pct: 5.00, accrual: "simple",   citation: "Minn. Stat. 549.09 (judgment-rate adj.)", verified_on: "2025-01-15" },
  OR: { rate_pct: 9.00, accrual: "simple",   citation: "Or. Rev. Stat. 82.010",                   verified_on: "2025-01-15" },
  IN: { rate_pct: 8.00, accrual: "simple",   citation: "Ind. Code 24-4.6-1-101",                  verified_on: "2025-01-15" },
  TN: { rate_pct: 7.50, accrual: "simple",   citation: "Tenn. Code Ann. 47-14-121 (avg-prime+2)", verified_on: "2025-01-15" },
  MO: { rate_pct: 9.00, accrual: "simple",   citation: "Mo. Rev. Stat. 408.040",                  verified_on: "2025-01-15" },
  WI: { rate_pct: 4.50, accrual: "simple",   citation: "Wis. Stat. 814.04 (prime+1)",             verified_on: "2025-01-15" },
  MD: { rate_pct: 10.0, accrual: "simple",   citation: "Md. Code Ann., Cts. & Jud. Proc. 11-107", verified_on: "2025-01-15" },
  NV: { rate_pct: 7.00, accrual: "simple",   citation: "Nev. Rev. Stat. 17.130 (prime+2)",        verified_on: "2025-01-15" },
  AL: { rate_pct: 7.50, accrual: "simple",   citation: "Ala. Code 8-8-10",                        verified_on: "2025-01-15" },
  KY: { rate_pct: 6.00, accrual: "simple",   citation: "Ky. Rev. Stat. 360.040",                   verified_on: "2025-01-15" },
  SC: { rate_pct: 7.50, accrual: "simple",   citation: "S.C. Code Ann. 34-31-20 (CFO-set)",        verified_on: "2025-01-15" },
  LA: { rate_pct: 7.50, accrual: "simple",   citation: "La. Rev. Stat. 13:4202 (CFO-set)",         verified_on: "2025-01-15" },
  CT: { rate_pct: 10.0, accrual: "simple",   citation: "Conn. Gen. Stat. 37-3a",                   verified_on: "2025-01-15" },
  IA: { rate_pct: 5.00, accrual: "simple",   citation: "Iowa Code 535.3 (T-bill+2)",               verified_on: "2025-01-15" },
  OK: { rate_pct: 7.62, accrual: "simple",   citation: "Okla. Stat. tit. 12 sec. 727.1",           verified_on: "2025-01-15" },
  KS: { rate_pct: 6.00, accrual: "simple",   citation: "Kan. Stat. Ann. 16-204",                   verified_on: "2025-01-15" },
  AR: { rate_pct: 6.00, accrual: "simple",   citation: "Ark. Code Ann. 16-65-114",                 verified_on: "2025-01-15" },
  MS: { rate_pct: 8.00, accrual: "simple",   citation: "Miss. Code Ann. 75-17-7",                  verified_on: "2025-01-15" },
  UT: { rate_pct: 8.99, accrual: "simple",   citation: "Utah Code Ann. 15-1-4 (T-bill+2)",         verified_on: "2025-01-15" },
  NM: { rate_pct: 8.75, accrual: "simple",   citation: "N.M. Stat. Ann. 56-8-4",                   verified_on: "2025-01-15" },
  NE: { rate_pct: 5.86, accrual: "simple",   citation: "Neb. Rev. Stat. 45-103 (T-bond +2)",       verified_on: "2025-01-15" },
  HI: { rate_pct: 10.0, accrual: "simple",   citation: "Haw. Rev. Stat. 478-3",                    verified_on: "2025-01-15" },
  ID: { rate_pct: 9.625, accrual: "simple",  citation: "Idaho Code 28-22-104 (T-bill+5)",          verified_on: "2025-01-15" },
  MT: { rate_pct: 10.0, accrual: "simple",   citation: "Mont. Code Ann. 25-9-205",                 verified_on: "2025-01-15" },
  WV: { rate_pct: 7.00, accrual: "simple",   citation: "W. Va. Code 56-6-31",                      verified_on: "2025-01-15" },
  ME: { rate_pct: 6.13, accrual: "simple",   citation: "Me. Rev. Stat. tit. 14 sec. 1602-C (T-bill+3)", verified_on: "2025-01-15" },
  NH: { rate_pct: 7.40, accrual: "simple",   citation: "N.H. Rev. Stat. Ann. 524:1-b (prime+2)",   verified_on: "2025-01-15" },
  ND: { rate_pct: 6.00, accrual: "simple",   citation: "N.D. Cent. Code 28-20-34",                 verified_on: "2025-01-15" },
  SD: { rate_pct: 10.0, accrual: "simple",   citation: "S.D. Codified Laws 54-3-5.1",              verified_on: "2025-01-15" },
  WY: { rate_pct: 10.0, accrual: "simple",   citation: "Wyo. Stat. Ann. 1-16-102",                 verified_on: "2025-01-15" },
  AK: { rate_pct: 8.00, accrual: "simple",   citation: "Alaska Stat. 09.30.070 (T-bond+3)",        verified_on: "2025-01-15" },
  VT: { rate_pct: 12.0, accrual: "simple",   citation: "Vt. Stat. Ann. tit. 12 sec. 2903",         verified_on: "2025-01-15" },
  RI: { rate_pct: 12.0, accrual: "simple",   citation: "R.I. Gen. Laws 9-21-10",                   verified_on: "2025-01-15" },
  DE: { rate_pct: 11.5, accrual: "simple",   citation: "Del. Code Ann. tit. 6 sec. 2301 (Fed Disc+5)", verified_on: "2025-01-15" },
  DC: { rate_pct: 6.00, accrual: "simple",   citation: "D.C. Code 28-3302",                        verified_on: "2025-01-15" },
};

// data/legal/court-holidays.json (federal subset; per-state expand per spec)
// Covers the current calendar year and the next two; refreshed annually.
export const FEDERAL_COURT_HOLIDAYS = {
  // Fed. R. Civ. P. 6(a)(6) "legal holiday"
  2025: [
    "2025-01-01", "2025-01-20", "2025-02-17", "2025-05-26",
    "2025-06-19", "2025-07-04", "2025-09-01", "2025-10-13",
    "2025-11-11", "2025-11-27", "2025-12-25",
  ],
  2026: [
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25",
    "2026-06-19", "2026-07-03", "2026-09-07", "2026-10-12",
    "2026-11-11", "2026-11-26", "2026-12-25",
  ],
  2027: [
    "2027-01-01", "2027-01-18", "2027-02-15", "2027-05-31",
    "2027-06-18", "2027-07-05", "2027-09-06", "2027-10-11",
    "2027-11-11", "2027-11-25", "2027-12-24",
  ],
};

// data/legal/statute-of-limitations.json
// Original plain-English summary. Per-state, per claim type. Cite by
// section number only. Not legal advice.
export const STATUTE_OF_LIMITATIONS = {
  CA: {
    contract_written: { years: 4, accrual: "breach",     citation: "Cal. Civ. Proc. Code 337" },
    contract_oral:    { years: 2, accrual: "breach",     citation: "Cal. Civ. Proc. Code 339" },
    personal_injury:  { years: 2, accrual: "discovery",  citation: "Cal. Civ. Proc. Code 335.1" },
    property_damage:  { years: 3, accrual: "accrual",    citation: "Cal. Civ. Proc. Code 338(b)" },
    fraud:            { years: 3, accrual: "discovery",  citation: "Cal. Civ. Proc. Code 338(d)" },
    debt_collection:  { years: 4, accrual: "last payment", citation: "Cal. Civ. Proc. Code 337" },
    wage_claim:       { years: 3, accrual: "accrual",    citation: "Cal. Lab. Code 1194 / CCP 338(a)" },
    medical_malpractice: { years: 3, accrual: "discovery (1y from discovery, 3y outer)", citation: "Cal. Civ. Proc. Code 340.5" },
  },
  TX: {
    contract_written: { years: 4, accrual: "breach",    citation: "Tex. Civ. Prac. & Rem. Code 16.004" },
    contract_oral:    { years: 4, accrual: "breach",    citation: "Tex. Civ. Prac. & Rem. Code 16.004" },
    personal_injury:  { years: 2, accrual: "accrual",   citation: "Tex. Civ. Prac. & Rem. Code 16.003" },
    property_damage:  { years: 2, accrual: "accrual",   citation: "Tex. Civ. Prac. & Rem. Code 16.003" },
    fraud:            { years: 4, accrual: "discovery", citation: "Tex. Civ. Prac. & Rem. Code 16.004" },
    debt_collection:  { years: 4, accrual: "last payment", citation: "Tex. Civ. Prac. & Rem. Code 16.004" },
    wage_claim:       { years: 2, accrual: "accrual",   citation: "Tex. Lab. Code 61.051; FLSA federal floor 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual", citation: "Tex. Civ. Prac. & Rem. Code 74.251" },
  },
  NY: {
    contract_written: { years: 6, accrual: "breach",    citation: "N.Y. C.P.L.R. 213(2)" },
    contract_oral:    { years: 6, accrual: "breach",    citation: "N.Y. C.P.L.R. 213(2)" },
    personal_injury:  { years: 3, accrual: "accrual",   citation: "N.Y. C.P.L.R. 214" },
    property_damage:  { years: 3, accrual: "accrual",   citation: "N.Y. C.P.L.R. 214" },
    fraud:            { years: 6, accrual: "discovery (or 2y from discovery, whichever later)", citation: "N.Y. C.P.L.R. 213(8)" },
    debt_collection:  { years: 3, accrual: "last payment (consumer credit)", citation: "N.Y. C.P.L.R. 214-i (2022)" },
    wage_claim:       { years: 6, accrual: "accrual",   citation: "N.Y. Lab. Law 198(3)" },
    medical_malpractice: { years: 2.5, accrual: "accrual", citation: "N.Y. C.P.L.R. 214-a" },
  },
  FL: {
    contract_written: { years: 5, accrual: "breach",    citation: "Fla. Stat. 95.11(2)(b)" },
    contract_oral:    { years: 4, accrual: "breach",    citation: "Fla. Stat. 95.11(3)(k)" },
    personal_injury:  { years: 2, accrual: "accrual",   citation: "Fla. Stat. 95.11(4)(a) (2023 amend.)" },
    property_damage:  { years: 4, accrual: "accrual",   citation: "Fla. Stat. 95.11(3)" },
    fraud:            { years: 4, accrual: "discovery", citation: "Fla. Stat. 95.11(3)(j)" },
    debt_collection:  { years: 5, accrual: "last payment", citation: "Fla. Stat. 95.11(2)(b)" },
    wage_claim:       { years: 4, accrual: "accrual",   citation: "Fla. Stat. 95.11(3); FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (4y outer)", citation: "Fla. Stat. 95.11(4)(b)" },
  },
  OH: {
    contract_written: { years: 8, accrual: "breach",    citation: "Ohio Rev. Code 2305.06" },
    contract_oral:    { years: 6, accrual: "breach",    citation: "Ohio Rev. Code 2305.07" },
    personal_injury:  { years: 2, accrual: "accrual",   citation: "Ohio Rev. Code 2305.10" },
    property_damage:  { years: 4, accrual: "accrual",   citation: "Ohio Rev. Code 2305.09" },
    fraud:            { years: 4, accrual: "discovery", citation: "Ohio Rev. Code 2305.09(C)" },
    debt_collection:  { years: 6, accrual: "last payment", citation: "Ohio Rev. Code 2305.07" },
    wage_claim:       { years: 2, accrual: "accrual",   citation: "Ohio Rev. Code 4111.14(K); FLSA federal 2/3y" },
    medical_malpractice: { years: 1, accrual: "accrual", citation: "Ohio Rev. Code 2305.113" },
  },
  IL: {
    contract_written: { years: 10, accrual: "breach",      citation: "735 ILCS 5/13-206" },
    contract_oral:    { years: 5,  accrual: "breach",      citation: "735 ILCS 5/13-205" },
    personal_injury:  { years: 2,  accrual: "accrual",     citation: "735 ILCS 5/13-202" },
    property_damage:  { years: 5,  accrual: "accrual",     citation: "735 ILCS 5/13-205" },
    fraud:            { years: 5,  accrual: "discovery",   citation: "735 ILCS 5/13-205" },
    debt_collection:  { years: 10, accrual: "last payment", citation: "735 ILCS 5/13-206" },
    wage_claim:       { years: 10, accrual: "accrual",     citation: "820 ILCS 115/14; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (4y outer)", citation: "735 ILCS 5/13-212" },
  },
  PA: {
    contract_written: { years: 4,  accrual: "breach",       citation: "42 Pa.C.S. 5525" },
    contract_oral:    { years: 4,  accrual: "breach",       citation: "42 Pa.C.S. 5525" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "42 Pa.C.S. 5524" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "42 Pa.C.S. 5524" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "42 Pa.C.S. 5524(7)" },
    debt_collection:  { years: 4,  accrual: "last payment", citation: "42 Pa.C.S. 5525" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "43 P.S. 260.9a; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (7y outer)", citation: "40 P.S. 1303.513" },
  },
  GA: {
    contract_written: { years: 6,  accrual: "breach",       citation: "O.C.G.A. 9-3-24" },
    contract_oral:    { years: 4,  accrual: "breach",       citation: "O.C.G.A. 9-3-25" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "O.C.G.A. 9-3-33" },
    property_damage:  { years: 4,  accrual: "accrual",      citation: "O.C.G.A. 9-3-32" },
    fraud:            { years: 4,  accrual: "discovery",    citation: "O.C.G.A. 9-3-31" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "O.C.G.A. 9-3-24" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "O.C.G.A. 34-7-3.1; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (5y outer)", citation: "O.C.G.A. 9-3-71" },
  },
  WA: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Wash. Rev. Code 4.16.040" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Wash. Rev. Code 4.16.080" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Wash. Rev. Code 4.16.080" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Wash. Rev. Code 4.16.080" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Wash. Rev. Code 4.16.080(4)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Wash. Rev. Code 4.16.040" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Wash. Rev. Code 49.48.083; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery (8y outer)", citation: "Wash. Rev. Code 4.16.350" },
  },
  MA: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Mass. Gen. Laws ch. 260 sec. 2" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Mass. Gen. Laws ch. 260 sec. 2" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Mass. Gen. Laws ch. 260 sec. 2A" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Mass. Gen. Laws ch. 260 sec. 2A" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Mass. Gen. Laws ch. 260 sec. 2A" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Mass. Gen. Laws ch. 260 sec. 2" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Mass. Gen. Laws ch. 149 sec. 150; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery (7y outer)", citation: "Mass. Gen. Laws ch. 260 sec. 4" },
  },
  AZ: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Ariz. Rev. Stat. 12-548" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Ariz. Rev. Stat. 12-543" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Ariz. Rev. Stat. 12-542" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Ariz. Rev. Stat. 12-542" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Ariz. Rev. Stat. 12-543" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Ariz. Rev. Stat. 12-548" },
    wage_claim:       { years: 1,  accrual: "accrual",      citation: "Ariz. Rev. Stat. 23-355; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual",    citation: "Ariz. Rev. Stat. 12-542" },
  },
  CO: {
    contract_written: { years: 3,  accrual: "breach",       citation: "Colo. Rev. Stat. 13-80-101(1)(a)" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Colo. Rev. Stat. 13-80-101(1)(a)" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Colo. Rev. Stat. 13-80-102" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Colo. Rev. Stat. 13-80-102" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Colo. Rev. Stat. 13-80-101(1)(c)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Colo. Rev. Stat. 13-80-103.5" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Colo. Rev. Stat. 8-4-122; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (3y outer)", citation: "Colo. Rev. Stat. 13-80-102.5" },
  },
  NJ: {
    contract_written: { years: 6,  accrual: "breach",       citation: "N.J. Stat. Ann. 2A:14-1" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "N.J. Stat. Ann. 2A:14-1" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "N.J. Stat. Ann. 2A:14-2" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "N.J. Stat. Ann. 2A:14-1" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "N.J. Stat. Ann. 2A:14-1" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "N.J. Stat. Ann. 2A:14-1" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "N.J. Stat. Ann. 34:11-56a25; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery",  citation: "N.J. Stat. Ann. 2A:14-2" },
  },
  VA: {
    contract_written: { years: 5,  accrual: "breach",       citation: "Va. Code Ann. 8.01-246(2)" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Va. Code Ann. 8.01-246(4)" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Va. Code Ann. 8.01-243" },
    property_damage:  { years: 5,  accrual: "accrual",      citation: "Va. Code Ann. 8.01-243" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "Va. Code Ann. 8.01-243(A)" },
    debt_collection:  { years: 5,  accrual: "last payment", citation: "Va. Code Ann. 8.01-246(2)" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Va. Code Ann. 40.1-29; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual",    citation: "Va. Code Ann. 8.01-243.1" },
  },
  NC: {
    contract_written: { years: 3,  accrual: "breach",       citation: "N.C. Gen. Stat. 1-52" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "N.C. Gen. Stat. 1-52" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "N.C. Gen. Stat. 1-52(16)" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "N.C. Gen. Stat. 1-52" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "N.C. Gen. Stat. 1-52(9)" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "N.C. Gen. Stat. 1-52(1)" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "N.C. Gen. Stat. 95-25.22; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "accrual (4y outer)", citation: "N.C. Gen. Stat. 1-15(c)" },
  },
  MI: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Mich. Comp. Laws 600.5807" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Mich. Comp. Laws 600.5807" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Mich. Comp. Laws 600.5805" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Mich. Comp. Laws 600.5805" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "Mich. Comp. Laws 600.5813" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Mich. Comp. Laws 600.5807" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Mich. Comp. Laws 408.481; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (6y outer)", citation: "Mich. Comp. Laws 600.5805(8)" },
  },
  IN: {
    contract_written: { years: 10, accrual: "breach",       citation: "Ind. Code 34-11-2-11" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Ind. Code 34-11-2-7" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Ind. Code 34-11-2-4" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Ind. Code 34-11-2-4" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "Ind. Code 34-11-2-7" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Ind. Code 34-11-2-9" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Ind. Code 22-2-9-2; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual",    citation: "Ind. Code 34-18-7-1" },
  },
  TN: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Tenn. Code Ann. 28-3-109" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Tenn. Code Ann. 28-3-109" },
    personal_injury:  { years: 1,  accrual: "accrual",      citation: "Tenn. Code Ann. 28-3-104" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Tenn. Code Ann. 28-3-105" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Tenn. Code Ann. 28-3-105" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Tenn. Code Ann. 28-3-109" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "Tenn. Code Ann. 50-2-103; FLSA federal 2/3y" },
    medical_malpractice: { years: 1, accrual: "discovery (3y outer)", citation: "Tenn. Code Ann. 29-26-116" },
  },
  MO: {
    contract_written: { years: 10, accrual: "breach",       citation: "Mo. Rev. Stat. 516.110" },
    contract_oral:    { years: 5,  accrual: "breach",       citation: "Mo. Rev. Stat. 516.120" },
    personal_injury:  { years: 5,  accrual: "accrual",      citation: "Mo. Rev. Stat. 516.120" },
    property_damage:  { years: 5,  accrual: "accrual",      citation: "Mo. Rev. Stat. 516.120" },
    fraud:            { years: 5,  accrual: "discovery (10y outer)", citation: "Mo. Rev. Stat. 516.120(5)" },
    debt_collection:  { years: 10, accrual: "last payment", citation: "Mo. Rev. Stat. 516.110" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Mo. Rev. Stat. 290.527; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual (10y outer)", citation: "Mo. Rev. Stat. 516.105" },
  },
  WI: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Wis. Stat. 893.43" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Wis. Stat. 893.43" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Wis. Stat. 893.54" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "Wis. Stat. 893.52" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "Wis. Stat. 893.93(1)(b)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Wis. Stat. 893.43" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Wis. Stat. 109.09; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery (5y outer)", citation: "Wis. Stat. 893.55" },
  },
  MN: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Minn. Stat. 541.05" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Minn. Stat. 541.05" },
    personal_injury:  { years: 6,  accrual: "accrual",      citation: "Minn. Stat. 541.05" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "Minn. Stat. 541.05" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "Minn. Stat. 541.05(6)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Minn. Stat. 541.05" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Minn. Stat. 541.07; FLSA federal 2/3y" },
    medical_malpractice: { years: 4, accrual: "accrual",    citation: "Minn. Stat. 541.076" },
  },
  MD: {
    contract_written: { years: 3,  accrual: "breach",       citation: "Md. Code Ann., Cts. & Jud. Proc. 5-101" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Md. Code Ann., Cts. & Jud. Proc. 5-101" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Md. Code Ann., Cts. & Jud. Proc. 5-101" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Md. Code Ann., Cts. & Jud. Proc. 5-101" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Md. Code Ann., Cts. & Jud. Proc. 5-203" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "Md. Code Ann., Cts. & Jud. Proc. 5-101" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Md. Code Ann., Lab. & Empl. 3-507.2; FLSA federal 2/3y" },
    medical_malpractice: { years: 5, accrual: "discovery (5y outer)", citation: "Md. Code Ann., Cts. & Jud. Proc. 5-109" },
  },
  CT: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Conn. Gen. Stat. 52-576" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Conn. Gen. Stat. 52-581" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Conn. Gen. Stat. 52-584" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Conn. Gen. Stat. 52-584" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Conn. Gen. Stat. 52-577" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Conn. Gen. Stat. 52-576" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Conn. Gen. Stat. 31-72; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (3y outer)", citation: "Conn. Gen. Stat. 52-584" },
  },
  NV: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Nev. Rev. Stat. 11.190(1)" },
    contract_oral:    { years: 4,  accrual: "breach",       citation: "Nev. Rev. Stat. 11.190(2)" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Nev. Rev. Stat. 11.190(4)(e)" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Nev. Rev. Stat. 11.190(3)(c)" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Nev. Rev. Stat. 11.190(3)(d)" },
    debt_collection:  { years: 4,  accrual: "last payment", citation: "Nev. Rev. Stat. 11.190(2)" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Nev. Rev. Stat. 608.260; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery",  citation: "Nev. Rev. Stat. 41A.097" },
  },
  OR: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Or. Rev. Stat. 12.080" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Or. Rev. Stat. 12.080" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Or. Rev. Stat. 12.110" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "Or. Rev. Stat. 12.080" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "Or. Rev. Stat. 12.110(1)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Or. Rev. Stat. 12.080" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "Or. Rev. Stat. 652.150; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (5y outer)", citation: "Or. Rev. Stat. 12.110(4)" },
  },
  AL: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Ala. Code 6-2-34" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Ala. Code 6-2-34" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Ala. Code 6-2-38(l)" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "Ala. Code 6-2-34(2)" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "Ala. Code 6-2-3" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Ala. Code 6-2-34" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Ala. Code 25-1-1; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual (4y outer)", citation: "Ala. Code 6-5-482" },
  },
  KY: {
    contract_written: { years: 15, accrual: "breach",       citation: "Ky. Rev. Stat. 413.090" },
    contract_oral:    { years: 5,  accrual: "breach",       citation: "Ky. Rev. Stat. 413.120" },
    personal_injury:  { years: 1,  accrual: "accrual",      citation: "Ky. Rev. Stat. 413.140" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Ky. Rev. Stat. 413.125" },
    fraud:            { years: 5,  accrual: "discovery (10y outer)", citation: "Ky. Rev. Stat. 413.120(11)" },
    debt_collection:  { years: 10, accrual: "last payment", citation: "Ky. Rev. Stat. 413.090(1)" },
    wage_claim:       { years: 5,  accrual: "accrual",      citation: "Ky. Rev. Stat. 337.385; FLSA federal 2/3y" },
    medical_malpractice: { years: 1, accrual: "discovery (5y outer)", citation: "Ky. Rev. Stat. 413.140(1)(e)" },
  },
  SC: {
    contract_written: { years: 3,  accrual: "breach",       citation: "S.C. Code Ann. 15-3-530" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "S.C. Code Ann. 15-3-530" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "S.C. Code Ann. 15-3-530" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "S.C. Code Ann. 15-3-530" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "S.C. Code Ann. 15-3-535" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "S.C. Code Ann. 15-3-530" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "S.C. Code Ann. 41-10-80; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery (6y outer)", citation: "S.C. Code Ann. 15-3-545" },
  },
  LA: {
    contract_written: { years: 10, accrual: "breach",       citation: "La. Civ. Code art. 3499" },
    contract_oral:    { years: 10, accrual: "breach",       citation: "La. Civ. Code art. 3499" },
    personal_injury:  { years: 2,  accrual: "accrual (CC 2024 amend)", citation: "La. Civ. Code art. 3493.1" },
    property_damage:  { years: 1,  accrual: "accrual",      citation: "La. Civ. Code art. 3492" },
    fraud:            { years: 1,  accrual: "discovery",    citation: "La. Civ. Code art. 3492" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "La. Civ. Code art. 3494" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "La. Civ. Code art. 3494; FLSA federal 2/3y" },
    medical_malpractice: { years: 1, accrual: "discovery (3y outer)", citation: "La. Rev. Stat. 9:5628" },
  },
  IA: {
    contract_written: { years: 10, accrual: "breach",       citation: "Iowa Code 614.1(5)" },
    contract_oral:    { years: 5,  accrual: "breach",       citation: "Iowa Code 614.1(4)" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Iowa Code 614.1(2)" },
    property_damage:  { years: 5,  accrual: "accrual",      citation: "Iowa Code 614.1(4)" },
    fraud:            { years: 5,  accrual: "discovery",    citation: "Iowa Code 614.1(4)" },
    debt_collection:  { years: 10, accrual: "last payment", citation: "Iowa Code 614.1(5)" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Iowa Code 91A.10; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (6y outer)", citation: "Iowa Code 614.1(9)" },
  },
  OK: {
    contract_written: { years: 5,  accrual: "breach",       citation: "Okla. Stat. tit. 12 sec. 95(A)(1)" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Okla. Stat. tit. 12 sec. 95(A)(2)" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Okla. Stat. tit. 12 sec. 95(A)(3)" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Okla. Stat. tit. 12 sec. 95(A)(3)" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "Okla. Stat. tit. 12 sec. 95(A)(3)" },
    debt_collection:  { years: 5,  accrual: "last payment", citation: "Okla. Stat. tit. 12 sec. 95(A)(1)" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Okla. Stat. tit. 40 sec. 165.9; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery",  citation: "Okla. Stat. tit. 76 sec. 18" },
  },
  KS: {
    contract_written: { years: 5,  accrual: "breach",       citation: "Kan. Stat. Ann. 60-511" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Kan. Stat. Ann. 60-512" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Kan. Stat. Ann. 60-513" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Kan. Stat. Ann. 60-513" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "Kan. Stat. Ann. 60-513(a)(3)" },
    debt_collection:  { years: 5,  accrual: "last payment", citation: "Kan. Stat. Ann. 60-511" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Kan. Stat. Ann. 44-313; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (4y outer)", citation: "Kan. Stat. Ann. 60-513(c)" },
  },
  AR: {
    contract_written: { years: 5,  accrual: "breach",       citation: "Ark. Code Ann. 16-56-111" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Ark. Code Ann. 16-56-105" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Ark. Code Ann. 16-56-105" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Ark. Code Ann. 16-56-105" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Ark. Code Ann. 16-56-105" },
    debt_collection:  { years: 5,  accrual: "last payment", citation: "Ark. Code Ann. 16-56-111" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Ark. Code Ann. 11-4-405; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual",    citation: "Ark. Code Ann. 16-114-203" },
  },
  MS: {
    contract_written: { years: 3,  accrual: "breach",       citation: "Miss. Code Ann. 15-1-49" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Miss. Code Ann. 15-1-29" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Miss. Code Ann. 15-1-49" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Miss. Code Ann. 15-1-49" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Miss. Code Ann. 15-1-67" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "Miss. Code Ann. 15-1-29" },
    wage_claim:       { years: 1,  accrual: "accrual",      citation: "Miss. Code Ann. 15-1-29; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (7y outer)", citation: "Miss. Code Ann. 15-1-36" },
  },
  UT: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Utah Code Ann. 78B-2-309(2)" },
    contract_oral:    { years: 4,  accrual: "breach",       citation: "Utah Code Ann. 78B-2-307" },
    personal_injury:  { years: 4,  accrual: "accrual",      citation: "Utah Code Ann. 78B-2-307" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Utah Code Ann. 78B-2-305" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Utah Code Ann. 78B-2-305(3)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Utah Code Ann. 78B-2-309(2)" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Utah Code Ann. 34-28-9.5; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (4y outer)", citation: "Utah Code Ann. 78B-3-404" },
  },
  NM: {
    contract_written: { years: 6,  accrual: "breach",       citation: "N.M. Stat. Ann. 37-1-3" },
    contract_oral:    { years: 4,  accrual: "breach",       citation: "N.M. Stat. Ann. 37-1-4" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "N.M. Stat. Ann. 37-1-8" },
    property_damage:  { years: 4,  accrual: "accrual",      citation: "N.M. Stat. Ann. 37-1-4" },
    fraud:            { years: 4,  accrual: "discovery",    citation: "N.M. Stat. Ann. 37-1-4" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "N.M. Stat. Ann. 37-1-3" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "N.M. Stat. Ann. 50-4-26; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "accrual",    citation: "N.M. Stat. Ann. 41-5-13" },
  },
  NE: {
    contract_written: { years: 5,  accrual: "breach",       citation: "Neb. Rev. Stat. 25-205" },
    contract_oral:    { years: 4,  accrual: "breach",       citation: "Neb. Rev. Stat. 25-206" },
    personal_injury:  { years: 4,  accrual: "accrual",      citation: "Neb. Rev. Stat. 25-207" },
    property_damage:  { years: 4,  accrual: "accrual",      citation: "Neb. Rev. Stat. 25-207" },
    fraud:            { years: 4,  accrual: "discovery",    citation: "Neb. Rev. Stat. 25-207(4)" },
    debt_collection:  { years: 5,  accrual: "last payment", citation: "Neb. Rev. Stat. 25-205" },
    wage_claim:       { years: 4,  accrual: "accrual",      citation: "Neb. Rev. Stat. 48-1230.01; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual (10y outer)", citation: "Neb. Rev. Stat. 25-222" },
  },
  HI: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Haw. Rev. Stat. 657-1" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Haw. Rev. Stat. 657-1" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Haw. Rev. Stat. 657-7" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Haw. Rev. Stat. 657-7" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "Haw. Rev. Stat. 657-1(4)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Haw. Rev. Stat. 657-1" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "Haw. Rev. Stat. 388-7; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (6y outer)", citation: "Haw. Rev. Stat. 657-7.3" },
  },
  ID: {
    contract_written: { years: 5,  accrual: "breach",       citation: "Idaho Code 5-216" },
    contract_oral:    { years: 4,  accrual: "breach",       citation: "Idaho Code 5-217" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Idaho Code 5-219" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Idaho Code 5-218" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Idaho Code 5-218(4)" },
    debt_collection:  { years: 5,  accrual: "last payment", citation: "Idaho Code 5-216" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "Idaho Code 45-614; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual",    citation: "Idaho Code 5-219(4)" },
  },
  MT: {
    contract_written: { years: 8,  accrual: "breach",       citation: "Mont. Code Ann. 27-2-202" },
    contract_oral:    { years: 5,  accrual: "breach",       citation: "Mont. Code Ann. 27-2-202" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Mont. Code Ann. 27-2-204" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Mont. Code Ann. 27-2-207" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "Mont. Code Ann. 27-2-203" },
    debt_collection:  { years: 8,  accrual: "last payment", citation: "Mont. Code Ann. 27-2-202" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "Mont. Code Ann. 39-3-207; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery (5y outer)", citation: "Mont. Code Ann. 27-2-205" },
  },
  WV: {
    contract_written: { years: 10, accrual: "breach",       citation: "W. Va. Code 55-2-6" },
    contract_oral:    { years: 5,  accrual: "breach",       citation: "W. Va. Code 55-2-6" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "W. Va. Code 55-2-12" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "W. Va. Code 55-2-12" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "W. Va. Code 55-2-12" },
    debt_collection:  { years: 10, accrual: "last payment", citation: "W. Va. Code 55-2-6" },
    wage_claim:       { years: 5,  accrual: "accrual",      citation: "W. Va. Code 21-5-12; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (10y outer)", citation: "W. Va. Code 55-7B-4" },
  },
  ME: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Me. Rev. Stat. tit. 14 sec. 752" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Me. Rev. Stat. tit. 14 sec. 752" },
    personal_injury:  { years: 6,  accrual: "accrual",      citation: "Me. Rev. Stat. tit. 14 sec. 752" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "Me. Rev. Stat. tit. 14 sec. 752" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "Me. Rev. Stat. tit. 14 sec. 859" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Me. Rev. Stat. tit. 14 sec. 752" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "Me. Rev. Stat. tit. 26 sec. 626; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "accrual",    citation: "Me. Rev. Stat. tit. 24 sec. 2902" },
  },
  NH: {
    contract_written: { years: 3,  accrual: "breach",       citation: "N.H. Rev. Stat. Ann. 508:4" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "N.H. Rev. Stat. Ann. 508:4" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "N.H. Rev. Stat. Ann. 508:4" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "N.H. Rev. Stat. Ann. 508:4" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "N.H. Rev. Stat. Ann. 508:4(I)" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "N.H. Rev. Stat. Ann. 508:4" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "N.H. Rev. Stat. Ann. 275:53; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual (3y outer)", citation: "N.H. Rev. Stat. Ann. 507-C:4" },
  },
  RI: {
    contract_written: { years: 10, accrual: "breach",       citation: "R.I. Gen. Laws 9-1-13" },
    contract_oral:    { years: 10, accrual: "breach",       citation: "R.I. Gen. Laws 9-1-13" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "R.I. Gen. Laws 9-1-14" },
    property_damage:  { years: 10, accrual: "accrual",      citation: "R.I. Gen. Laws 9-1-13" },
    fraud:            { years: 10, accrual: "discovery",    citation: "R.I. Gen. Laws 9-1-13" },
    debt_collection:  { years: 10, accrual: "last payment", citation: "R.I. Gen. Laws 9-1-13" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "R.I. Gen. Laws 28-14-19; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "accrual",    citation: "R.I. Gen. Laws 9-1-14.1" },
  },
  VT: {
    contract_written: { years: 6,  accrual: "breach",       citation: "Vt. Stat. Ann. tit. 12 sec. 511" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "Vt. Stat. Ann. tit. 12 sec. 511" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "Vt. Stat. Ann. tit. 12 sec. 512" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "Vt. Stat. Ann. tit. 12 sec. 512" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "Vt. Stat. Ann. tit. 12 sec. 511" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "Vt. Stat. Ann. tit. 12 sec. 511" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "Vt. Stat. Ann. tit. 21 sec. 347; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery (7y outer)", citation: "Vt. Stat. Ann. tit. 12 sec. 521" },
  },
  AK: {
    contract_written: { years: 3,  accrual: "breach",       citation: "Alaska Stat. 09.10.053" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Alaska Stat. 09.10.053" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Alaska Stat. 09.10.070" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "Alaska Stat. 09.10.050" },
    fraud:            { years: 2,  accrual: "discovery",    citation: "Alaska Stat. 09.10.070" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "Alaska Stat. 09.10.053" },
    wage_claim:       { years: 2,  accrual: "accrual",      citation: "Alaska Stat. 23.05.140; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery",  citation: "Alaska Stat. 09.10.070" },
  },
  ND: {
    contract_written: { years: 6,  accrual: "breach",       citation: "N.D. Cent. Code 28-01-16" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "N.D. Cent. Code 28-01-16" },
    personal_injury:  { years: 6,  accrual: "accrual",      citation: "N.D. Cent. Code 28-01-16" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "N.D. Cent. Code 28-01-16" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "N.D. Cent. Code 28-01-16(6)" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "N.D. Cent. Code 28-01-16" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "N.D. Cent. Code 34-14-09.1; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery (6y outer)", citation: "N.D. Cent. Code 28-01-18(3)" },
  },
  SD: {
    contract_written: { years: 6,  accrual: "breach",       citation: "S.D. Codified Laws 15-2-13" },
    contract_oral:    { years: 6,  accrual: "breach",       citation: "S.D. Codified Laws 15-2-13" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "S.D. Codified Laws 15-2-14" },
    property_damage:  { years: 6,  accrual: "accrual",      citation: "S.D. Codified Laws 15-2-13" },
    fraud:            { years: 6,  accrual: "discovery",    citation: "S.D. Codified Laws 15-2-3" },
    debt_collection:  { years: 6,  accrual: "last payment", citation: "S.D. Codified Laws 15-2-13" },
    wage_claim:       { years: 6,  accrual: "accrual",      citation: "S.D. Codified Laws 60-11-7; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual",    citation: "S.D. Codified Laws 15-2-14.1" },
  },
  WY: {
    contract_written: { years: 10, accrual: "breach",       citation: "Wyo. Stat. Ann. 1-3-105" },
    contract_oral:    { years: 8,  accrual: "breach",       citation: "Wyo. Stat. Ann. 1-3-105" },
    personal_injury:  { years: 4,  accrual: "accrual",      citation: "Wyo. Stat. Ann. 1-3-105" },
    property_damage:  { years: 4,  accrual: "accrual",      citation: "Wyo. Stat. Ann. 1-3-105" },
    fraud:            { years: 4,  accrual: "discovery",    citation: "Wyo. Stat. Ann. 1-3-106" },
    debt_collection:  { years: 10, accrual: "last payment", citation: "Wyo. Stat. Ann. 1-3-105" },
    wage_claim:       { years: 4,  accrual: "accrual",      citation: "Wyo. Stat. Ann. 27-4-104; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "discovery",  citation: "Wyo. Stat. Ann. 1-3-107" },
  },
  DE: {
    contract_written: { years: 3,  accrual: "breach",       citation: "Del. Code Ann. tit. 10 sec. 8106" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "Del. Code Ann. tit. 10 sec. 8106" },
    personal_injury:  { years: 2,  accrual: "accrual",      citation: "Del. Code Ann. tit. 10 sec. 8119" },
    property_damage:  { years: 2,  accrual: "accrual",      citation: "Del. Code Ann. tit. 10 sec. 8107" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "Del. Code Ann. tit. 10 sec. 8106" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "Del. Code Ann. tit. 10 sec. 8106" },
    wage_claim:       { years: 1,  accrual: "accrual",      citation: "Del. Code Ann. tit. 19 sec. 1113; FLSA federal 2/3y" },
    medical_malpractice: { years: 2, accrual: "accrual (3y outer)", citation: "Del. Code Ann. tit. 18 sec. 6856" },
  },
  DC: {
    contract_written: { years: 3,  accrual: "breach",       citation: "D.C. Code 12-301(7)" },
    contract_oral:    { years: 3,  accrual: "breach",       citation: "D.C. Code 12-301(7)" },
    personal_injury:  { years: 3,  accrual: "accrual",      citation: "D.C. Code 12-301(8)" },
    property_damage:  { years: 3,  accrual: "accrual",      citation: "D.C. Code 12-301(3)" },
    fraud:            { years: 3,  accrual: "discovery",    citation: "D.C. Code 12-301(8)" },
    debt_collection:  { years: 3,  accrual: "last payment", citation: "D.C. Code 12-301(7)" },
    wage_claim:       { years: 3,  accrual: "accrual",      citation: "D.C. Code 32-1308; FLSA federal 2/3y" },
    medical_malpractice: { years: 3, accrual: "discovery",  citation: "D.C. Code 12-301(8)" },
  },
};

// data/legal/landlord-tenant-notice.json
export const LANDLORD_TENANT_NOTICE = {
  CA: {
    nonpayment:        { notice_days: 3, business_days: true, cure_allowed: true,  citation: "Cal. Civ. Proc. Code 1161(2)" },
    lease_violation:   { notice_days: 3, business_days: true, cure_allowed: true,  citation: "Cal. Civ. Proc. Code 1161(3)" },
    no_cause:          { notice_days: 60, business_days: false, cure_allowed: false, citation: "Cal. Civ. Code 1946.1 (>= 1 yr tenancy)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Cal. Civ. Code 1946.1 (< 1 yr tenancy)" },
  },
  TX: {
    nonpayment:        { notice_days: 3, business_days: false, cure_allowed: false, citation: "Tex. Prop. Code 24.005" },
    lease_violation:   { notice_days: 3, business_days: false, cure_allowed: false, citation: "Tex. Prop. Code 24.005" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Tex. Prop. Code 91.001" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Tex. Prop. Code 91.001" },
  },
  NY: {
    nonpayment:        { notice_days: 14, business_days: false, cure_allowed: true, citation: "N.Y. RPAPL 711(2) (HSTPA 2019)" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: true, citation: "N.Y. RPAPL 753(4)" },
    no_cause:          { notice_days: 90, business_days: false, cure_allowed: false, citation: "N.Y. RPL 226-c (HSTPA 2019, > 2y)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.Y. RPL 226-c (< 1y)" },
  },
  FL: {
    nonpayment:        { notice_days: 3, business_days: true, cure_allowed: true,  citation: "Fla. Stat. 83.56(3)" },
    lease_violation:   { notice_days: 7, business_days: false, cure_allowed: true, citation: "Fla. Stat. 83.56(2)(b)" },
    no_cause:          { notice_days: 60, business_days: false, cure_allowed: false, citation: "Fla. Stat. 83.575 (yearly tenancy)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Fla. Stat. 83.57(3)" },
  },
  OH: {
    nonpayment:        { notice_days: 3, business_days: false, cure_allowed: false, citation: "Ohio Rev. Code 1923.04" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: true, citation: "Ohio Rev. Code 5321.11" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ohio Rev. Code 5321.17" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ohio Rev. Code 5321.17" },
  },
  IL: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "735 ILCS 5/9-209" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: false, citation: "735 ILCS 5/9-210" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "735 ILCS 5/9-207 (month-to-month)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "735 ILCS 5/9-207" },
  },
  PA: {
    nonpayment:        { notice_days: 10, business_days: false, cure_allowed: true,  citation: "68 P.S. 250.501(b)" },
    lease_violation:   { notice_days: 15, business_days: false, cure_allowed: false, citation: "68 P.S. 250.501 (lease term <= 1y)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "68 P.S. 250.501 (month-to-month)" },
    month_to_month:    { notice_days: 15, business_days: false, cure_allowed: false, citation: "68 P.S. 250.501" },
  },
  GA: {
    nonpayment:        { notice_days: 0,  business_days: false, cure_allowed: false, citation: "O.C.G.A. 44-7-50 (immediate demand)" },
    lease_violation:   { notice_days: 0,  business_days: false, cure_allowed: false, citation: "O.C.G.A. 44-7-50" },
    no_cause:          { notice_days: 60, business_days: false, cure_allowed: false, citation: "O.C.G.A. 44-7-7" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "O.C.G.A. 44-7-7 (tenant-side 30d)" },
  },
  WA: {
    nonpayment:        { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Wash. Rev. Code 59.18.057 (2019)" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Wash. Rev. Code 59.12.030(4)" },
    no_cause:          { notice_days: 60, business_days: false, cure_allowed: false, citation: "Wash. Rev. Code 59.18.650 (2021 just-cause)" },
    month_to_month:    { notice_days: 20, business_days: false, cure_allowed: false, citation: "Wash. Rev. Code 59.18.200" },
  },
  MA: {
    nonpayment:        { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Mass. Gen. Laws ch. 186 sec. 11" },
    lease_violation:   { notice_days: 7,  business_days: false, cure_allowed: false, citation: "Mass. Gen. Laws ch. 186 sec. 12 (tenant-at-will)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mass. Gen. Laws ch. 186 sec. 12" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mass. Gen. Laws ch. 186 sec. 12" },
  },
  NJ: {
    nonpayment:        { notice_days: 0,  business_days: false, cure_allowed: false, citation: "N.J. Stat. Ann. 2A:18-61.2 (no statutory cure for nonpayment)" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: true,  citation: "N.J. Stat. Ann. 2A:18-61.2 (Anti-Eviction Act)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.J. Stat. Ann. 2A:18-56 (cause required for protected tenancies)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.J. Stat. Ann. 2A:18-56" },
  },
  AZ: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "Ariz. Rev. Stat. 33-1368(B)" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Ariz. Rev. Stat. 33-1368(A)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ariz. Rev. Stat. 33-1375" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ariz. Rev. Stat. 33-1375(B)" },
  },
  CO: {
    nonpayment:        { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Colo. Rev. Stat. 13-40-104 (HB 21-1121)" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Colo. Rev. Stat. 13-40-104(1)(d.5)" },
    no_cause:          { notice_days: 21, business_days: false, cure_allowed: false, citation: "Colo. Rev. Stat. 13-40-107(1)(d)" },
    month_to_month:    { notice_days: 21, business_days: false, cure_allowed: false, citation: "Colo. Rev. Stat. 13-40-107(1)(d)" },
  },
  NV: {
    nonpayment:        { notice_days: 7,  business_days: true,  cure_allowed: true,  citation: "Nev. Rev. Stat. 40.253" },
    lease_violation:   { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "Nev. Rev. Stat. 40.2516" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Nev. Rev. Stat. 40.251" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Nev. Rev. Stat. 40.251" },
  },
  OR: {
    nonpayment:        { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Or. Rev. Stat. 90.394 (10-day cure if rent <8d late)" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: true,  citation: "Or. Rev. Stat. 90.392" },
    no_cause:          { notice_days: 90, business_days: false, cure_allowed: false, citation: "Or. Rev. Stat. 90.427 (just-cause; >1y tenancy)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Or. Rev. Stat. 90.427" },
  },
  MI: {
    nonpayment:        { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Mich. Comp. Laws 600.5714" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: true,  citation: "Mich. Comp. Laws 554.134" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mich. Comp. Laws 554.134" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mich. Comp. Laws 554.134" },
  },
  MN: {
    nonpayment:        { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Minn. Stat. 504B.135 (HF 2335, 2024)" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Minn. Stat. 504B.291" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Minn. Stat. 504B.135" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Minn. Stat. 504B.135" },
  },
  MD: {
    nonpayment:        { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Md. Code Ann., Real Prop. 8-401(c)(1)(ii) (2021)" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: true,  citation: "Md. Code Ann., Real Prop. 8-402.1" },
    no_cause:          { notice_days: 60, business_days: false, cure_allowed: false, citation: "Md. Code Ann., Real Prop. 8-402(b)" },
    month_to_month:    { notice_days: 60, business_days: false, cure_allowed: false, citation: "Md. Code Ann., Real Prop. 8-402(b)" },
  },
  CT: {
    nonpayment:        { notice_days: 9,  business_days: true,  cure_allowed: false, citation: "Conn. Gen. Stat. 47a-15a (9 grace days, no cure on nonpayment)" },
    lease_violation:   { notice_days: 15, business_days: false, cure_allowed: true,  citation: "Conn. Gen. Stat. 47a-15" },
    no_cause:          { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Conn. Gen. Stat. 47a-23 (lapse-of-time notice)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Conn. Gen. Stat. 47a-23" },
  },
  NC: {
    nonpayment:        { notice_days: 10, business_days: false, cure_allowed: false, citation: "N.C. Gen. Stat. 42-3 (10-day demand)" },
    lease_violation:   { notice_days: 0,  business_days: false, cure_allowed: false, citation: "N.C. Gen. Stat. 42-26 (no statutory cure)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.C. Gen. Stat. 42-14" },
    month_to_month:    { notice_days: 7,  business_days: false, cure_allowed: false, citation: "N.C. Gen. Stat. 42-14" },
  },
  IN: {
    nonpayment:        { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Ind. Code 32-31-1-6" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ind. Code 32-31-1-6 (substantial violation)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ind. Code 32-31-1-1" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ind. Code 32-31-1-1" },
  },
  TN: {
    nonpayment:        { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Tenn. Code Ann. 66-28-505 (URLTA counties)" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Tenn. Code Ann. 66-28-505" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Tenn. Code Ann. 66-28-512" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Tenn. Code Ann. 66-28-512" },
  },
  MO: {
    nonpayment:        { notice_days: 0,  business_days: false, cure_allowed: false, citation: "Mo. Rev. Stat. 535.020 (immediate demand)" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: false, citation: "Mo. Rev. Stat. 441.060" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mo. Rev. Stat. 441.060 (month-to-month)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mo. Rev. Stat. 441.060" },
  },
  WI: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "Wis. Stat. 704.17(2)(a)" },
    lease_violation:   { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "Wis. Stat. 704.17(2)(b)" },
    no_cause:          { notice_days: 28, business_days: false, cure_allowed: false, citation: "Wis. Stat. 704.19" },
    month_to_month:    { notice_days: 28, business_days: false, cure_allowed: false, citation: "Wis. Stat. 704.19" },
  },
  AL: {
    nonpayment:        { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Ala. Code 35-9A-421(b)" },
    lease_violation:   { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Ala. Code 35-9A-421(a)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ala. Code 35-9A-441" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ala. Code 35-9A-441" },
  },
  AR: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Ark. Code Ann. 18-17-901 (failure-to-vacate; criminal eviction)" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Ark. Code Ann. 18-17-701" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ark. Code Ann. 18-17-704" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ark. Code Ann. 18-17-704" },
  },
  KY: {
    nonpayment:        { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Ky. Rev. Stat. 383.660 (URLTA cities only)" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Ky. Rev. Stat. 383.660" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ky. Rev. Stat. 383.695" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Ky. Rev. Stat. 383.695" },
  },
  SC: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "S.C. Code Ann. 27-40-710" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "S.C. Code Ann. 27-40-710" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "S.C. Code Ann. 27-40-770" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "S.C. Code Ann. 27-40-770" },
  },
  LA: {
    nonpayment:        { notice_days: 5,  business_days: true,  cure_allowed: false, citation: "La. Code Civ. Proc. art. 4701" },
    lease_violation:   { notice_days: 5,  business_days: true,  cure_allowed: false, citation: "La. Code Civ. Proc. art. 4701" },
    no_cause:          { notice_days: 10, business_days: false, cure_allowed: false, citation: "La. Civ. Code art. 2728" },
    month_to_month:    { notice_days: 10, business_days: false, cure_allowed: false, citation: "La. Civ. Code art. 2728" },
  },
  IA: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: true,  citation: "Iowa Code 562A.27 (URLTA)" },
    lease_violation:   { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Iowa Code 562A.27" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Iowa Code 562A.34" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Iowa Code 562A.34" },
  },
  OK: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "Okla. Stat. tit. 41 sec. 131" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Okla. Stat. tit. 41 sec. 132" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Okla. Stat. tit. 41 sec. 111" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Okla. Stat. tit. 41 sec. 111" },
  },
  KS: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Kan. Stat. Ann. 58-2564" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Kan. Stat. Ann. 58-2564" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Kan. Stat. Ann. 58-2570" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Kan. Stat. Ann. 58-2570" },
  },
  MS: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Miss. Code Ann. 89-7-27" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: false, citation: "Miss. Code Ann. 89-8-13" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Miss. Code Ann. 89-8-19" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Miss. Code Ann. 89-8-19" },
  },
  UT: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: true,  citation: "Utah Code Ann. 78B-6-802" },
    lease_violation:   { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Utah Code Ann. 78B-6-802" },
    no_cause:          { notice_days: 15, business_days: false, cure_allowed: false, citation: "Utah Code Ann. 78B-6-802" },
    month_to_month:    { notice_days: 15, business_days: false, cure_allowed: false, citation: "Utah Code Ann. 78B-6-802" },
  },
  NM: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "N.M. Stat. Ann. 47-8-33(D)" },
    lease_violation:   { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "N.M. Stat. Ann. 47-8-33(A)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.M. Stat. Ann. 47-8-37" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.M. Stat. Ann. 47-8-37" },
  },
  NE: {
    nonpayment:        { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Neb. Rev. Stat. 76-1431" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Neb. Rev. Stat. 76-1431" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Neb. Rev. Stat. 76-1437" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Neb. Rev. Stat. 76-1437" },
  },
  HI: {
    nonpayment:        { notice_days: 5,  business_days: true,  cure_allowed: true,  citation: "Haw. Rev. Stat. 521-68" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Haw. Rev. Stat. 521-72" },
    no_cause:          { notice_days: 45, business_days: false, cure_allowed: false, citation: "Haw. Rev. Stat. 521-71" },
    month_to_month:    { notice_days: 28, business_days: false, cure_allowed: false, citation: "Haw. Rev. Stat. 521-71" },
  },
  ID: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Idaho Code 6-303(2)" },
    lease_violation:   { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Idaho Code 6-303(3)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Idaho Code 55-208" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Idaho Code 55-208" },
  },
  MT: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: true,  citation: "Mont. Code Ann. 70-24-422" },
    lease_violation:   { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Mont. Code Ann. 70-24-422" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mont. Code Ann. 70-24-441" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Mont. Code Ann. 70-24-441" },
  },
  WV: {
    nonpayment:        { notice_days: 0,  business_days: false, cure_allowed: false, citation: "W. Va. Code 55-3A-1 (no statutory notice for nonpayment)" },
    lease_violation:   { notice_days: 0,  business_days: false, cure_allowed: false, citation: "W. Va. Code 55-3A-1" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "W. Va. Code 37-6-5" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "W. Va. Code 37-6-5" },
  },
  ME: {
    nonpayment:        { notice_days: 7,  business_days: false, cure_allowed: false, citation: "Me. Rev. Stat. tit. 14 sec. 6002" },
    lease_violation:   { notice_days: 7,  business_days: false, cure_allowed: false, citation: "Me. Rev. Stat. tit. 14 sec. 6002" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Me. Rev. Stat. tit. 14 sec. 6002" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Me. Rev. Stat. tit. 14 sec. 6002" },
  },
  NH: {
    nonpayment:        { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "N.H. Rev. Stat. Ann. 540:3" },
    lease_violation:   { notice_days: 7,  business_days: false, cure_allowed: false, citation: "N.H. Rev. Stat. Ann. 540:3" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.H. Rev. Stat. Ann. 540:3 (good cause required for restricted properties)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.H. Rev. Stat. Ann. 540:3" },
  },
  RI: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "R.I. Gen. Laws 34-18-35" },
    lease_violation:   { notice_days: 20, business_days: false, cure_allowed: true,  citation: "R.I. Gen. Laws 34-18-36" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "R.I. Gen. Laws 34-18-37" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "R.I. Gen. Laws 34-18-37" },
  },
  VT: {
    nonpayment:        { notice_days: 14, business_days: false, cure_allowed: true,  citation: "Vt. Stat. Ann. tit. 9 sec. 4467" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: true,  citation: "Vt. Stat. Ann. tit. 9 sec. 4467" },
    no_cause:          { notice_days: 60, business_days: false, cure_allowed: false, citation: "Vt. Stat. Ann. tit. 9 sec. 4467 (>2y tenancy)" },
    month_to_month:    { notice_days: 60, business_days: false, cure_allowed: false, citation: "Vt. Stat. Ann. tit. 9 sec. 4467" },
  },
  AK: {
    nonpayment:        { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Alaska Stat. 34.03.220(a)(2)" },
    lease_violation:   { notice_days: 10, business_days: false, cure_allowed: true,  citation: "Alaska Stat. 34.03.220(a)(1)" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Alaska Stat. 34.03.290" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Alaska Stat. 34.03.290" },
  },
  ND: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "N.D. Cent. Code 47-32-01" },
    lease_violation:   { notice_days: 3,  business_days: false, cure_allowed: false, citation: "N.D. Cent. Code 47-32-01" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.D. Cent. Code 47-16-15" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "N.D. Cent. Code 47-16-15" },
  },
  SD: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "S.D. Codified Laws 21-16-2" },
    lease_violation:   { notice_days: 3,  business_days: false, cure_allowed: false, citation: "S.D. Codified Laws 21-16-2" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "S.D. Codified Laws 43-32-13" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "S.D. Codified Laws 43-32-13" },
  },
  WY: {
    nonpayment:        { notice_days: 3,  business_days: false, cure_allowed: false, citation: "Wyo. Stat. Ann. 1-21-1003" },
    lease_violation:   { notice_days: 0,  business_days: false, cure_allowed: false, citation: "Wyo. Stat. Ann. 1-21-1003" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Wyo. Stat. Ann. 1-21-1203" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Wyo. Stat. Ann. 1-21-1203" },
  },
  DE: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "Del. Code Ann. tit. 25 sec. 5502" },
    lease_violation:   { notice_days: 7,  business_days: false, cure_allowed: true,  citation: "Del. Code Ann. tit. 25 sec. 5513" },
    no_cause:          { notice_days: 60, business_days: false, cure_allowed: false, citation: "Del. Code Ann. tit. 25 sec. 5106" },
    month_to_month:    { notice_days: 60, business_days: false, cure_allowed: false, citation: "Del. Code Ann. tit. 25 sec. 5106" },
  },
  DC: {
    nonpayment:        { notice_days: 30, business_days: false, cure_allowed: true,  citation: "D.C. Code 42-3505.01(a)" },
    lease_violation:   { notice_days: 30, business_days: false, cure_allowed: true,  citation: "D.C. Code 42-3505.01(b)" },
    no_cause:          { notice_days: 90, business_days: false, cure_allowed: false, citation: "D.C. Code 42-3505.01 (Rental Housing Act limits no-cause)" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "D.C. Code 42-3202" },
  },
  VA: {
    nonpayment:        { notice_days: 5,  business_days: false, cure_allowed: true,  citation: "Va. Code Ann. 55.1-1245" },
    lease_violation:   { notice_days: 21, business_days: false, cure_allowed: true,  citation: "Va. Code Ann. 55.1-1245" },
    no_cause:          { notice_days: 30, business_days: false, cure_allowed: false, citation: "Va. Code Ann. 55.1-1253" },
    month_to_month:    { notice_days: 30, business_days: false, cure_allowed: false, citation: "Va. Code Ann. 55.1-1253" },
  },
};

// data/legal/state-minimum-wage.json
// Each entry: minimum_wage, tipped_minimum_cash, citation, verified_on.
// Federal floors: $7.25 / $2.13 (FLSA 29 USC 206 / 203(m)).
export const STATE_MINIMUM_WAGE = {
  FED: { minimum_wage: 7.25, tipped_minimum_cash: 2.13, citation: "29 USC 206 / 203(m)", verified_on: "2025-01-15" },
  CA:  { minimum_wage: 16.50, tipped_minimum_cash: 16.50, citation: "Cal. Lab. Code 1182.12 (no tip credit)", verified_on: "2025-01-15" },
  TX:  { minimum_wage: 7.25, tipped_minimum_cash: 2.13, citation: "Tex. Lab. Code 62.051 (federal floor)", verified_on: "2025-01-15" },
  NY:  { minimum_wage: 16.50, tipped_minimum_cash: 11.00, citation: "N.Y. Lab. Law 652 (NYC/LI/Westchester 2025)", verified_on: "2025-01-15" },
  FL:  { minimum_wage: 13.00, tipped_minimum_cash: 9.98,  citation: "Fla. Const. art. X 24 (Sept 2024 schedule)", verified_on: "2025-01-15" },
  OH:  { minimum_wage: 10.70, tipped_minimum_cash: 5.35,  citation: "Ohio Const. art. II 34a (2025)", verified_on: "2025-01-15" },
  IL:  { minimum_wage: 15.00, tipped_minimum_cash: 9.00,  citation: "820 ILCS 105/4 (2025)", verified_on: "2025-01-15" },
  WA:  { minimum_wage: 16.66, tipped_minimum_cash: 16.66, citation: "Wash. Rev. Code 49.46.020 (no tip credit)", verified_on: "2025-01-15" },
  MA:  { minimum_wage: 15.00, tipped_minimum_cash: 6.75,  citation: "Mass. Gen. Laws ch. 151 1", verified_on: "2025-01-15" },
  PA:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.83,  citation: "43 P.S. 333.104 (federal floor)", verified_on: "2025-01-15" },
  GA:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "O.C.G.A. 34-4-3 (federal floor for FLSA-covered)", verified_on: "2025-01-15" },
  AZ:  { minimum_wage: 14.70, tipped_minimum_cash: 11.70, citation: "Ariz. Rev. Stat. 23-363", verified_on: "2025-01-15" },
  CO:  { minimum_wage: 14.81, tipped_minimum_cash: 11.79, citation: "Colo. Rev. Stat. 8-6-106 (Wage Order 41)", verified_on: "2025-01-15" },
  MI:  { minimum_wage: 12.48, tipped_minimum_cash: 4.74,  citation: "Mich. Comp. Laws 408.934 (2025 schedule)", verified_on: "2025-01-15" },
  NJ:  { minimum_wage: 15.49, tipped_minimum_cash: 5.62,  citation: "N.J. Stat. Ann. 34:11-56a4 (CPI-indexed)", verified_on: "2025-01-15" },
  NV:  { minimum_wage: 12.00, tipped_minimum_cash: 12.00, citation: "Nev. Const. art. 15 sec. 16 (no tip credit)", verified_on: "2025-01-15" },
  OR:  { minimum_wage: 14.70, tipped_minimum_cash: 14.70, citation: "Or. Rev. Stat. 653.025 (no tip credit; Portland Metro tier)", verified_on: "2025-01-15" },
  MD:  { minimum_wage: 15.00, tipped_minimum_cash: 3.63,  citation: "Md. Code Ann., Lab. & Empl. 3-413", verified_on: "2025-01-15" },
  CT:  { minimum_wage: 16.35, tipped_minimum_cash: 6.38,  citation: "Conn. Gen. Stat. 31-58 (waitstaff)", verified_on: "2025-01-15" },
  MN:  { minimum_wage: 11.13, tipped_minimum_cash: 11.13, citation: "Minn. Stat. 177.24 (no tip credit)", verified_on: "2025-01-15" },
  VA:  { minimum_wage: 12.41, tipped_minimum_cash: 2.13,  citation: "Va. Code Ann. 40.1-28.10 (2025 schedule)", verified_on: "2025-01-15" },
  NC:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "N.C. Gen. Stat. 95-25.3 (federal floor)", verified_on: "2025-01-15" },
  AL:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Ala. Code (no state minimum; FLSA federal floor)", verified_on: "2025-01-15" },
  IN:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Ind. Code 22-2-2-4 (federal floor)", verified_on: "2025-01-15" },
  MO:  { minimum_wage: 13.75, tipped_minimum_cash: 6.88,  citation: "Mo. Rev. Stat. 290.502 (Prop A 2018; CPI-indexed)", verified_on: "2025-01-15" },
  TN:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Tenn. (no state minimum; FLSA federal floor)", verified_on: "2025-01-15" },
  WI:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.33,  citation: "Wis. Stat. 104.035 (federal floor)", verified_on: "2025-01-15" },
  AK:  { minimum_wage: 11.91, tipped_minimum_cash: 11.91, citation: "Alaska Stat. 23.10.065 (no tip credit)", verified_on: "2025-01-15" },
  HI:  { minimum_wage: 14.00, tipped_minimum_cash: 12.75, citation: "Haw. Rev. Stat. 387-2 (2025 schedule)", verified_on: "2025-01-15" },
  RI:  { minimum_wage: 15.00, tipped_minimum_cash: 3.89,  citation: "R.I. Gen. Laws 28-12-3 (2025)", verified_on: "2025-01-15" },
  VT:  { minimum_wage: 14.01, tipped_minimum_cash: 7.01,  citation: "Vt. Stat. Ann. tit. 21 sec. 384", verified_on: "2025-01-15" },
  AR:  { minimum_wage: 11.00, tipped_minimum_cash: 2.63,  citation: "Ark. Code Ann. 11-4-210", verified_on: "2025-01-15" },
  DE:  { minimum_wage: 15.00, tipped_minimum_cash: 2.23,  citation: "Del. Code Ann. tit. 19 sec. 902 (2025)", verified_on: "2025-01-15" },
  DC:  { minimum_wage: 17.50, tipped_minimum_cash: 10.00, citation: "D.C. Code 32-1003", verified_on: "2025-01-15" },
  IA:  { minimum_wage: 7.25,  tipped_minimum_cash: 4.35,  citation: "Iowa Code 91D.1 (federal floor)", verified_on: "2025-01-15" },
  ID:  { minimum_wage: 7.25,  tipped_minimum_cash: 3.35,  citation: "Idaho Code 44-1502 (federal floor)", verified_on: "2025-01-15" },
  KS:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Kan. Stat. Ann. 44-1203 (federal floor)", verified_on: "2025-01-15" },
  KY:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Ky. Rev. Stat. 337.275 (federal floor)", verified_on: "2025-01-15" },
  LA:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "La. (no state minimum; FLSA federal floor)", verified_on: "2025-01-15" },
  ME:  { minimum_wage: 14.65, tipped_minimum_cash: 7.33,  citation: "Me. Rev. Stat. tit. 26 sec. 664", verified_on: "2025-01-15" },
  MS:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Miss. (no state minimum; FLSA federal floor)", verified_on: "2025-01-15" },
  MT:  { minimum_wage: 10.55, tipped_minimum_cash: 10.55, citation: "Mont. Code Ann. 39-3-409 (no tip credit)", verified_on: "2025-01-15" },
  NE:  { minimum_wage: 13.50, tipped_minimum_cash: 2.13,  citation: "Neb. Rev. Stat. 48-1203 (Initiative 433, 2025)", verified_on: "2025-01-15" },
  NH:  { minimum_wage: 7.25,  tipped_minimum_cash: 3.27,  citation: "N.H. Rev. Stat. Ann. 279:21 (federal floor)", verified_on: "2025-01-15" },
  NM:  { minimum_wage: 12.00, tipped_minimum_cash: 3.00,  citation: "N.M. Stat. Ann. 50-4-22", verified_on: "2025-01-15" },
  ND:  { minimum_wage: 7.25,  tipped_minimum_cash: 4.86,  citation: "N.D. Cent. Code 34-06-22 (federal floor)", verified_on: "2025-01-15" },
  OK:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Okla. Stat. tit. 40 sec. 197.5 (federal floor)", verified_on: "2025-01-15" },
  SC:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "S.C. (no state minimum; FLSA federal floor)", verified_on: "2025-01-15" },
  SD:  { minimum_wage: 11.50, tipped_minimum_cash: 5.75,  citation: "S.D. Codified Laws 60-11-3 (CPI-indexed)", verified_on: "2025-01-15" },
  UT:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Utah Code Ann. 34-40-103 (federal floor)", verified_on: "2025-01-15" },
  WV:  { minimum_wage: 8.75,  tipped_minimum_cash: 2.62,  citation: "W. Va. Code 21-5C-2", verified_on: "2025-01-15" },
  WY:  { minimum_wage: 7.25,  tipped_minimum_cash: 2.13,  citation: "Wyo. Stat. Ann. 27-4-202 (federal floor for FLSA-covered)", verified_on: "2025-01-15" },
};

// Small claims thresholds (jurisdictional max). Filing fee shown as a
// representative range; the user is responsible for the local schedule.
// Original plain-English summary.
export const SMALL_CLAIMS_THRESHOLDS = {
  CA: { max_dollars: 12500, individual_max: 12500, business_max: 6250, attorney_allowed: false, fee_range: "$30 - $75", citation: "Cal. Civ. Proc. Code 116.220" },
  TX: { max_dollars: 20000, attorney_allowed: true,  fee_range: "$54 - $124", citation: "Tex. Gov't Code 27.031 (justice court)" },
  NY: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$15 - $20",  citation: "N.Y. UCCA 1801 (NYC) / U.J.C.A. 1801 (other)" },
  FL: { max_dollars: 8000,  attorney_allowed: true,  fee_range: "$55 - $400", citation: "Fla. Sm. Cl. R. 7.010" },
  OH: { max_dollars: 6000,  attorney_allowed: true,  fee_range: "$30 - $90",  citation: "Ohio Rev. Code 1925.02" },
  IL: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$89 - $267", citation: "Ill. Sup. Ct. R. 281" },
  PA: { max_dollars: 12000, attorney_allowed: true,  fee_range: "$50 - $130", citation: "42 Pa.C.S. 1515 (MDJ)" },
  MA: { max_dollars: 7000,  attorney_allowed: true,  fee_range: "$40 - $150", citation: "Mass. Gen. Laws ch. 218 sec. 21" },
  WA: { max_dollars: 10000, attorney_allowed: false, fee_range: "$50 - $150", citation: "Wash. Rev. Code 12.40.010" },
  GA: { max_dollars: 15000, attorney_allowed: true,  fee_range: "$30 - $50",  citation: "O.C.G.A. 15-10-2" },
  MI: { max_dollars: 7000,  attorney_allowed: false, fee_range: "$30 - $70",  citation: "Mich. Comp. Laws 600.8401" },
  NJ: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$15 - $35",  citation: "N.J. Stat. Ann. 2A:18-61" },
  AZ: { max_dollars: 3500,  attorney_allowed: false, fee_range: "$26 - $43",  citation: "Ariz. Rev. Stat. 22-503" },
  CO: { max_dollars: 7500,  attorney_allowed: false, fee_range: "$31 - $55",  citation: "Colo. Rev. Stat. 13-6-403" },
  NC: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$96 - $150", citation: "N.C. Gen. Stat. 7A-210" },
  VA: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$30 - $80",  citation: "Va. Code Ann. 16.1-77 (general district)" },
  MD: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$36 - $50",  citation: "Md. Code Ann., Cts. & Jud. Proc. 4-405" },
  TN: { max_dollars: 25000, attorney_allowed: true,  fee_range: "$50 - $200", citation: "Tenn. Code Ann. 16-15-501 (general sessions court)" },
  IN: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$45 - $99",  citation: "Ind. Code 33-29-2-4 (small claims docket)" },
  MN: { max_dollars: 20000, attorney_allowed: true,  fee_range: "$70 - $80",  citation: "Minn. Stat. 491A.01 (conciliation court)" },
  MO: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$15 - $50",  citation: "Mo. Rev. Stat. 482.305" },
  CT: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$35 - $90",  citation: "Conn. Gen. Stat. 51-15 (small claims session)" },
  OR: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$53 - $123", citation: "Or. Rev. Stat. 46.405" },
  KY: { max_dollars: 2500,  attorney_allowed: true,  fee_range: "$25 - $80",  citation: "Ky. Rev. Stat. 24A.230" },
  AL: { max_dollars: 6000,  attorney_allowed: true,  fee_range: "$50 - $250", citation: "Ala. Code 12-12-30" },
  AK: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$75 - $150", citation: "Alaska R. Civ. P. 16.2" },
  AR: { max_dollars: 5000,  attorney_allowed: false, fee_range: "$80 - $130", citation: "Ark. Code Ann. 16-17-710" },
  DE: { max_dollars: 25000, attorney_allowed: true,  fee_range: "$45 - $100", citation: "Del. Code Ann. tit. 10 sec. 9301" },
  DC: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$5 - $45",   citation: "D.C. Code 16-3901" },
  HI: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$35 - $60",  citation: "Haw. Rev. Stat. 633-27" },
  ID: { max_dollars: 5000,  attorney_allowed: false, fee_range: "$25 - $69",  citation: "Idaho Code 1-2301" },
  IA: { max_dollars: 6500,  attorney_allowed: true,  fee_range: "$95 - $185", citation: "Iowa Code 631.1" },
  KS: { max_dollars: 4000,  attorney_allowed: false, fee_range: "$39 - $74",  citation: "Kan. Stat. Ann. 61-2703" },
  LA: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$50 - $200", citation: "La. Code Civ. Proc. art. 4831 (city / parish)" },
  ME: { max_dollars: 6000,  attorney_allowed: true,  fee_range: "$70 - $120", citation: "Me. Rev. Stat. tit. 14 sec. 7482" },
  MS: { max_dollars: 3500,  attorney_allowed: true,  fee_range: "$35 - $130", citation: "Miss. Code Ann. 9-11-9 (justice court)" },
  MT: { max_dollars: 7000,  attorney_allowed: true,  fee_range: "$30 - $50",  citation: "Mont. Code Ann. 25-35-502" },
  NE: { max_dollars: 3900,  attorney_allowed: false, fee_range: "$25 - $50",  citation: "Neb. Rev. Stat. 25-2802 (CPI-indexed)" },
  NV: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$45 - $145", citation: "Nev. Just. Ct. R. Civ. P. 88" },
  NH: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$90 - $145", citation: "N.H. Rev. Stat. Ann. 503:1" },
  NM: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$55 - $77",  citation: "N.M. Magis. Ct. R. Civ. P. 2-101" },
  ND: { max_dollars: 15000, attorney_allowed: false, fee_range: "$40 - $80",  citation: "N.D. Cent. Code 27-08.1-01" },
  OK: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$58 - $158", citation: "Okla. Stat. tit. 12 sec. 1751" },
  RI: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$35 - $50",  citation: "R.I. Gen. Laws 10-16-1" },
  SC: { max_dollars: 7500,  attorney_allowed: true,  fee_range: "$55 - $125", citation: "S.C. Code Ann. 22-3-10 (magistrate)" },
  SD: { max_dollars: 12000, attorney_allowed: true,  fee_range: "$30 - $80",  citation: "S.D. Codified Laws 15-39-45" },
  UT: { max_dollars: 15000, attorney_allowed: true,  fee_range: "$60 - $185", citation: "Utah Code Ann. 78A-8-102" },
  VT: { max_dollars: 5000,  attorney_allowed: true,  fee_range: "$90 - $295", citation: "Vt. R. Small Claims P. 1" },
  WV: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$45 - $100", citation: "W. Va. Code 50-2-1 (magistrate)" },
  WI: { max_dollars: 10000, attorney_allowed: true,  fee_range: "$22 - $94",  citation: "Wis. Stat. 799.01" },
  WY: { max_dollars: 6000,  attorney_allowed: true,  fee_range: "$30 - $55",  citation: "Wyo. Stat. Ann. 1-21-201" },
};

// --- Shared notice ---
const LEGAL_NOTICE = "This is legal information, not legal advice. Statutes and court rules change. Verify with current state code and a licensed attorney before relying on this for a filing or a deadline.";

function makeNotice(text) {
  const p = document.createElement("p");
  p.className = "tool-notice";
  p.textContent = text;
  return p;
}

// --- Date helpers (UTC, no locale dependence) ---

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isFinite(d.getTime()) ? d : null;
}
function addDays(d, n) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}
function dayDiff(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
function isoDate(d) { return d.toISOString().slice(0, 10); }
function isWeekend(d) {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}
function isFederalHoliday(d) {
  const yr = d.getUTCFullYear();
  const list = FEDERAL_COURT_HOLIDAYS[yr] || [];
  return list.includes(isoDate(d));
}

// --- 246: Statutory Judgment Interest ---
//
// Inputs: principal, state, judgment date, accrual-through date, optional
// partial payments (each {date, amount}). Output: simple or compound
// interest accrued per the state's rule, running balance, per-day rate.
//
// Partial-payment rule: U.S. Rule (apply payment to accrued interest
// first, then principal). Stated explicitly in the inline notice.

// dims: in { principal: dimensionless, state: dimensionless, judgment_date: dimensionless, accrual_date: dimensionless, partial_payments: dimensionless }
//        out: { state: dimensionless, rate_pct: dimensionless, accrual: dimensionless, citation: dimensionless, rows: dimensionless, principal_remaining: dimensionless, accrued_interest: dimensionless, total_owed: dimensionless, per_day_accrual_at_end: dimensionless, notice: dimensionless }
// (Monetary principals, balances, and per-day accrual are
//  dimensionless dollar aggregates per the §7.1 monetary convention
//  (calc-kitchen computePlateCost precedent). ISO dates, state /
//  rule tokens, and the per-period row array are categorical
//  (dimensionless). The state-keyed rate-percent is a dimensionless
//  ratio; the daily-compounding factor (1 + r/365)^days reduces to
//  a dimensionless multiplier on the balance.)
export function computeJudgmentInterest({
  principal = 0, state = "CA", judgment_date, accrual_date,
  partial_payments = [],
}) {
  if (!(principal > 0)) return { error: "Principal must be positive." };
  const params = JUDGMENT_INTEREST_RATES[state];
  if (!params) return { error: "State " + state + " not bundled." };
  const start = parseDate(judgment_date);
  const end = parseDate(accrual_date);
  if (!start || !end) return { error: "Invalid date." };
  if (end < start) return { error: "Accrual date is before judgment date." };
  const r_annual = params.rate_pct / 100;
  const events = [
    { kind: "start", date: start, amount: principal },
    ...partial_payments
      .map((p) => ({ kind: "payment", date: parseDate(p.date), amount: Number(p.amount) || 0 }))
      .filter((p) => p.date && p.amount > 0)
      .sort((a, b) => a.date - b.date),
    { kind: "end", date: end, amount: 0 },
  ];
  let balance = principal;
  let accrued_interest = 0;
  let cursor = start;
  const rows = [];
  for (let i = 1; i < events.length; i++) {
    const ev = events[i];
    const days = dayDiff(cursor, ev.date);
    if (days > 0) {
      let interest_period;
      if (params.accrual === "compound") {
        // Daily compounding, unrounded.
        const factor = Math.pow(1 + r_annual / 365, days);
        interest_period = balance * (factor - 1);
      } else {
        interest_period = balance * r_annual * (days / 365);
      }
      accrued_interest += interest_period;
      rows.push({ from: isoDate(cursor), to: isoDate(ev.date), days, interest: interest_period, balance_before_payment: balance });
    }
    if (ev.kind === "payment") {
      // U.S. Rule: payment applies to accrued interest first, then principal.
      const to_interest = Math.min(accrued_interest, ev.amount);
      const remainder = ev.amount - to_interest;
      accrued_interest -= to_interest;
      balance = Math.max(0, balance - remainder);
      rows.push({ payment_date: isoDate(ev.date), payment_amount: ev.amount, applied_to_interest: to_interest, applied_to_principal: remainder, principal_remaining: balance });
    }
    cursor = ev.date;
  }
  const total_owed = balance + accrued_interest;
  const per_day_at_end = balance * r_annual / 365;
  return {
    state, rate_pct: params.rate_pct, accrual: params.accrual, citation: params.citation,
    rows, principal_remaining: balance, accrued_interest, total_owed,
    per_day_accrual_at_end: per_day_at_end,
    notice: "Partial payments applied under the U.S. Rule (interest first, then principal).",
  };
}

export const judgmentInterestExample = {
  inputs: {
    principal: 10000, state: "CA",
    judgment_date: "2024-01-01", accrual_date: "2025-01-01",
    partial_payments: [],
  },
};

// --- 247: Court-Day and Calendar-Day Deadline Calculator ---
//
// Fed. R. Civ. P. 6: trigger-day excluded; for periods stated in days,
// last day rolls forward off Saturday, Sunday, or legal holiday. For
// "court days," intermediate weekends and legal holidays are skipped
// (used for periods less than 11 days under some local rules).

// dims: in { trigger_date: dimensionless, days: dimensionless, day_type: dimensionless, jurisdiction: dimensionless }
//        out: { deadline: dimensionless, skipped: dimensionless, citation: dimensionless }
// (FRCP 6 day-counting reduces to integer-day arithmetic over a
//  bundled holiday list. Dates are formatted strings; the day-type
//  toggle and jurisdiction are categorical tokens. Days, deadline,
//  skipped-day rows, and the citation are all categorical /
//  dimensionless from the dimensional-analysis perspective.)
export function computeDeadline({
  trigger_date, days = 0, day_type = "calendar", jurisdiction = "FED",
}) {
  const start = parseDate(trigger_date);
  if (!start) return { error: "Invalid trigger date." };
  const n = Math.floor(Number(days));
  if (!(n > 0)) return { error: "Days must be positive." };
  const skipped = [];
  if (day_type === "court") {
    // Skip non-court days while counting forward.
    let cur = start;
    let counted = 0;
    while (counted < n) {
      cur = addDays(cur, 1);
      if (isWeekend(cur) || isFederalHoliday(cur)) {
        skipped.push({ date: isoDate(cur), reason: isFederalHoliday(cur) ? "federal holiday" : "weekend" });
        continue;
      }
      counted++;
    }
    // Per FRCP 6(a)(3): if the deadline falls on inaccessible day, roll forward.
    while (isWeekend(cur) || isFederalHoliday(cur)) cur = addDays(cur, 1);
    return { deadline: isoDate(cur), skipped, citation: "Fed. R. Civ. P. 6(a)(2)/(a)(3); jurisdiction " + jurisdiction };
  }
  // Calendar-day: count straight forward, then roll off weekend/holiday at end.
  let end = addDays(start, n);
  while (isWeekend(end) || isFederalHoliday(end)) {
    skipped.push({ date: isoDate(end), reason: isFederalHoliday(end) ? "federal holiday" : "weekend" });
    end = addDays(end, 1);
  }
  return { deadline: isoDate(end), skipped, citation: "Fed. R. Civ. P. 6(a)(1); jurisdiction " + jurisdiction };
}

export const deadlineExample = { inputs: { trigger_date: "2025-07-01", days: 30, day_type: "calendar", jurisdiction: "FED" } };

// --- 248: Statute of Limitations Quick-Read ---

// dims: in { state: dimensionless, claim_type: dimensionless }
//        out: { state: dimensionless, claim_type: dimensionless, years: dimensionless, accrual: dimensionless, citation: dimensionless }
// (Pure state-shard lookup. Statute-of-limitations duration in
//  years is a calendar count (dimensionless integer per the §7.1
//  count convention); all other outputs are categorical tokens.)
export function computeStatuteOfLimitations({ state = "CA", claim_type = "contract_written" }) {
  const st = STATUTE_OF_LIMITATIONS[state];
  if (!st) return { error: "State " + state + " not bundled." };
  const row = st[claim_type];
  if (!row) return { error: "Claim type " + claim_type + " not bundled for " + state + "." };
  return { state, claim_type, years: row.years, accrual: row.accrual, citation: row.citation };
}

export const sotlExample = { inputs: { state: "CA", claim_type: "contract_written" } };

// --- 249: Small Claims Court Threshold and Filing Fee Reference ---

// dims: in { state: dimensionless }
//        out: { state: dimensionless, max_amount: dimensionless, filing_fee: dimensionless, citation: dimensionless }
// (Pure state-shard lookup of small-claims jurisdictional limits.
//  All amounts are dimensionless dollar references per the §7.1
//  monetary convention; the citation is a categorical token.)
export function computeSmallClaimsReference({ state = "CA" }) {
  const row = SMALL_CLAIMS_THRESHOLDS[state];
  if (!row) return { error: "State " + state + " not bundled." };
  return { state, ...row };
}

export const smallClaimsExample = { inputs: { state: "CA" } };

// --- 250: Tenant Notice and Cure-Period Quick-Read ---

// dims: in { state: dimensionless, notice_type: dimensionless }
//        out: { state: dimensionless, notice_type: dimensionless, days: dimensionless, citation: dimensionless, self_help_warning: dimensionless }
// (Pure state-shard lookup of cure-period rules. The cure window
//  in days is a categorical lookup result (dimensionless count per
//  the §7.1 convention); all other fields are categorical tokens.)
export function computeTenantNotice({ state = "CA", notice_type = "nonpayment" }) {
  const st = LANDLORD_TENANT_NOTICE[state];
  if (!st) return { error: "State " + state + " not bundled." };
  const row = st[notice_type];
  if (!row) return { error: "Notice type " + notice_type + " not bundled for " + state + "." };
  return { state, notice_type, ...row, self_help_warning: "Do not change the locks. The state procedure is the procedure." };
}

export const tenantNoticeExample = { inputs: { state: "CA", notice_type: "nonpayment" } };

// --- 251: Wage and Hour Math (FLSA Overtime, Tipped) ---
//
// Regular pay for hours up to 40, OT at 1.5x for hours over 40. Tipped
// employee: cash wage + tips must reach the higher of state or federal
// minimum; employer makes up the shortfall.

// dims: in { hourly_rate: dimensionless, hours_worked: T, state: dimensionless, is_tipped: dimensionless, cash_tips: dimensionless }
//        out: { state: dimensionless, applicable_minimum: dimensionless, federal_minimum: dimensionless, state_minimum: dimensionless, regular_hours: T, overtime_hours: T, regular_pay: dimensionless, overtime_pay: dimensionless, tip_makeup: dimensionless, gross_pay: dimensionless, citation: dimensionless }
// (Hours worked carries the §7.1 base-token `T` (time leg of the
//  shortcut); hourly_rate and minima are dimensionless dollars-
//  per-hour aggregates per the §7.1 monetary convention; pay
//  components are dimensionless dollar aggregates. The 40-hour
//  pivot and 1.5x OT multiplier are dimensionless constants.)
export function computeWageHour({
  hourly_rate = 0, hours_worked = 0, state = "FED",
  is_tipped = false, cash_tips = 0,
}) {
  if (!(hourly_rate >= 0)) return { error: "Hourly rate cannot be negative." };
  if (!(hours_worked >= 0)) return { error: "Hours cannot be negative." };
  const stateRow = STATE_MINIMUM_WAGE[state] || STATE_MINIMUM_WAGE.FED;
  const fed = STATE_MINIMUM_WAGE.FED;
  const minimum = Math.max(stateRow.minimum_wage, fed.minimum_wage);
  const reg_hours = Math.min(hours_worked, 40);
  const ot_hours = Math.max(0, hours_worked - 40);
  const reg_pay = reg_hours * hourly_rate;
  const ot_pay = ot_hours * hourly_rate * 1.5;
  let tip_makeup = 0;
  if (is_tipped) {
    const total_with_tips = reg_pay + ot_pay + Number(cash_tips || 0);
    const total_required = hours_worked * minimum;
    tip_makeup = Math.max(0, total_required - total_with_tips);
  }
  const gross = reg_pay + ot_pay + tip_makeup;
  return {
    state, applicable_minimum: minimum, federal_minimum: fed.minimum_wage, state_minimum: stateRow.minimum_wage,
    regular_hours: reg_hours, overtime_hours: ot_hours,
    regular_pay: reg_pay, overtime_pay: ot_pay,
    tip_makeup, gross_pay: gross,
    citation: stateRow.citation + " (state); 29 USC 207 (FLSA OT)",
  };
}

export const wageHourExample = { inputs: { hourly_rate: 15, hours_worked: 45, state: "CA" } };

// --- spec-v17 S.1 Wage garnishment cap (federal Title III) ---
//
// Consumer Credit Protection Act Title III (15 USC 1673) and DOL Wage and
// Hour Division Fact Sheet 30. The federal cap is fully public math; the
// per-type rules below are federal. Some states cap garnishment more
// strictly (e.g. a lower percent, or none for consumer debt); the state
// maximum is supplied as an optional override (the lower of the two
// binds) rather than bundling a 50-state shard.
//
// Title III "amount by which disposable exceeds 30x the federal minimum
// wage" uses these per-pay-period multipliers of the hourly minimum
// (DOL Fact Sheet 30): weekly 30, biweekly 60, semimonthly 65, monthly
// 130. Child support / alimony is exempt from the 30x floor and is
// capped at 50-65% of disposable per 15 USC 1673(b)(2).
const GARNISH_MINWAGE_MULTIPLIER = { weekly: 30, biweekly: 60, semimonthly: 65, monthly: 130 };

// dims: in { args: dimensionless } out: { title_iii_max: dimensionless, protected_floor: dimensionless, max_garnishment: dimensionless, protected_amount: dimensionless }
export function computeWageGarnishment({
  disposable_earnings = 0,
  pay_period = "weekly",
  garnishment_type = "consumer",
  supporting_other_dependent = false,
  in_arrears_12wk = false,
  state_cap_pct = null,
  federal_minimum_wage = STATE_MINIMUM_WAGE.FED.minimum_wage,
} = {}) {
  const D = Number(disposable_earnings);
  if (!(D >= 0)) return { error: "Disposable earnings cannot be negative." };
  const mult = GARNISH_MINWAGE_MULTIPLIER[pay_period];
  if (mult === undefined) return { error: "Unknown pay period '" + pay_period + "'." };
  const minWage = Number(federal_minimum_wage);
  const protected_floor = mult * minWage; // amount exempt from the 30x rule
  const above_floor = Math.max(0, D - protected_floor);

  const warnings = [];
  let title_iii_max, applied_pct, floor_applies;
  if (garnishment_type === "consumer") {
    // Lesser of 25% of disposable or the amount above 30x min wage.
    applied_pct = 25;
    floor_applies = true;
    title_iii_max = Math.min(0.25 * D, above_floor);
  } else if (garnishment_type === "student_loan") {
    // ED / DCIA: lesser of 15% of disposable or the amount above 30x min wage.
    applied_pct = 15;
    floor_applies = true;
    title_iii_max = Math.min(0.15 * D, above_floor);
  } else if (garnishment_type === "child_support") {
    // 50% supporting another spouse/child, else 60%; +5% if >12 weeks in arrears.
    applied_pct = (supporting_other_dependent ? 50 : 60) + (in_arrears_12wk ? 5 : 0);
    floor_applies = false; // the 30x floor does not apply to support orders
    title_iii_max = (applied_pct / 100) * D;
    warnings.push("Child-support / alimony orders are exempt from the 30x-minimum-wage floor and may take " + applied_pct + "% of disposable earnings per 15 USC 1673(b).");
  } else {
    return { error: "Unknown garnishment type '" + garnishment_type + "'." };
  }

  // Optional state cap (more restrictive percent of disposable).
  let state_cap_amount = null;
  const scp = state_cap_pct === null || state_cap_pct === "" ? null : Number(state_cap_pct);
  if (scp !== null) {
    if (!(scp >= 0 && scp <= 100)) return { error: "State cap percent must be between 0 and 100." };
    state_cap_amount = (scp / 100) * D;
  }

  let max_garnishment = title_iii_max;
  let binding = "federal Title III";
  if (state_cap_amount !== null && state_cap_amount < max_garnishment) {
    max_garnishment = state_cap_amount;
    binding = "state cap (" + scp + "%)";
  }
  const protected_amount = D - max_garnishment;

  if (D === 0) warnings.push("Disposable earnings are zero; nothing can be garnished.");
  warnings.push("Multiple concurrent garnishments need a priority-of-claims analysis (child support and federal tax take precedence over consumer debt).");

  return {
    disposable_earnings: D,
    pay_period,
    garnishment_type,
    applied_pct,
    floor_applies,
    protected_floor: floor_applies ? protected_floor : 0,
    title_iii_max,
    state_cap_amount,
    max_garnishment,
    binding,
    protected_amount,
    warnings,
  };
}

export const wageGarnishmentExample = {
  // $600 weekly disposable, consumer debt, federal min wage $7.25.
  // 30 x 7.25 = $217.50 floor; 25% x 600 = $150; 600 - 217.50 = $382.50.
  // max = min(150, 382.50) = $150; protected = $450.
  inputs: { disposable_earnings: 600, pay_period: "weekly", garnishment_type: "consumer" },
};

// --- 252: Independent Contractor versus Employee ---
//
// Two checklists. Returns a deterministic categorical result for the
// IRS 20-factor (counted: more "control = employer" factors = employee)
// and the ABC test (all three prongs must be satisfied for contractor).

// dims: in { test: dimensionless, checklist: dimensionless, state: dimensionless }
//        out: { test: dimensionless, state: dimensionless, result: dimensionless, A: dimensionless, B: dimensionless, C: dimensionless, employer_control_count: dimensionless, independent_count: dimensionless, total_answered: dimensionless, reasoning: dimensionless, citation: dimensionless }
// (Pure categorical checklist counter. The IRS 20-factor and ABC
//  branches both return token verdicts plus tally counts; counts
//  are dimensionless integers, verdicts are categorical strings.)
export function computeContractorVsEmployee({
  test = "irs", checklist = {}, state = "FED",
}) {
  if (test === "abc") {
    // ABC: A (free from control), B (outside usual course), C (independently established trade).
    const a = !!checklist.A;
    const b = !!checklist.B;
    const c = !!checklist.C;
    const all_three = a && b && c;
    return {
      test, state,
      result: all_three ? "independent_contractor" : "employee",
      A: a, B: b, C: c,
      reasoning: all_three
        ? "All three prongs satisfied; ABC test classifies as independent contractor."
        : "At least one prong fails; ABC test classifies as employee. Default is employee under the ABC test.",
      citation: state === "CA" ? "Cal. Lab. Code 2775 (Dynamex / AB 5)" : "ABC test (varies by state; some states adopt for wage / unemployment)",
    };
  }
  // IRS 20-factor: count keys that signal employer control.
  const factors = [
    "instructions", "training", "integration", "personal_service", "hiring_assistants",
    "continuing_relationship", "set_hours", "full_time", "work_on_premises", "order_of_work",
    "reports", "payment_method", "expenses_paid", "tools_and_materials", "investment",
    "profit_or_loss", "works_for_more_than_one", "available_to_public", "right_to_discharge", "right_to_terminate",
  ];
  let employer_control = 0;
  let independent_signals = 0;
  for (const f of factors) {
    if (checklist[f] === "employer") employer_control++;
    else if (checklist[f] === "worker") independent_signals++;
  }
  const total_answered = employer_control + independent_signals;
  const result = employer_control > independent_signals ? "employee" : "independent_contractor";
  return {
    test: "irs", state,
    employer_control_count: employer_control, independent_count: independent_signals,
    total_answered, result,
    reasoning: total_answered === 0
      ? "No factors answered."
      : "More factors point to " + (result === "employee" ? "employer control (employee classification)." : "worker independence (contractor classification)."),
    citation: "IRS Rev. Rul. 87-41 (20-factor test); Pub 15-A current edition",
  };
}

export const contractorExample = {
  inputs: { test: "abc", checklist: { A: true, B: false, C: true } },
};

// --- 253: Plain-English Contract Clause Reference ---

export const CONTRACT_CLAUSES = {
  indemnification:        { what: "One side promises to cover the other's losses from listed events.", look_for: "Scope (third-party only, or also direct?), cap, exceptions for the indemnitee's own negligence, duty to defend." },
  limitation_of_liability: { what: "Caps how much one party can recover from the other.", look_for: "Cap amount, carve-outs (gross negligence, IP infringement, confidentiality), exclusion of consequential damages." },
  assignment:             { what: "Whether either party can transfer its rights or duties to a third party.", look_for: "Consent required, change-of-control trigger, anti-assignment of receivables." },
  choice_of_law:          { what: "Which state's law governs interpretation of the contract.", look_for: "Without-regard-to-conflicts language, exclusive forum coupling, mandatory state code overrides." },
  arbitration:            { what: "Disputes resolved by a private arbitrator instead of a court.", look_for: "AAA / JAMS rules, class-action waiver, fee-splitting, carve-out for injunctive relief, seat city." },
  force_majeure:          { what: "Performance is excused for listed extraordinary events.", look_for: "Listed events, notice requirement, mitigation, termination right after duration, payment carve-out." },
  severability:           { what: "If a court strikes one clause, the rest survives.", look_for: "Reformation language, blue-pencil scope (does the court rewrite or just delete?)." },
  integration:            { what: "The written contract is the entire agreement; prior oral promises do not count.", look_for: "Carve-outs for fraud, course-of-dealing exceptions, schedule / SOW inclusion." },
  notice:                 { what: "How and where parties send formal communications.", look_for: "Method (overnight, certified, email), receipt deemed when, address-update procedure." },
};

// --- 254: Plain-English Lease Term Reference ---

export const LEASE_TERMS = {
  rent:                   { what: "Amount, due date, late-fee mechanics, grace period.", look_for: "Late fee cap by state, NSF fee, prorated rent." },
  security_deposit:       { what: "Refundable deposit against damage and unpaid rent.", look_for: "State maximum, return deadline, itemized-deduction requirement, interest required." },
  cam:                    { what: "Common Area Maintenance: tenant's share of operating costs in commercial leases.", look_for: "Cap on annual increase, exclusions (capital improvements, ground rent), audit right, gross-up." },
  holdover:               { what: "Tenant stays past lease end; rent often increases (commonly 1.5x-2x).", look_for: "Multiplier, conversion-to-month-to-month language, eviction trigger." },
  subletting:             { what: "Tenant lets a third party use the space.", look_for: "Consent standard ('reasonably' vs 'sole discretion'), profit-sharing on sublet, prohibition." },
  repair_and_deduct:      { what: "Tenant repairs and deducts cost from rent if landlord fails to.", look_for: "State availability, dollar cap (often 1 month rent), notice-and-cure procedure." },
  prevailing_party_fees:  { what: "Loser pays winner's attorney fees in any dispute.", look_for: "Reciprocity (some states force two-way), cap, exclusion of mediation costs." },
  jury_trial_waiver:      { what: "Both sides give up the right to a jury trial.", look_for: "Enforceability by state, scope (all disputes vs only those arising from this lease), bench trial procedure." },
};

// Per-clause / per-term lookup wrappers. The renderer reads CONTRACT_CLAUSES
// and LEASE_TERMS directly; these compute fns expose the same lookup so
// the v10 §C runner can verify a known clause/term resolves to its
// published definition.
// dims: in { clause: dimensionless }
//        out: { clause: dimensionless, what: dimensionless, look_for: dimensionless }
// (Plain-English clause-explainer lookup. Inputs and outputs are
//  categorical reference strings (dimensionless).)
export function computeContractClauseReference({ clause }) {
  const c = CONTRACT_CLAUSES[clause];
  if (!c) return { error: "Unknown clause." };
  return { clause, what: c.what, look_for: c.look_for };
}
// dims: in { term: dimensionless }
//        out: { term: dimensionless, what: dimensionless, look_for: dimensionless }
// (Plain-English lease-term-explainer lookup. Inputs and outputs
//  are categorical reference strings (dimensionless).)
export function computeLeaseTermReference({ term }) {
  const t = LEASE_TERMS[term];
  if (!t) return { error: "Unknown lease term." };
  return { term, what: t.what, look_for: t.look_for };
}

// --- Renderers ---

function renderJudgmentInterest(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per-state judgment-interest statute, cited by section number. Bundled rates verified on the date stamped on each entry.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  const principal = makeNumber("Judgment principal (USD)", "ji-p", { step: "any", min: "0" });
  const state = makeSelect("State", "ji-s", Object.keys(JUDGMENT_INTEREST_RATES).map((k) => ({ value: k, label: k + " (" + JUDGMENT_INTEREST_RATES[k].rate_pct + "% " + JUDGMENT_INTEREST_RATES[k].accrual + ")" })));
  const jdate = makeText("Judgment date (YYYY-MM-DD)", "ji-jd");
  const adate = makeText("Accrual through (YYYY-MM-DD)", "ji-ad");
  const partials = makeTextarea("Partial payments (date,amount per line, optional)", "ji-pp", { rows: "3" });
  for (const f of [principal, state, jdate, adate, partials]) inputRegion.appendChild(f.wrap);
  const owedOut = makeOutputLine(outputRegion, "Total owed", "ji-out-t");
  const intOut = makeOutputLine(outputRegion, "Accrued interest", "ji-out-i");
  const balOut = makeOutputLine(outputRegion, "Principal remaining", "ji-out-b");
  const dailyOut = makeOutputLine(outputRegion, "Per-day accrual at end", "ji-out-d");
  const citeOut = makeOutputLine(outputRegion, "Citation", "ji-out-c");
  const update = debounce(() => {
    const pp = String(partials.input.value || "").split("\n").map((s) => s.split(",").map((x) => x.trim()))
      .filter((p) => p.length === 2 && p[0] && p[1])
      .map((p) => ({ date: p[0], amount: Number(p[1]) }));
    const r = computeJudgmentInterest({
      principal: Number(principal.input.value), state: state.select.value,
      judgment_date: jdate.input.value, accrual_date: adate.input.value, partial_payments: pp,
    });
    if (r.error) { owedOut.textContent = r.error; intOut.textContent = balOut.textContent = dailyOut.textContent = citeOut.textContent = ""; return; }
    owedOut.textContent = "$" + fmt(r.total_owed, 2);
    intOut.textContent = "$" + fmt(r.accrued_interest, 2);
    balOut.textContent = "$" + fmt(r.principal_remaining, 2);
    dailyOut.textContent = "$" + fmt(r.per_day_accrual_at_end, 4);
    citeOut.textContent = r.citation;
  }, DEBOUNCE_MS);
  for (const el of [principal.input, state.select, jdate.input, adate.input, partials.input]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    principal.input.value = 10000; state.select.value = "CA"; jdate.input.value = "2024-01-01"; adate.input.value = "2025-01-01"; partials.input.value = ""; update();
  });
}

function renderDeadline(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Fed. R. Civ. P. 6(a) for federal computation. State equivalents track the federal rule with minor variations; bundled federal-court holidays for the current and next two years.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  const trig = makeText("Trigger date (YYYY-MM-DD)", "dl-t");
  const days = makeNumber("Days", "dl-d", { step: "1", min: "1" });
  const dt = makeSelect("Day type", "dl-dt", [
    { value: "calendar", label: "Calendar days" },
    { value: "court", label: "Court days (skip weekends/holidays)" },
  ]);
  for (const f of [trig, days, dt]) inputRegion.appendChild(f.wrap);
  const ddOut = makeOutputLine(outputRegion, "Deadline", "dl-out-d");
  const skipOut = makeOutputLine(outputRegion, "Days skipped (rolled / non-court)", "dl-out-s");
  const citeOut = makeOutputLine(outputRegion, "Citation", "dl-out-c");
  const update = debounce(() => {
    const r = computeDeadline({
      trigger_date: trig.input.value, days: Number(days.input.value), day_type: dt.select.value, jurisdiction: "FED",
    });
    if (r.error) { ddOut.textContent = r.error; skipOut.textContent = citeOut.textContent = ""; return; }
    ddOut.textContent = r.deadline;
    skipOut.textContent = r.skipped.length ? r.skipped.map((s) => s.date + " (" + s.reason + ")").join(", ") : "(none)";
    citeOut.textContent = r.citation;
  }, DEBOUNCE_MS);
  for (const el of [trig.input, days.input, dt.select]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    trig.input.value = "2025-07-01"; days.input.value = 30; dt.select.value = "calendar"; update();
  });
}

function renderSotl(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per-state code section. Bundled summaries verified on date stamped on the dataset.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  const t = document.createElement("span"); t.textContent = "Statute of limitations"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "statute_of_limitations");
  const state = makeSelect("State", "sotl-s", Object.keys(STATUTE_OF_LIMITATIONS).map((k) => ({ value: k, label: k })));
  const claim = makeSelect("Claim type", "sotl-c", [
    "contract_written", "contract_oral", "personal_injury", "property_damage",
    "fraud", "debt_collection", "wage_claim", "medical_malpractice",
  ].map((v) => ({ value: v, label: v.replace(/_/g, " ") })));
  for (const f of [state, claim]) inputRegion.appendChild(f.wrap);
  const yrs = makeOutputLine(outputRegion, "Limitation period", "sotl-out-y");
  const acc = makeOutputLine(outputRegion, "Start of clock", "sotl-out-a");
  const cite = makeOutputLine(outputRegion, "Citation", "sotl-out-c");
  const update = debounce(() => {
    const r = computeStatuteOfLimitations({ state: state.select.value, claim_type: claim.select.value });
    if (r.error) { yrs.textContent = r.error; acc.textContent = cite.textContent = ""; return; }
    yrs.textContent = r.years + " year(s)";
    acc.textContent = r.accrual;
    cite.textContent = r.citation;
  }, DEBOUNCE_MS);
  for (const el of [state.select, claim.select]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { state.select.value = "CA"; claim.select.value = "contract_written"; update(); });
}

function renderSmallClaims(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per-state small-claims statute or court rule, cited by section number. Filing-fee range is representative; verify with the local court schedule.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  const t = document.createElement("span"); t.textContent = "Jurisdictional maximum"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "jurisdictional_maximum");
  const state = makeSelect("State", "sc-s", Object.keys(SMALL_CLAIMS_THRESHOLDS).map((k) => ({ value: k, label: k })));
  inputRegion.appendChild(state.wrap);
  const maxOut = makeOutputLine(outputRegion, "Jurisdictional maximum", "sc-out-m");
  const feeOut = makeOutputLine(outputRegion, "Filing fee range", "sc-out-f");
  const attyOut = makeOutputLine(outputRegion, "Attorneys allowed", "sc-out-a");
  const citeOut = makeOutputLine(outputRegion, "Citation", "sc-out-c");
  const update = debounce(() => {
    const r = computeSmallClaimsReference({ state: state.select.value });
    if (r.error) { maxOut.textContent = r.error; feeOut.textContent = attyOut.textContent = citeOut.textContent = ""; return; }
    maxOut.textContent = "$" + r.max_dollars.toLocaleString();
    feeOut.textContent = r.fee_range;
    attyOut.textContent = r.attorney_allowed ? "yes" : "no";
    citeOut.textContent = r.citation;
  }, DEBOUNCE_MS);
  state.select.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { state.select.value = "CA"; update(); });
}

function renderTenantNotice(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: per-state landlord-tenant code, cited by section number. Original plain-English summary.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  inputRegion.appendChild(makeNotice("Self-help eviction is illegal in every state. Do not change the locks. The state procedure is the procedure."));
  const state = makeSelect("State", "tn-s", Object.keys(LANDLORD_TENANT_NOTICE).map((k) => ({ value: k, label: k })));
  const nt = makeSelect("Notice type", "tn-t", [
    { value: "nonpayment", label: "Nonpayment of rent" },
    { value: "lease_violation", label: "Lease violation" },
    { value: "no_cause", label: "No-cause termination" },
    { value: "month_to_month", label: "Month-to-month termination" },
  ]);
  for (const f of [state, nt]) inputRegion.appendChild(f.wrap);
  const dOut = makeOutputLine(outputRegion, "Notice period", "tn-out-d");
  const cureOut = makeOutputLine(outputRegion, "Cure allowed", "tn-out-cu");
  const citeOut = makeOutputLine(outputRegion, "Citation", "tn-out-c");
  const update = debounce(() => {
    const r = computeTenantNotice({ state: state.select.value, notice_type: nt.select.value });
    if (r.error) { dOut.textContent = r.error; cureOut.textContent = citeOut.textContent = ""; return; }
    dOut.textContent = r.notice_days + " day(s)" + (r.business_days ? " (business days)" : " (calendar)");
    cureOut.textContent = r.cure_allowed ? "yes" : "no";
    citeOut.textContent = r.citation;
  }, DEBOUNCE_MS);
  for (const el of [state.select, nt.select]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => { state.select.value = "CA"; nt.select.value = "nonpayment"; update(); });
}

function renderWageHour(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: 29 USC 207 (FLSA overtime), 203(m) (tip credit). Per-state minimum from each state's labor department, cited per entry.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  const t = document.createElement("span"); t.textContent = "FLSA"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "FLSA");
  const rate = makeNumber("Hourly rate (USD)", "wh-r", { step: "any", min: "0" });
  const hours = makeNumber("Hours worked this week", "wh-h", { step: "any", min: "0" });
  const state = makeSelect("State", "wh-s", Object.keys(STATE_MINIMUM_WAGE).map((k) => ({ value: k, label: k + " ($" + STATE_MINIMUM_WAGE[k].minimum_wage + ")" })));
  const tipped = makeSelect("Tipped employee?", "wh-t", [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]);
  const tips = makeNumber("Cash tips received this week (USD)", "wh-tips", { step: "any", min: "0" });
  for (const f of [rate, hours, state, tipped, tips]) inputRegion.appendChild(f.wrap);
  const regOut = makeOutputLine(outputRegion, "Regular pay", "wh-out-r");
  const otOut = makeOutputLine(outputRegion, "Overtime pay (1.5x over 40)", "wh-out-o");
  const tipOut = makeOutputLine(outputRegion, "Tip-credit makeup (employer)", "wh-out-tm");
  const grossOut = makeOutputLine(outputRegion, "Gross pay", "wh-out-g");
  const minOut = makeOutputLine(outputRegion, "Applicable minimum", "wh-out-m");
  const update = debounce(() => {
    const r = computeWageHour({
      hourly_rate: Number(rate.input.value), hours_worked: Number(hours.input.value),
      state: state.select.value, is_tipped: tipped.select.value === "yes", cash_tips: Number(tips.input.value || 0),
    });
    if (r.error) { regOut.textContent = r.error; otOut.textContent = tipOut.textContent = grossOut.textContent = minOut.textContent = ""; return; }
    regOut.textContent = "$" + fmt(r.regular_pay, 2);
    otOut.textContent = "$" + fmt(r.overtime_pay, 2);
    tipOut.textContent = "$" + fmt(r.tip_makeup, 2);
    grossOut.textContent = "$" + fmt(r.gross_pay, 2);
    minOut.textContent = "$" + r.applicable_minimum + "/hr (state $" + r.state_minimum + ", federal $" + r.federal_minimum + ")";
  }, DEBOUNCE_MS);
  for (const el of [rate.input, hours.input, state.select, tipped.select, tips.input]) el.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    rate.input.value = 15; hours.input.value = 45; state.select.value = "CA"; tipped.select.value = "no"; tips.input.value = 0; update();
  });
}

function renderContractor(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: IRS Rev. Rul. 87-41 (20-factor test). State ABC test where applicable, cited per entry.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  const t = document.createElement("span"); t.textContent = "ABC test"; inputRegion.appendChild(t); attachGlossaryTooltip(t, "ABC_test");
  const test = makeSelect("Test", "cv-t", [
    { value: "abc", label: "ABC test (CA, MA, NJ, others)" },
    { value: "irs", label: "IRS 20-factor (federal)" },
  ]);
  inputRegion.appendChild(test.wrap);
  const abcWrap = document.createElement("div"); abcWrap.id = "cv-abc";
  const irsWrap = document.createElement("div"); irsWrap.id = "cv-irs";
  inputRegion.appendChild(abcWrap); inputRegion.appendChild(irsWrap);
  const abcChecks = ["A", "B", "C"].map((p) => {
    const w = document.createElement("label"); w.style.display = "block";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "cv-abc-" + p;
    w.appendChild(cb);
    const labels = {
      A: " (A) Worker is free from control and direction in performance",
      B: " (B) Service is outside the usual course of the hiring entity's business",
      C: " (C) Worker is engaged in an independently established trade",
    };
    w.appendChild(document.createTextNode(labels[p]));
    abcWrap.appendChild(w);
    return { p, input: cb };
  });
  const irsFactors = [
    "instructions", "training", "integration", "personal_service", "hiring_assistants",
    "continuing_relationship", "set_hours", "full_time", "work_on_premises", "order_of_work",
    "reports", "payment_method", "expenses_paid", "tools_and_materials", "investment",
    "profit_or_loss", "works_for_more_than_one", "available_to_public", "right_to_discharge", "right_to_terminate",
  ];
  const irsControls = irsFactors.map((f) => {
    const sel = makeSelect(f.replace(/_/g, " "), "cv-irs-" + f, [
      { value: "", label: "(unanswered)" },
      { value: "employer", label: "Points to employer control" },
      { value: "worker", label: "Points to worker independence" },
    ]);
    irsWrap.appendChild(sel.wrap);
    return { f, select: sel.select };
  });
  function showHide() {
    abcWrap.style.display = test.select.value === "abc" ? "" : "none";
    irsWrap.style.display = test.select.value === "irs" ? "" : "none";
  }
  showHide();
  const resOut = makeOutputLine(outputRegion, "Result", "cv-out-r");
  const reasonOut = makeOutputLine(outputRegion, "Reasoning", "cv-out-rz");
  const citeOut = makeOutputLine(outputRegion, "Citation", "cv-out-c");
  const update = debounce(() => {
    if (test.select.value === "abc") {
      const cl = {}; for (const c of abcChecks) cl[c.p] = c.input.checked;
      const r = computeContractorVsEmployee({ test: "abc", checklist: cl });
      resOut.textContent = r.result; reasonOut.textContent = r.reasoning; citeOut.textContent = r.citation;
    } else {
      const cl = {}; for (const c of irsControls) cl[c.f] = c.select.value;
      const r = computeContractorVsEmployee({ test: "irs", checklist: cl });
      resOut.textContent = r.result + " (control=" + r.employer_control_count + ", worker=" + r.independent_count + ")";
      reasonOut.textContent = r.reasoning; citeOut.textContent = r.citation;
    }
  }, DEBOUNCE_MS);
  test.select.addEventListener("input", () => { showHide(); update(); });
  for (const c of abcChecks) c.input.addEventListener("input", update);
  for (const c of irsControls) c.select.addEventListener("input", update);
  attachExampleButton(inputRegion, () => {
    test.select.value = "abc"; showHide();
    abcChecks[0].input.checked = true; abcChecks[1].input.checked = false; abcChecks[2].input.checked = true;
    update();
  });
}

function renderClauseRef(map, label) {
  return function (inputRegion, outputRegion, citationEl) {
    citationEl.textContent = "Citation: original plain-English summary by the project author. Not a model clause and not legal advice.";
    inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
    const dl = document.createElement("dl");
    dl.className = "clause-ref";
    for (const [key, row] of Object.entries(map)) {
      const dt = document.createElement("dt");
      dt.textContent = key.replace(/_/g, " ");
      const dd = document.createElement("dd");
      const what = document.createElement("p"); what.textContent = "What it does: " + row.what;
      const look = document.createElement("p"); look.textContent = "What to look for: " + row.look_for;
      dd.appendChild(what); dd.appendChild(look);
      dl.appendChild(dt); dl.appendChild(dd);
    }
    outputRegion.appendChild(dl);
    const note = document.createElement("p");
    note.textContent = label + " reference contains " + Object.keys(map).length + " entries.";
    outputRegion.appendChild(note);
  };
}

function renderWageGarnishment(inputRegion, outputRegion, citationEl) {
  citationEl.textContent = "Citation: Per 15 USC 1673 (Consumer Credit Protection Act, Title III) and DOL Wage and Hour Division Fact Sheet 30. Consumer debt: lesser of 25% of disposable or the amount above 30x the federal minimum wage ($7.25). Student loan: 15%. Child support: 50-65% of disposable (exempt from the 30x floor). State maxima vary; enter a stricter state cap to apply it. Free at dol.gov/agencies/whd/fact-sheets.";
  inputRegion.appendChild(makeNotice(LEGAL_NOTICE));
  const disp = makeNumber("Disposable earnings ($/period)", "wg-disp", { step: "any", min: "0", value: "600" });
  const period = makeSelect("Pay period", "wg-period", [
    { value: "weekly", label: "Weekly", selected: true },
    { value: "biweekly", label: "Biweekly" },
    { value: "semimonthly", label: "Semi-monthly" },
    { value: "monthly", label: "Monthly" },
  ]);
  const type = makeSelect("Garnishment type", "wg-type", [
    { value: "consumer", label: "Consumer debt (25%)", selected: true },
    { value: "student_loan", label: "Federal student loan (15%)" },
    { value: "child_support", label: "Child support / alimony (50-65%)" },
  ]);
  const supporting = makeSelect("Supporting another spouse/child? (support orders)", "wg-supp", [
    { value: "yes", label: "Yes (50% base)", selected: true },
    { value: "no", label: "No (60% base)" },
  ]);
  const arrears = makeSelect("More than 12 weeks in arrears? (support orders)", "wg-arr", [
    { value: "no", label: "No", selected: true },
    { value: "yes", label: "Yes (+5%)" },
  ]);
  const stateCap = makeNumber("State cap (% of disposable; optional)", "wg-state", { step: "any", min: "0", max: "100" });
  for (const f of [disp, period, type, supporting, arrears, stateCap]) inputRegion.appendChild(f.wrap);
  attachExampleButton(inputRegion, () => {
    disp.input.value = "600"; period.select.value = "weekly"; type.select.value = "consumer";
    supporting.select.value = "yes"; arrears.select.value = "no"; stateCap.input.value = ""; update();
  });

  const oMax = makeOutputLine(outputRegion, "Maximum garnishment", "wg-out-max");
  const oProtected = makeOutputLine(outputRegion, "Protected (take-home)", "wg-out-prot");
  const oDetail = makeOutputLine(outputRegion, "Basis", "wg-out-detail");
  const oNote = makeOutputLine(outputRegion, "Notes", "wg-out-note");

  function readNum(input) { if (input.value === "") return null; const n = Number(input.value); return Number.isFinite(n) ? n : null; }
  const update = debounce(() => {
    const r = computeWageGarnishment({
      disposable_earnings: readNum(disp.input),
      pay_period: period.select.value,
      garnishment_type: type.select.value,
      supporting_other_dependent: supporting.select.value === "yes",
      in_arrears_12wk: arrears.select.value === "yes",
      state_cap_pct: readNum(stateCap.input),
    });
    if (r.error) { oMax.textContent = r.error; oProtected.textContent = "-"; oDetail.textContent = "-"; oNote.textContent = ""; return; }
    oMax.textContent = "$" + fmt(r.max_garnishment, 2) + " per " + r.pay_period.replace("semimonthly", "semi-monthly") + " period (binding: " + r.binding + ")";
    oProtected.textContent = "$" + fmt(r.protected_amount, 2) + " of $" + fmt(r.disposable_earnings, 2) + " disposable";
    const floorTxt = r.floor_applies ? "; 30x-min-wage floor $" + fmt(r.protected_floor, 2) : "";
    oDetail.textContent = "Title III max $" + fmt(r.title_iii_max, 2) + " (" + r.applied_pct + "% of disposable" + floorTxt + ")" + (r.state_cap_amount !== null ? "; state cap $" + fmt(r.state_cap_amount, 2) : "");
    oNote.textContent = r.warnings.join(" ");
  }, DEBOUNCE_MS);
  for (const el of [disp.input, stateCap.input]) el.addEventListener("input", update);
  for (const s of [period.select, type.select, supporting.select, arrears.select]) s.addEventListener("change", update);
}

export const LEGAL_RENDERERS = {
  "judgment-interest": renderJudgmentInterest,
  "court-deadline": renderDeadline,
  "statute-of-limitations": renderSotl,
  "small-claims-reference": renderSmallClaims,
  "tenant-notice": renderTenantNotice,
  "wage-hour": renderWageHour,
  "contractor-vs-employee": renderContractor,
  "contract-clause-reference": renderClauseRef(CONTRACT_CLAUSES, "Contract clause"),
  "lease-term-reference": renderClauseRef(LEASE_TERMS, "Lease term"),
  "wage-garnishment": renderWageGarnishment,
};
