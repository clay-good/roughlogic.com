// Unit tests for calc-cross.js v2 utilities (105-113). 10+ cases per utility.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeLoanPayment,
  computeUpgradeROI,
  computeMileageCost,
  computeOvertime,
  computePerDiem,
  computeGeometry,
  computeDilution,
  computeSlopeFromLevel,
  computeHaversineDistance,
  IRS_STANDARD_MILEAGE_RATE,
  GSA_PERDIEM_RATES,
  loanPaymentExample,
  upgradeROIExample,
  mileageCostExample,
  overtimeExample,
  perDiemExample,
  geometryExample,
  dilutionExample,
  slopeFromLevelExample,
  haversineExample,
} from "../../calc-cross.js";

const close = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// --- Utility 105: Loan Payment ---

test("Loan: 50k at 6% over 60 months ~ $966.64", () => {
  const r = computeLoanPayment(loanPaymentExample.inputs);
  assert.ok(close(r.monthly_payment, 966.64, 1));
});

test("Loan: 0% APR -> P/n", () => {
  const r = computeLoanPayment({ principal: 6000, apr_percent: 0, term_months: 12 });
  assert.equal(r.monthly_payment, 500);
});

test("Loan: zero principal returns error", () => {
  const r = computeLoanPayment({ principal: 0, apr_percent: 5, term_months: 60 });
  assert.ok(r.error);
});

test("Loan: zero term returns error", () => {
  const r = computeLoanPayment({ principal: 50000, apr_percent: 5, term_months: 0 });
  assert.ok(r.error);
});

test("Loan: total interest = payment*n - P", () => {
  const r = computeLoanPayment(loanPaymentExample.inputs);
  assert.ok(close(r.total_interest, r.monthly_payment * 60 - 50000, 0.5));
});

test("Loan: first 12 months returned for term >= 12", () => {
  const r = computeLoanPayment(loanPaymentExample.inputs);
  assert.equal(r.first_12_months.length, 12);
});

test("Loan: balance decreases each month", () => {
  const r = computeLoanPayment(loanPaymentExample.inputs);
  for (let i = 1; i < r.first_12_months.length; i++) {
    assert.ok(r.first_12_months[i].balance < r.first_12_months[i - 1].balance);
  }
});

test("Loan: short term returns < 12 rows", () => {
  const r = computeLoanPayment({ principal: 1000, apr_percent: 5, term_months: 6 });
  assert.equal(r.first_12_months.length, 6);
});

test("Loan: higher APR -> higher payment", () => {
  const a = computeLoanPayment({ principal: 50000, apr_percent: 4, term_months: 60 });
  const b = computeLoanPayment({ principal: 50000, apr_percent: 8, term_months: 60 });
  assert.ok(b.monthly_payment > a.monthly_payment);
});

test("Loan: longer term -> lower payment", () => {
  const a = computeLoanPayment({ principal: 50000, apr_percent: 5, term_months: 60 });
  const b = computeLoanPayment({ principal: 50000, apr_percent: 5, term_months: 120 });
  assert.ok(b.monthly_payment < a.monthly_payment);
});

// --- Utility 106: Upgrade ROI ---

test("ROI: example simple_payback 6.25 yr", () => {
  const r = computeUpgradeROI(upgradeROIExample.inputs);
  assert.ok(close(r.simple_payback_yr, 5000 / 800, 0.001));
});

test("ROI: 0% discount NPV = -C + S*y", () => {
  const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 0, years: 10 });
  assert.equal(r.npv_dollars, -5000 + 8000);
});

test("ROI: zero cost returns error", () => {
  const r = computeUpgradeROI({ incremental_cost: 0, annual_savings: 800 });
  assert.ok(r.error);
});

test("ROI: zero savings returns error", () => {
  const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 0 });
  assert.ok(r.error);
});

test("ROI: higher discount -> lower NPV", () => {
  const a = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 0, years: 10 });
  const b = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 8, years: 10 });
  assert.ok(b.npv_dollars < a.npv_dollars);
});

test("ROI: longer horizon increases NPV", () => {
  const a = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 4, years: 5 });
  const b = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 4, years: 15 });
  assert.ok(b.npv_dollars > a.npv_dollars);
});

test("ROI: payback inversely proportional to savings", () => {
  const a = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 500 });
  const b = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 1000 });
  assert.ok(close(b.simple_payback_yr, a.simple_payback_yr / 2));
});

test("ROI: zero years returns error", () => {
  const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, years: 0 });
  assert.ok(r.error);
});

test("ROI: surfaces discount rate", () => {
  const r = computeUpgradeROI({ incremental_cost: 5000, annual_savings: 800, discount_rate_percent: 4, years: 10 });
  assert.equal(r.discount_rate_percent, 4);
});

test("ROI: example NPV positive", () => {
  const r = computeUpgradeROI(upgradeROIExample.inputs);
  assert.ok(r.npv_dollars > 0);
});

// --- Utility 107: Mileage Cost ---

test("Mileage: example 100 mi at 25 mpg, $4 -> 4 gal, $16", () => {
  const r = computeMileageCost(mileageCostExample.inputs);
  assert.equal(r.gallons, 4);
  assert.equal(r.fuel_cost, 16);
});

test("Mileage: reimbursement = miles * IRS rate", () => {
  const r = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0 });
  assert.ok(close(r.reimbursement, 100 * IRS_STANDARD_MILEAGE_RATE));
});

test("Mileage: zero miles returns error", () => {
  const r = computeMileageCost({ round_trip_miles: 0, mpg: 25, fuel_price_per_gallon: 4.0 });
  assert.ok(r.error);
});

test("Mileage: zero mpg returns error", () => {
  const r = computeMileageCost({ round_trip_miles: 100, mpg: 0, fuel_price_per_gallon: 4.0 });
  assert.ok(r.error);
});

test("Mileage: zero price returns error", () => {
  const r = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 0 });
  assert.ok(r.error);
});

test("Mileage: doubled miles doubles fuel cost", () => {
  const a = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0 });
  const b = computeMileageCost({ round_trip_miles: 200, mpg: 25, fuel_price_per_gallon: 4.0 });
  assert.ok(close(b.fuel_cost, 2 * a.fuel_cost));
});

test("Mileage: doubled MPG halves fuel cost", () => {
  const a = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0 });
  const b = computeMileageCost({ round_trip_miles: 100, mpg: 50, fuel_price_per_gallon: 4.0 });
  assert.ok(close(b.fuel_cost, a.fuel_cost / 2));
});

test("Mileage: custom IRS rate respected", () => {
  const r = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0, irs_rate_per_mile: 0.50 });
  assert.equal(r.reimbursement, 50);
});

test("Mileage: IRS rate default 0.67", () => {
  assert.equal(IRS_STANDARD_MILEAGE_RATE, 0.67);
});

test("Mileage: surfaces irs rate in result", () => {
  const r = computeMileageCost({ round_trip_miles: 100, mpg: 25, fuel_price_per_gallon: 4.0 });
  assert.equal(r.irs_rate_per_mile, IRS_STANDARD_MILEAGE_RATE);
});

// --- Utility 108: Overtime ---

test("Overtime: 50 hr at $30 with 1.5x OT -> $1650", () => {
  const r = computeOvertime(overtimeExample.inputs);
  assert.ok(close(r.gross_pay, 40 * 30 + 10 * 30 * 1.5));
});

test("Overtime: 70 hr triggers double-time", () => {
  const r = computeOvertime({ total_hours: 70, regular_rate: 30 });
  assert.ok(r.double_time_hours > 0);
});

test("Overtime: 40 hr no overtime", () => {
  const r = computeOvertime({ total_hours: 40, regular_rate: 30 });
  assert.equal(r.overtime_hours, 0);
  assert.equal(r.double_time_hours, 0);
});

test("Overtime: 0 hr -> 0 gross", () => {
  const r = computeOvertime({ total_hours: 0, regular_rate: 30 });
  assert.equal(r.gross_pay, 0);
});

test("Overtime: regular_pay = reg_hr * rate", () => {
  const r = computeOvertime({ total_hours: 50, regular_rate: 30 });
  assert.equal(r.regular_pay, 40 * 30);
});

test("Overtime: ot_pay = ot_hr * rate * 1.5", () => {
  const r = computeOvertime({ total_hours: 50, regular_rate: 30, overtime_multiplier: 1.5 });
  assert.equal(r.overtime_pay, 10 * 30 * 1.5);
});

test("Overtime: dt threshold at 60 by default", () => {
  const r = computeOvertime({ total_hours: 65, regular_rate: 30 });
  assert.equal(r.double_time_hours, 5);
});

test("Overtime: custom multiplier respected", () => {
  const r = computeOvertime({ total_hours: 50, regular_rate: 30, overtime_multiplier: 2.0 });
  assert.equal(r.overtime_pay, 10 * 30 * 2.0);
});

test("Overtime: negative hours returns error", () => {
  const r = computeOvertime({ total_hours: -1, regular_rate: 30 });
  assert.ok(r.error);
});

test("Overtime: 80 hr breakdown", () => {
  const r = computeOvertime({ total_hours: 80, regular_rate: 30 });
  assert.equal(r.regular_hours, 40);
  assert.equal(r.overtime_hours, 20);
  assert.equal(r.double_time_hours, 20);
});

// --- Utility 109: Per-Diem ---

test("Per-diem: DC lodging $257", () => {
  const r = computePerDiem(perDiemExample.inputs);
  assert.equal(r.rate_dollars, 257);
});

test("Per-diem: DC m_and_ie $79", () => {
  const r = computePerDiem({ state: "DC", type: "m_and_ie" });
  assert.equal(r.rate_dollars, 79);
});

test("Per-diem: unknown state returns error", () => {
  const r = computePerDiem({ state: "XX" });
  assert.ok(r.error);
});

test("Per-diem: unknown type returns error", () => {
  const r = computePerDiem({ state: "CA", type: "snacks" });
  assert.ok(r.error);
});

test("Per-diem: surfaces state and type", () => {
  const r = computePerDiem({ state: "TX", type: "lodging" });
  assert.equal(r.state, "TX");
  assert.equal(r.type, "lodging");
});

test("Per-diem: 51 jurisdictions bundled (50 + DC)", () => {
  assert.equal(Object.keys(GSA_PERDIEM_RATES).length, 51);
});

test("Per-diem: every state has lodging and m_and_ie", () => {
  for (const v of Object.values(GSA_PERDIEM_RATES)) {
    assert.ok(typeof v.lodging === "number");
    assert.ok(typeof v.m_and_ie === "number");
  }
});

test("Per-diem: HI lodging > AL lodging", () => {
  assert.ok(GSA_PERDIEM_RATES.HI.lodging > GSA_PERDIEM_RATES.AL.lodging);
});

test("Per-diem: rates positive", () => {
  for (const v of Object.values(GSA_PERDIEM_RATES)) {
    assert.ok(v.lodging > 0 && v.m_and_ie > 0);
  }
});

test("Per-diem: default type is lodging", () => {
  const r = computePerDiem({ state: "CA" });
  assert.equal(r.type, "lodging");
});

// --- Utility 110: Geometry Pack ---

test("Geometry: circle radius 10 -> area ~ 314", () => {
  const r = computeGeometry(geometryExample.inputs);
  assert.ok(close(r.area, Math.PI * 100, 0.01));
});

test("Geometry: circle sector 90 deg = quarter area", () => {
  const r = computeGeometry({ shape: "circle", radius: 10, sector_deg: 90 });
  assert.ok(close(r.sector_area, r.area / 4, 0.001));
});

test("Geometry: circle circumference = 2*pi*r", () => {
  const r = computeGeometry({ shape: "circle", radius: 5 });
  assert.ok(close(r.circumference, 10 * Math.PI));
});

test("Geometry: ellipse a=b=r reduces to circle", () => {
  const r = computeGeometry({ shape: "ellipse", semi_major: 10, semi_minor: 10 });
  assert.ok(close(r.perimeter, 20 * Math.PI, 0.001));
  assert.ok(close(r.area, Math.PI * 100));
});

test("Geometry: hexagon side 10 -> perimeter 60", () => {
  const r = computeGeometry({ shape: "hexagon", side: 10 });
  assert.equal(r.perimeter, 60);
});

test("Geometry: hexagon area = 3*sqrt(3)/2 * s^2", () => {
  const r = computeGeometry({ shape: "hexagon", side: 10 });
  assert.ok(close(r.area, (3 * Math.sqrt(3) / 2) * 100));
});

test("Geometry: sphere volume = 4/3 pi r^3", () => {
  const r = computeGeometry({ shape: "sphere", radius: 3 });
  assert.ok(close(r.volume, (4 / 3) * Math.PI * 27));
});

test("Geometry: unknown shape returns error", () => {
  const r = computeGeometry({ shape: "torus" });
  assert.ok(r.error);
});

test("Geometry: zero radius returns error", () => {
  const r = computeGeometry({ shape: "circle", radius: 0 });
  assert.ok(r.error);
});

test("Geometry: polygon perimeter sums sides", () => {
  const r = computeGeometry({ shape: "polygon", sides: [3, 4, 5] });
  assert.equal(r.perimeter, 12);
});

// --- Utility 111: Dilution ---

test("Dilution: 100% concentrate, 10% target, 5 final -> 0.5 / 4.5", () => {
  const r = computeDilution(dilutionExample.inputs);
  assert.equal(r.concentrate_volume, 0.5);
  assert.equal(r.diluent_volume, 4.5);
});

test("Dilution: target > concentrate returns error", () => {
  const r = computeDilution({ concentrate_percent: 50, target_percent: 60, final_volume: 1 });
  assert.ok(r.error);
});

test("Dilution: zero final returns error", () => {
  const r = computeDilution({ concentrate_percent: 100, target_percent: 10, final_volume: 0 });
  assert.ok(r.error);
});

test("Dilution: target = concentrate -> all concentrate", () => {
  const r = computeDilution({ concentrate_percent: 50, target_percent: 50, final_volume: 10 });
  assert.equal(r.concentrate_volume, 10);
  assert.equal(r.diluent_volume, 0);
});

test("Dilution: doubled final doubles both volumes", () => {
  const a = computeDilution({ concentrate_percent: 100, target_percent: 10, final_volume: 5 });
  const b = computeDilution({ concentrate_percent: 100, target_percent: 10, final_volume: 10 });
  assert.ok(close(b.concentrate_volume, 2 * a.concentrate_volume));
  assert.ok(close(b.diluent_volume, 2 * a.diluent_volume));
});

test("Dilution: concentrate + diluent = final volume", () => {
  const r = computeDilution({ concentrate_percent: 70, target_percent: 14, final_volume: 25 });
  assert.ok(close(r.concentrate_volume + r.diluent_volume, 25));
});

test("Dilution: zero target returns error", () => {
  const r = computeDilution({ concentrate_percent: 100, target_percent: 0, final_volume: 5 });
  assert.ok(r.error);
});

test("Dilution: zero concentrate returns error", () => {
  const r = computeDilution({ concentrate_percent: 0, target_percent: 10, final_volume: 5 });
  assert.ok(r.error);
});

test("Dilution: 50% to 25% in 4 -> 2 + 2", () => {
  const r = computeDilution({ concentrate_percent: 50, target_percent: 25, final_volume: 4 });
  assert.equal(r.concentrate_volume, 2);
  assert.equal(r.diluent_volume, 2);
});

test("Dilution: high concentrate, low target", () => {
  const r = computeDilution({ concentrate_percent: 100, target_percent: 1, final_volume: 100 });
  assert.equal(r.concentrate_volume, 1);
  assert.equal(r.diluent_volume, 99);
});

// --- Utility 112: Slope from Level ---

test("Slope: 2% example -> ~1.146 deg", () => {
  const r = computeSlopeFromLevel(slopeFromLevelExample.inputs);
  assert.ok(close(r.degrees, Math.atan(0.02) * 180 / Math.PI, 0.01));
});

test("Slope: 45 deg -> 100% and 12 in/ft", () => {
  const r = computeSlopeFromLevel({ value: 45, from: "degrees" });
  assert.ok(close(r.percent, 100));
  assert.ok(close(r.in_per_ft, 12));
});

test("Slope: unknown unit returns error", () => {
  const r = computeSlopeFromLevel({ value: 1, from: "radians" });
  assert.ok(r.error);
});

test("Slope: 0 yields zeros", () => {
  const r = computeSlopeFromLevel({ value: 0, from: "degrees" });
  assert.equal(r.degrees, 0);
  assert.equal(r.percent, 0);
  assert.equal(r.in_per_ft, 0);
});

test("Slope: 1/4 in/ft -> ~2.083% and ~1.193 deg", () => {
  const r = computeSlopeFromLevel({ value: 0.25, from: "in_per_ft" });
  assert.ok(close(r.percent, 2.083, 0.01));
  assert.ok(close(r.degrees, 1.193, 0.01));
});

test("Slope: percent input round-trips", () => {
  const r = computeSlopeFromLevel({ value: 5, from: "percent" });
  assert.ok(close(r.percent, 5, 0.001));
});

test("Slope: degrees input round-trips", () => {
  const r = computeSlopeFromLevel({ value: 30, from: "degrees" });
  assert.ok(close(r.degrees, 30));
});

test("Slope: in_per_ft input round-trips", () => {
  const r = computeSlopeFromLevel({ value: 6, from: "in_per_ft" });
  assert.ok(close(r.in_per_ft, 6, 0.001));
});

test("Slope: non-numeric returns error", () => {
  const r = computeSlopeFromLevel({ value: "abc", from: "degrees" });
  assert.ok(r.error);
});

test("Slope: tan(30 deg) ~ 0.577", () => {
  const r = computeSlopeFromLevel({ value: 30, from: "degrees" });
  assert.ok(close(r.percent / 100, Math.tan(30 * Math.PI / 180), 0.001));
});

// --- Utility 113: Haversine ---

test("Haversine: NYC to LA ~ 2450 mi", () => {
  const r = computeHaversineDistance(haversineExample.inputs);
  assert.ok(r.miles > 2440 && r.miles < 2460);
});

test("Haversine: same point -> 0 distance", () => {
  const r = computeHaversineDistance({ lat1: 40, lon1: -74, lat2: 40, lon2: -74 });
  assert.ok(close(r.miles, 0));
  assert.ok(close(r.kilometers, 0));
});

test("Haversine: km/mi ratio ~ 1.609", () => {
  const r = computeHaversineDistance(haversineExample.inputs);
  assert.ok(close(r.kilometers / r.miles, 1.6093, 0.005));
});

test("Haversine: bearing in [0, 360)", () => {
  const r = computeHaversineDistance(haversineExample.inputs);
  assert.ok(r.initial_bearing_deg >= 0 && r.initial_bearing_deg < 360);
});

test("Haversine: due east bearing ~ 90 deg", () => {
  const r = computeHaversineDistance({ lat1: 0, lon1: 0, lat2: 0, lon2: 1 });
  assert.ok(close(r.initial_bearing_deg, 90, 0.5));
});

test("Haversine: due north bearing ~ 0 deg", () => {
  const r = computeHaversineDistance({ lat1: 0, lon1: 0, lat2: 1, lon2: 0 });
  assert.ok(close(r.initial_bearing_deg, 0, 0.5));
});

test("Haversine: due south bearing ~ 180 deg", () => {
  const r = computeHaversineDistance({ lat1: 1, lon1: 0, lat2: 0, lon2: 0 });
  assert.ok(close(r.initial_bearing_deg, 180, 0.5));
});

test("Haversine: 1 deg lat ~ 69 mi", () => {
  const r = computeHaversineDistance({ lat1: 0, lon1: 0, lat2: 1, lon2: 0 });
  assert.ok(close(r.miles, 69, 0.5));
});

test("Haversine: 1 deg lon at equator ~ 69 mi", () => {
  const r = computeHaversineDistance({ lat1: 0, lon1: 0, lat2: 0, lon2: 1 });
  assert.ok(close(r.miles, 69, 0.5));
});

test("Haversine: opposite poles ~ pi*R distance", () => {
  const r = computeHaversineDistance({ lat1: -90, lon1: 0, lat2: 90, lon2: 0 });
  assert.ok(close(r.miles, Math.PI * 3958.8, 1));
});
