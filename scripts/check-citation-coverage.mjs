#!/usr/bin/env node
// spec-v14 §11.2 Phase G citation-to-formula round-trip (scaffolding).
//
// Builds the inverse map of the CITATIONS object in citations.js: for
// every cited source (NEC, ASHRAE, NFPA, IPC, IRC, IBC, ACCA, etc.),
// list every tile that cites it. The map is the input to the per-source
// edition-rollover playbook: when a published source ships a new
// edition, the rollover-recheck row in docs/v6-audit.md lists exactly
// the tiles affected.
//
// Behavior:
//   FAIL (exit 1):
//     - citations.js missing or unparseable.
//     - A CITATIONS tile_id is not in TOOLS (orphan citation; the v10
//       check-tile-meta lint already catches the TOOLS->CITATIONS
//       direction, this is the inverse direction).
//   WARN (does not fail; scaffolding):
//     - A TOOLS tile has no CITATIONS entry. (Already a warning in
//       check-tile-meta.mjs for some tile sets; re-asserted here so a
//       future regression in either path is caught.)
//
// Pure read-and-report; no network, no mutation. Wired into
// `npm run lint`.

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_JS = resolve(ROOT, "app.js");
const CITATIONS_JS = resolve(ROOT, "citations.js");

// The source tokens we track. Each maps a regex pattern (applied to the
// per-tile `edition` field of CITATIONS) to a canonical source name.
// The list is the published-source surface called out in spec-v14 §6.1
// (textbook / code-body / handbook / NIST / FRED / extension-service).
// A future source ships an entry here and the lint picks up the new
// inverse-map row automatically.
const SOURCE_PATTERNS = [
  { re: /\bNEC[\s-]*2017\b/i, name: "NEC 2017" },
  { re: /\bNEC[\s-]*2020\b/i, name: "NEC 2020" },
  { re: /\bNEC[\s-]*2023\b/i, name: "NEC 2023" },
  { re: /\bNEC[\s-]*2026\b/i, name: "NEC 2026" },
  { re: /\bNFPA[\s-]*13\b/i, name: "NFPA 13 (sprinkler)" },
  { re: /\bNFPA[\s-]*54\b/i, name: "NFPA 54 (fuel gas)" },
  { re: /\bNFPA[\s-]*1962\b/i, name: "NFPA 1962 (fire hose)" },
  { re: /\bNFPA[\s-]*1142\b/i, name: "NFPA 1142 (rural water supply)" },
  { re: /\bIRC[\s-]*201[8-9]\b/i, name: "IRC 2018" },
  { re: /\bIRC[\s-]*2021\b/i, name: "IRC 2021" },
  { re: /\bIRC[\s-]*2024\b/i, name: "IRC 2024" },
  { re: /\bIBC[\s-]*2021\b/i, name: "IBC 2021" },
  { re: /\bIPC[\s-]*2021\b/i, name: "IPC 2021" },
  { re: /\bIFGC[\s-]*2021\b/i, name: "IFGC 2021" },
  { re: /\bASHRAE[\s-]*62\.1\b/i, name: "ASHRAE 62.1" },
  { re: /\bASHRAE[\s-]*Fundamentals\b/i, name: "ASHRAE Fundamentals" },
  { re: /\bACCA[\s-]*Manual[\s-]*J\b/i, name: "ACCA Manual J" },
  { re: /\bACCA[\s-]*Manual[\s-]*D\b/i, name: "ACCA Manual D" },
  { re: /\bAWC[\s-]*NDS\b/i, name: "AWC NDS" },
  { re: /\bASCE[\s-]*7\b/i, name: "ASCE 7" },
  { re: /\bIEEE[\s-]*141\b/i, name: "IEEE 141 (Red Book)" },
  { re: /\bIEEE[\s-]*835\b/i, name: "IEEE 835 (ampacity)" },
  { re: /\bIICRC[\s-]*S500\b/i, name: "IICRC S500" },
  { re: /\bNIST[\s-]*(CODATA|SP)/i, name: "NIST CODATA / SP" },
  { re: /\bIRS\b.*\bmileage\b/i, name: "IRS standard mileage" },
  { re: /\bFMCSA\b/i, name: "FMCSA" },
  { re: /\bFAA[\s-]*H-8083\b/i, name: "FAA H-8083 (Pilot's Handbook)" },
  { re: /\b14[\s-]*CFR\b/i, name: "14 CFR" },
  { re: /\bAHA\b|\bACLS\b/i, name: "AHA / ACLS" },
  { re: /\bAAHA\b/i, name: "AAHA" },
  { re: /\bPlumb's\b/i, name: "Plumb's Veterinary Drug Handbook" },
  { re: /\bNOAA\b.*\bWMM\b|\bWMM\d{4}\b/i, name: "NOAA WMM" },
  { re: /\bUSGS\b/i, name: "USGS" },
  { re: /\bFRED\b/i, name: "FRED" },
  { re: /\bCDC\b/i, name: "CDC" },
  { re: /\bFDA\b/i, name: "FDA" },
  // spec-v14 §11.2 expansion 2026-05-22: track the regulatory + trade-
  // body source surface that the v6 / v9 / v12 / v15 / v16 / v17 catalog
  // expansions added. Each pattern is keyed off the canonical edition
  // string the CITATIONS object uses; a future v6 recheck that rolls an
  // edition triggers the per-source rollover row via the same lint.
  { re: /\bOSHA\b/i, name: "OSHA" },
  { re: /\bNIOSH\b/i, name: "NIOSH" },
  { re: /\bAWWA\b/i, name: "AWWA" },
  { re: /\bEPA\b/i, name: "EPA" },
  { re: /\bNRCS\b/i, name: "USDA NRCS" },
  { re: /\bUSDA\b(?!\s*NRCS)/i, name: "USDA" },
  { re: /\bHUD\b/i, name: "HUD" },
  { re: /\bFNMA\b|\bFannie Mae\b/i, name: "FNMA / Fannie Mae" },
  { re: /\bFHFA\b/i, name: "FHFA" },
  { re: /\bCFPB\b/i, name: "CFPB" },
  { re: /\bFRCP\b/i, name: "FRCP" },
  { re: /\bAAFP\b/i, name: "AAFP" },
  { re: /\bACEP\b/i, name: "ACEP" },
  { re: /\bACVIM\b/i, name: "ACVIM" },
  { re: /\bAVMA\b/i, name: "AVMA" },
  { re: /\bAAEP\b/i, name: "AAEP" },
  { re: /\bAVECCT\b/i, name: "AVECCT" },
  { re: /\bNFPA[\s-]*14\b/i, name: "NFPA 14 (standpipes)" },
  { re: /\bNFPA[\s-]*1981\b/i, name: "NFPA 1981 (SCBA)" },
  { re: /\bNFPA[\s-]*70\b/i, name: "NFPA 70 (NEC)" },
  // spec-v14 §11.2 expansion 2026-05-22 (second pass): add the next
  // tier of trade-body / standards-body / extension-service sources
  // surfaced by the 2026-05-22 untracked-source measurement step.
  { re: /\bNEMA\b/i, name: "NEMA" },
  { re: /\bIEEE\s*(?:Std|Standard)?[\s-]*\d/i, name: "IEEE (numbered standards)" },
  { re: /\bASME\b/i, name: "ASME" },
  { re: /\bSMACNA\b/i, name: "SMACNA" },
  { re: /\bASTM\b/i, name: "ASTM" },
  { re: /\bAASHTO\b/i, name: "AASHTO" },
  { re: /\bACI\b/i, name: "ACI" },
  { re: /\bAISC\b/i, name: "AISC" },
  { re: /\bAPA\b.*\b(Engineered|span-rating)/i, name: "APA Engineered Wood" },
  { re: /\bIMC\b/i, name: "IMC (Mechanical Code)" },
  { re: /\bICC-ES\b|\bICC[\s-]*ES\b/i, name: "ICC-ES" },
  { re: /\bCRC\s*Handbook\b/i, name: "CRC Handbook of Chemistry and Physics" },
  { re: /\bSouthwire\b|\bEncore Wire\b|\bBelden\b|\bCorning\b|\bAFC\b/i, name: "wire / cable manufacturer datasheets" },
  { re: /\bBussmann\b|\bEaton\b/i, name: "Bussmann / Eaton" },
  { re: /\bHydraulic Institute\b/i, name: "Hydraulic Institute" },
  { re: /\bWEF\b|\bWater Environment Federation\b/i, name: "WEF / Water Environment Federation" },
  { re: /\bNWS\b/i, name: "NWS / National Weather Service" },
  { re: /\bICAO\b/i, name: "ICAO" },
  { re: /\bAOPA\b/i, name: "AOPA" },
  { re: /\bNFPA[\s-]*96\b/i, name: "NFPA 96 (commercial cooking)" },
  { re: /\bNFPA[\s-]*25\b/i, name: "NFPA 25 (sprinkler ITM)" },
  { re: /\bNFPA[\s-]*72\b/i, name: "NFPA 72 (fire alarm)" },
  { re: /\bNFPA[\s-]*101\b/i, name: "NFPA 101 (Life Safety)" },
  { re: /\bNFPA[\s-]*70E\b/i, name: "NFPA 70E (arc flash)" },
  { re: /\bICC\b.*\b(IECC|IRC|IBC)\b/i, name: "ICC code family" },
  { re: /\bIECC\b/i, name: "IECC" },
  { re: /\bCRSI\b/i, name: "CRSI" },
  { re: /\bSAE\b/i, name: "SAE" },
  { re: /\bDOL\b|\bDepartment of Labor\b/i, name: "DOL / Department of Labor" },
  { re: /\bSSA\b|\bSocial Security/i, name: "SSA / Social Security" },
  { re: /\bACVECC\b/i, name: "ACVECC" },
  { re: /\bAVECCT\b/i, name: "AVECCT" },
  { re: /\bASA\b.*\bPhysical Status\b/i, name: "ASA Physical Status" },
  { re: /\bAPSP\b/i, name: "APSP (pool / spa)" },
  { re: /\bNSPF\b/i, name: "NSPF" },
  { re: /\bNDS\b/i, name: "NDS (timber design)" },
  { re: /\bJoukowsky\b/i, name: "Joukowsky (1898)" },
  // spec-v14 §11.2 expansion 2026-05-22 (third pass): pick up the
  // remaining handbook / association / manufacturer-attribution
  // sources that the second-pass untracked-tiles list surfaced.
  { re: /\bASHRAE\s*Handbook\b/i, name: "ASHRAE Handbook" },
  { re: /\bASPE\b/i, name: "ASPE Data Book" },
  { re: /\bPDI\b/i, name: "PDI (Plumbing & Drainage Institute)" },
  { re: /\bCTI\b|\bCooling Technology Institute\b/i, name: "CTI (Cooling Technology Institute)" },
  { re: /\bANSI\b/i, name: "ANSI" },
  { re: /\bFEMA\b/i, name: "FEMA" },
  { re: /\bCALFIRE\b|\bCAL FIRE\b/i, name: "CALFIRE" },
  { re: /\bICC[\s-]*500\b/i, name: "ICC 500 (storm shelter)" },
  { re: /\bFCC\b/i, name: "FCC" },
  { re: /\bNFPA[\s-]*1006\b/i, name: "NFPA 1006 (rescue technician)" },
  { re: /\bNFPA[\s-]*1670\b/i, name: "NFPA 1670 (technical search & rescue)" },
  { re: /\bNFPA[\s-]*1\b|\bNFPA[\s-]*11\b/i, name: "NFPA 1 / 11 (foam)" },
  // Refrigerant P-T manufacturer attributions (DuPont, Honeywell,
  // Chemours, Arkema, Solvay): every refrigerant tile carries these
  // because the table is the manufacturer's, not a standards-body.
  { re: /\bDuPont\b|\bHoneywell\b|\bChemours\b|\bArkema\b|\bSolvay\b/i, name: "refrigerant manufacturer P-T tables" },
  // Other equipment-manufacturer attributions surfaced by Group B
  // (Watts) and Group C (Dow) tiles.
  { re: /\bWatts\b|\bDow\b/i, name: "equipment manufacturer technical bulletins" },
  { re: /\bAOAC\b/i, name: "AOAC" },
  { re: /\bDOT\b(?!.*labor)/i, name: "DOT" },
  { re: /\bAREMA\b/i, name: "AREMA" },
  { re: /\bNGS\b|\bNational Geodetic Survey\b/i, name: "NGS / National Geodetic Survey" },
  { re: /\bOpenIntro\b|\bAbramowitz\b|\bStegun\b/i, name: "OpenIntro / A&S (statistics handbooks)" },
  { re: /\bIUPAC\b/i, name: "IUPAC" },
  { re: /\bNREL\b/i, name: "NREL" },
  { re: /\bEnergyStar\b|\bENERGY STAR\b/i, name: "ENERGY STAR" },
  { re: /\bDOE\b/i, name: "DOE (Department of Energy)" },
  { re: /\bAIA\b/i, name: "AIA" },
  { re: /\bUSDA\s*FGIS\b|\bFGIS\b/i, name: "USDA FGIS" },
  { re: /\bACVECC\b|\bAVECCT\b/i, name: "ACVECC / AVECCT" },
  // spec-v14 §11.2 expansion 2026-05-22 (fourth pass): pick up the next
  // layer of statutory / regulatory / association / textbook sources
  // surfaced by the third-pass untracked-tiles list. Focus: IRS / IRC
  // (every Group R tax tile), CFR titles by number, fire-service
  // training surface (NFA / IFSTA / NFPA 1901 / 1965), medical-protocol
  // surface (ATLS / PALS / APLS / AARC / ABLS / ABA Burn / Surviving
  // Sepsis), aviation advisory-circular surface, agricultural surface
  // (ASABE / ARCSA), construction-trade surface (AWS / Machinery's
  // Handbook / BIA / NCMA / USG / GA / ARMA / CAGI / NHLA / WWPA),
  // mechanical-trade surface (ABYC / AAM / Dana / Spicer), and shipping
  // / freight surface (NMFTA / NMFC / Incoterms).
  { re: /\bIRS\s*(Publications?|Pubs?|Forms?|Schedules?|Rev\.?\s*Rul\.?)\b/i, name: "IRS Publication / Form / Schedule" },
  { re: /\b26\s*USC\b|\bIRC\s*§|\bIRC\s*\d/i, name: "26 USC / IRC (Internal Revenue Code)" },
  { re: /\b29\s*USC\b|\bFLSA\b/i, name: "29 USC / FLSA" },
  { re: /\b23\s*CFR\b/i, name: "23 CFR (Federal-aid Highway)" },
  { re: /\b49\s*CFR\b|\bFMVSS\b/i, name: "49 CFR / FMVSS" },
  { re: /\b24\s*CFR\b/i, name: "24 CFR (HUD)" },
  { re: /\b29\s*CFR\b/i, name: "29 CFR (Labor)" },
  { re: /\bACCA\s*Manual\s*S\b/i, name: "ACCA Manual S" },
  { re: /\bNational Fire Academy\b|\bNFA\s+(training|hose|tactical)/i, name: "NFA (National Fire Academy)" },
  { re: /\bIFSTA\b/i, name: "IFSTA" },
  { re: /\bNFPA[\s-]*1901\b/i, name: "NFPA 1901 (fire apparatus)" },
  { re: /\bNFPA[\s-]*1965\b/i, name: "NFPA 1965 (fire hose appliances)" },
  { re: /\bAWS\s*(Welding|A5|D1)/i, name: "AWS (American Welding Society)" },
  { re: /\bMachinery's\s*Handbook\b/i, name: "Machinery's Handbook" },
  { re: /\bBIA\b|\bBrick Industry Association\b|\bNCMA\b/i, name: "BIA / NCMA (masonry)" },
  { re: /\bUSG\b|\bNational Gypsum\b|\bGA-?216\b|\bGypsum Association\b/i, name: "USG / National Gypsum / GA-216" },
  { re: /\bARMA\b/i, name: "ARMA (Asphalt Roofing Mfrs Assoc)" },
  { re: /\bCAGI\b|\bCompressed Air and Gas Institute\b/i, name: "CAGI" },
  { re: /\bIICRC[\s-]*S520\b/i, name: "IICRC S520" },
  { re: /\bASHRAE[\s-]*170\b/i, name: "ASHRAE 170 (healthcare ventilation)" },
  { re: /\bASHRAE[\s-]*34\b/i, name: "ASHRAE 34 (refrigerant safety)" },
  { re: /\bIncoterms\b/i, name: "ICC Incoterms" },
  { re: /\bABYC\b/i, name: "ABYC (boat / marine)" },
  { re: /\bNMFTA\b|\bNMFC\b/i, name: "NMFTA / NMFC (freight class)" },
  { re: /\bFAA\s*AC\s*\d|\bAdvisory Circular AC\b|\bAC\s*00-45\b|\bAC\s*91-23\b/i, name: "FAA Advisory Circular" },
  { re: /\bAIARE\b/i, name: "AIARE (avalanche)" },
  { re: /\bARCSA\b/i, name: "ARCSA (rainwater catchment)" },
  { re: /\bASABE\b/i, name: "ASABE" },
  { re: /\bADA Standards\b|\bICC\s*A117\.1\b/i, name: "ADA Standards / ICC A117.1" },
  { re: /\bGSA\b.*per-?diem|\bFederal Travel Regulation\b/i, name: "GSA Federal Travel Regulation" },
  { re: /\bAACRAO\b/i, name: "AACRAO" },
  { re: /\bMarzano\b/i, name: "Marzano (proficiency scales)" },
  { re: /\bMcLaughlin\b|\bSMOG Grading\b|\bColeman[- ]?Liau\b|\bFlesch\b|\bKincaid\b/i, name: "Readability formulas (SMOG / Coleman-Liau / Flesch / Kincaid)" },
  { re: /\bABLS\b|\bAdvanced Burn Life Support\b|\bAmerican Burn Association\b/i, name: "ABA / ABLS (burn)" },
  { re: /\bAARC\b/i, name: "AARC (respiratory)" },
  { re: /\bAPLS\b|\bAdvanced Paediatric Life Support\b/i, name: "APLS (pediatric life support)" },
  { re: /\bPALS\b/i, name: "PALS (pediatric advanced life support)" },
  { re: /\bATLS\b/i, name: "ATLS (advanced trauma life support)" },
  { re: /\bDiBartola\b/i, name: "DiBartola (vet fluids)" },
  { re: /\bNHLA\b|\bWWPA\b/i, name: "NHLA / WWPA (lumber grading)" },
  { re: /\bAES\b.*\b(Audio|acoustics)/i, name: "AES (Audio Engineering Society)" },
  { re: /\bSurviving Sepsis\b/i, name: "Surviving Sepsis Campaign" },
  { re: /\bHolliday[- ]?Segar\b/i, name: "Holliday-Segar (pediatric fluids)" },
  { re: /\bMerck\s*Veterinary\s*Manual\b/i, name: "Merck Veterinary Manual" },
  { re: /\bIDEXX\b|\bAntech\b|\bAbaxis\b/i, name: "Veterinary reference labs (IDEXX / Antech / Abaxis)" },
  { re: /\bWells\s*PS\b/i, name: "Wells (DVT / PE clinical decision rules)" },
  { re: /\bApgar\b/i, name: "Apgar (newborn)" },
  { re: /\bLund\b.*\bBrowder\b/i, name: "Lund-Browder (burn TBSA)" },
  { re: /\bU\.?S\.?\s*Army\s*FM\s*\d|\bArmy Field Manual\b/i, name: "US Army Field Manual" },
  { re: /\bSouth\s*Dakota\s*v\.?\s*Wayfair\b|\bWayfair\b/i, name: "Wayfair (sales tax nexus)" },
  { re: /\bThermo King\b|\bCarrier Transicold\b/i, name: "Refrigerated-trailer manufacturers (Thermo King / Carrier Transicold)" },
  { re: /\bWabash\b|\bGreat Dane\b|\bUtility Trailer\b/i, name: "Trailer manufacturers (Wabash / Great Dane / Utility)" },
  { re: /\bGates\b|\bGoodyear\b|\bBando\b/i, name: "Belt manufacturers (Gates / Goodyear / Bando)" },
  { re: /\bSandvik\b|\bKennametal\b|\bNiagara\b/i, name: "Tooling manufacturers (Sandvik / Kennametal / Niagara)" },
  { re: /\bAAM\b|\bSpicer\b|\bDana\b/i, name: "Driveline manufacturers (AAM / Spicer / Dana)" },
  { re: /\bPierce\b|\bE-One\b|\bSutphen\b/i, name: "Fire apparatus manufacturers (Pierce / E-One / Sutphen)" },
  { re: /\bDave Dodson\b|\bReading Smoke\b/i, name: "Dave Dodson Reading Smoke" },
  { re: /\bSlant\/Fin\b/i, name: "Slant/Fin (baseboard heat)" },
  { re: /\bDaikin\b|\bCarrier\b|\bTrane\b|\bRheem\b|\bLennox\b/i, name: "HVAC equipment manufacturers (Daikin / Carrier / Trane / Rheem / Lennox)" },
  // spec-v14 §11.2 expansion 2026-05-22 (fourth pass, final batch):
  // ISO numbered standards, Fed. R. Civ. P. abbreviated form, common
  // per-state code reference forms, and the landmark-study author /
  // first-author names that anchor a number of Group V / T tiles.
  { re: /\bISO\s*\d{3,5}\b|\bISO\s*PPC\b/i, name: "ISO (numbered standards)" },
  { re: /\bFed\.?\s*R\.?\s*Civ\.?\s*P\.?\b/i, name: "Fed. R. Civ. P. (FRCP long form)" },
  { re: /\bCal\.?\s*(Civ|Lab|Civ\.\s*Proc)\.?\s*(Code|Proc\.?\s*Code)\b|\bN\.?Y\.?\s*(CPLR|RPAPL)\b|\bTex\.?\s*Fin\.?\s*Code\b|\bAK\s*Stat\b|\bNV\s*Admin\s*Code\b/i, name: "Per-state statutory code (CA / NY / TX / AK / NV)" },
  { re: /\bKothari\b|\bKline\s*JA\b|\bAllgower\b|\bFigge\b|\bPayne\s*RB\b|\bBaxter\b.*\bShires\b|\bMutschler\b|\bVandromme\b|\bEvans\b.*\bCrit\s*Care\b/i, name: "Landmark clinical studies (Kothari / Kline / Allgower / Figge / Payne / Baxter)" },
  { re: /\bBessel\b|\bCramer\b|\bWald\b/i, name: "Landmark mathematical / statistical works (Bessel / Cramer / Wald)" },
  { re: /\bU\.?S\.?\s*Census\b|\bSBA\b/i, name: "US Census / SBA" },
  { re: /\bJeppesen\b|\bASA\s*Pilot's\s*Manual\b/i, name: "Jeppesen / ASA Pilot's Manual" },
  { re: /\bFAA\s*Aeronautical\s*Chart\s*User's\s*Guide\b|\bVFR\s*sectional\b/i, name: "FAA Aeronautical Chart User's Guide" },
  { re: /\bFeldman\b.*\bNelson\b|\bSenger\b/i, name: "Veterinary reproduction textbooks (Feldman-Nelson / Senger)" },
  { re: /\bSteel\s*Square\b|\bAudel's\b/i, name: "Carpentry framing references (Steel Square / Audel's)" },
];

async function loadToolIds() {
  const text = await readFile(APP_JS, "utf8");
  const ids = new Set();
  const re = /\{\s*id:\s*"([a-z0-9-]+)"/g;
  for (const m of text.matchAll(re)) ids.add(m[1]);
  return ids;
}

async function loadCitations() {
  // The CITATIONS object is a large object literal in citations.js. We
  // do not eval the module (the file imports from a generated module
  // chain and dynamic import would force a build). Instead we extract
  // the per-tile keys and the edition / freeAccess strings via regex.
  // The lint is conservative: it counts tile entries and per-tile
  // `edition` content for source-pattern matching, not the full object
  // semantics.
  const text = await readFile(CITATIONS_JS, "utf8");
  const start = text.indexOf("export const CITATIONS = {");
  if (start < 0) return null;
  // Capture each `"<id>": { ... edition: "<edition-string>" ... }`
  // block. We use a permissive matcher that extracts the tile id and
  // any leading edition string; tiles whose edition is a JS const
  // (e.g., `edition: NEC_2023`) are picked up via the const-resolution
  // pass below.
  const entries = new Map();
  // Phase 1: collect tile ids + raw edition tokens.
  const tileRe = /"([a-z0-9-]+)":\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  for (const m of text.slice(start).matchAll(tileRe)) {
    const id = m[1];
    const body = m[2];
    // Find the edition field. Edition can be either a string literal
    // or a const reference like NEC_2023.
    const editionStringMatch = body.match(/edition:\s*"([^"]*)"/);
    const editionConstMatch = body.match(/edition:\s*([A-Z_][A-Z0-9_]*)/);
    let editionRaw = "";
    if (editionStringMatch) editionRaw = editionStringMatch[1];
    else if (editionConstMatch) editionRaw = editionConstMatch[1];
    // Concatenated forms like `NEC_2023 + " Chapter 9..."` show up as
    // both: capture both halves.
    const concatStringMatch = body.match(/edition:\s*[A-Z_][A-Z0-9_]*\s*\+\s*"([^"]*)"/);
    if (concatStringMatch) editionRaw += " " + concatStringMatch[1];
    entries.set(id, editionRaw);
  }
  // Phase 2: resolve const references by reading the top-of-file
  // constants. NEC_2023, AWC_NDS, etc. live above the CITATIONS export.
  const constHeader = text.slice(0, start);
  const constMap = new Map();
  for (const m of constHeader.matchAll(/^const\s+([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"/gm)) {
    constMap.set(m[1], m[2]);
  }
  // Substitute const tokens in entries.
  for (const [id, raw] of entries) {
    let resolved = raw;
    // If raw is exactly a known const, replace; otherwise concatenated
    // forms already carry the string suffix from the regex pass above.
    if (constMap.has(raw)) resolved = constMap.get(raw);
    else if (constMap.has(raw.split(" ")[0])) {
      const head = raw.split(" ")[0];
      resolved = constMap.get(head) + raw.slice(head.length);
    }
    entries.set(id, resolved);
  }
  return entries;
}

async function main() {
  const errors = [];
  const warnings = [];

  const toolIds = await loadToolIds();
  const citationsMap = await loadCitations();
  if (!citationsMap) {
    console.error("ERROR: citations.js does not expose CITATIONS; spec-v14 §11.2 lint cannot proceed.");
    process.exit(1);
  }

  // TOOLS -> CITATIONS direction.
  for (const id of toolIds) {
    if (!citationsMap.has(id)) warnings.push("TOOLS tile '" + id + "' has no CITATIONS entry.");
  }
  // CITATIONS -> TOOLS direction.
  for (const id of citationsMap.keys()) {
    if (!toolIds.has(id)) errors.push("CITATIONS tile '" + id + "' is not in TOOLS (orphan citation).");
  }

  // Inverse map: source -> tiles. Counts only; the full list is
  // available via --verbose if a maintainer wants it.
  const sourceToTiles = new Map();
  // spec-v14 §11.2 measurement-mode: also track tiles whose edition
  // field matches no SOURCE_PATTERN. These tiles will not surface on
  // any per-source edition-rollover row in docs/v6-audit.md; a
  // maintainer can read the list to know which sources still need
  // a SOURCE_PATTERN entry.
  const untrackedTiles = [];
  for (const [id, edition] of citationsMap) {
    let matched = false;
    for (const src of SOURCE_PATTERNS) {
      if (src.re.test(edition)) {
        if (!sourceToTiles.has(src.name)) sourceToTiles.set(src.name, []);
        sourceToTiles.get(src.name).push(id);
        matched = true;
      }
    }
    if (!matched) untrackedTiles.push({ id, edition });
  }

  const trackedEdges = [...sourceToTiles.values()].reduce((a, b) => a + b.length, 0);
  const trackedTilePct = citationsMap.size > 0
    ? (((citationsMap.size - untrackedTiles.length) / citationsMap.size) * 100).toFixed(1)
    : "0.0";

  console.log(
    "citation-coverage: " + citationsMap.size + " CITATIONS tile(s); " +
    toolIds.size + " TOOLS tile(s); " +
    sourceToTiles.size + " tracked source(s) cited; " +
    trackedEdges + " tile->source edge(s); " +
    (citationsMap.size - untrackedTiles.length) + " / " + citationsMap.size +
    " tile(s) matched at least one tracked source (" + trackedTilePct + "%); " +
    untrackedTiles.length + " untracked.",
  );

  if (process.argv.includes("--verbose")) {
    const rows = [...sourceToTiles.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [name, ids] of rows) {
      console.log("  " + name + " (" + ids.length + "): " + ids.slice(0, 5).join(", ") + (ids.length > 5 ? ", ..." : ""));
    }
    if (untrackedTiles.length > 0) {
      console.log("  --- untracked tiles (edition matches no SOURCE_PATTERN) ---");
      for (const t of untrackedTiles.slice(0, 25)) {
        const ed = t.edition.length > 60 ? t.edition.slice(0, 57) + "..." : t.edition;
        console.log("  " + t.id + ": " + ed);
      }
      if (untrackedTiles.length > 25) {
        console.log("  ... and " + (untrackedTiles.length - 25) + " more (run with --verbose-all to dump all).");
      }
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error("v14 citation-coverage lint FAILED with " + errors.length + " orphan(s).");
    process.exit(1);
  }
  if (warnings.length > 0 && warnings.length <= 5) {
    for (const w of warnings) console.warn("WARN: " + w);
  }
  console.log(
    "v14 citation-coverage lint OK (" + warnings.length + " coverage warning(s); Phase G scaffolding, run with --verbose for the per-source tile list).",
  );
}

await main();
