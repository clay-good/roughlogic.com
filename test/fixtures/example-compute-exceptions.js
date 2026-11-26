// Which compute a worked-example export belongs to, for the 35 whose names do
// not follow `fooExample` -> `computeFoo`.
//
// There is no registry of this pairing: an inline example names no tile, and
// three resolutions were tried before this one. Matching the compute that
// merely RETURNS the named keys picks the wrong one of two siblings
// (computeReadability and computeAlternateReadability both return `sentences`);
// matching on shared worked-examples.json inputs collapses on the reference
// tiles, which all take `{}`; and the name convention is what these 35 break.
//
// So each row is taken from where the repo already records the pairing: the
// per-module test that imports both and calls them together
// (`computeConcreteVolume(concreteExample.inputs)`), which covers 32 of them,
// and test/fixtures/compute-map.js for the last three, whose names differ by
// an acronym's case (computeGFCIReference) or a suffix
// (computeThermalDeltaTReference, computeDehumidifierSize). Every row is
// exercised: inline-expectations-hold.test.js runs each example's claims
// against the compute named here, so a wrong pairing shows up as a failed
// claim rather than sitting unnoticed.
export const EXAMPLE_COMPUTE_EXCEPTIONS = {
  amortizationExample: "computeAmortizationSchedule",
  brakingExample: "computeBrakingDistance",
  capRateExample: "computeCapRateDSCR",
  codonExample: "computeCodonTable",
  concreteExample: "computeConcreteVolume",
  dehumidifierExample: "computeDehumidifierSize",
  dtiExample: "computeDTI",
  ductSizingExample: "computeDuctSize",
  egcSizeExample: "computeEGCSize",
  excavationExample: "computeExcavationVolume",
  exchangeTimelineExample: "compute1031Timeline",
  gfciReferenceExample: "computeGFCIReference",
  gpaExample: "computeGPA",
  haversineExample: "computeHaversineDistance",
  hepaLifeExample: "computeHEPALife",
  ltvExample: "computeLTV",
  lumberSpansExample: "computeLumberSpan",
  manualJCoolingExample: "manualJCooling",
  masterStreamExample: "computeMasterStreamReach",
  moldExample: "computeMoldRisk",
  mwExample: "computeMolecularWeight",
  namSizingExample: "computeNAMSizing",
  pdpExample: "computePDP",
  periodicExample: "computePeriodicElement",
  pfCorrectionExample: "computePFCorrection",
  pitiExample: "computePITI",
  pressureConversionExample: "pressureConvert",
  pumpSizingExample: "computePumpSize",
  pvStringSizingExample: "computePVStringSizing",
  reverseLayExample: "computeReverseLayFriction",
  shrExample: "computeSHR",
  standardsBasedExample: "computeStandardsBasedGrade",
  staticPressurePipingExample: "computeStaticPressureLossPiping",
  thermalDeltaTExample: "computeThermalDeltaTReference",
  unitConverterExample: "convertUnit",
};
