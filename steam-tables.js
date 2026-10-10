// Saturated steam properties by the IAPWS Industrial Formulation 1997.
//
// Shared by saturated-steam-properties (calc-steamplant.js) and the steam
// calculators that take a pressure in place of a looked-up specific volume
// (calc-pipefit.js). The saturation line is Eq. 31, the saturated liquid is the
// region 1 Gibbs equation (Eq. 7) and the saturated vapor the region 2 Gibbs
// equation (Eq. 15), with coefficients from Tables 2, 10, 11 and 34 of IAPWS
// R7-97(2012); rows are [I, J, n] (Table 10: [J, n]). A unit test reproduces
// the release's program-verification values (Tables 5, 15, 35, 36) to 9
// significant digits.

const _IF97_R1 = [[0, -2, 0.14632971213167], [0, -1, -0.84548187169114], [0, 0, -3.7563603672040005], [0, 1, 3.3855169168385], [0, 2, -0.95791963387872], [0, 3, 0.15772038513228], [0, 4, -0.016616417199501], [0, 5, 0.00081214629983568], [1, -9, 0.00028319080123804], [1, -7, -0.00060706301565874], [1, -1, -0.018990068218419004], [1, 0, -0.032529748770505004], [1, 1, -0.021841717175414], [1, 3, -5.283835796993001e-05], [2, -3, -0.00047184321073267], [2, 0, -0.00030001780793026], [2, 1, 4.7661393906987e-05], [2, 3, -4.4141845330846005e-06], [2, 17, -7.2694996297594e-16], [3, -4, -3.1679644845054e-05], [3, 0, -2.8270797985312004e-06], [3, 6, -8.5205128120103e-10], [4, -5, -2.2425281908000003e-06], [4, -2, -6.517122289560099e-07], [4, 10, -1.4341729937924e-13], [5, -8, -4.0516996860117e-07], [8, -11, -1.2734301741641e-09], [8, -6, -1.7424871230634003e-10], [21, -29, -6.876213129553101e-19], [23, -31, 1.4478307828521e-20], [29, -38, 2.6335781662795e-23], [30, -39, -1.1947622640071e-23], [31, -40, 1.8228094581404e-24], [32, -41, -9.3537087292458e-26]];
const _IF97_R2O = [[0, -9.6927686500217], [1, 10.086655968018], [-5, -0.005608791128302], [-4, 0.071452738081455], [-3, -0.40710498223928], [-2, 1.4240819171444], [-1, -4.383951131945], [2, -0.28408632460772], [3, 0.021268463753307]];
const _IF97_R2 = [[1, 0, -0.0017731742473213], [1, 1, -0.017834862292358002], [1, 2, -0.045996013696365], [1, 3, -0.05758125908343201], [1, 6, -0.05032527872793], [2, 1, -3.3032641670203e-05], [2, 2, -0.00018948987516315], [2, 4, -0.0039392777243355], [2, 7, -0.043797295650573], [2, 36, -2.6674547914087e-05], [3, 0, 2.0481737692309e-08], [3, 1, 4.3870667284434996e-07], [3, 3, -3.227767723857e-05], [3, 6, -0.0015033924542148], [3, 35, -0.040668253562649], [4, 1, -7.8847309559367e-10], [4, 2, 1.2790717852284999e-08], [4, 3, 4.822537271850699e-07], [5, 7, 2.2922076337661e-06], [6, 3, -1.6714766451061e-11], [6, 16, -0.0021171472321355003], [6, 35, -23.895741934104002], [7, 0, -5.905956432427e-18], [7, 11, -1.2621808899101e-06], [7, 25, -0.038946842435739], [8, 8, 1.1256211360459e-11], [8, 36, -8.2311340897998], [9, 13, 1.9809712802088e-08], [10, 4, 1.0406965210174001e-19], [10, 10, -1.0234747095929e-13], [10, 14, -1.0018179379511e-09], [16, 29, -8.0882908646985e-11], [16, 50, 0.10693031879409], [18, 57, -0.33662250574171], [20, 20, 8.9185845355421e-25], [20, 35, 3.0629316876232e-13], [20, 48, -4.2002467698208e-06], [21, 21, -5.9056029685639e-26], [22, 53, 3.7826947613457006e-06], [23, 39, -1.2768608934681e-15], [24, 26, 7.3087610595061e-29], [24, 40, 5.5414715350777995e-17], [24, 58, -9.436970724121e-07]];
const _IF97_SAT = [1167.0521452767, -724213.16703206, -17.073846940092, 12020.82470247, -3232555.0322333, 14.91510861353, -4823.2657361591, 405113.40542057, -0.23855557567849, 650.17534844798];
const _IF97_R = 0.461526; // kJ/(kg K)
// Saturation temperature, K, from pressure in MPa (Eq. 31).
function if97SaturationTempK(p_mpa) {
  const n = _IF97_SAT, b = Math.pow(p_mpa, 0.25);
  const E = b * b + n[2] * b + n[5], F = n[0] * b * b + n[3] * b + n[6], G = n[1] * b * b + n[4] * b + n[7];
  const D = 2 * G / (-F - Math.sqrt(F * F - 4 * E * G));
  return (n[9] + D - Math.sqrt((n[9] + D) * (n[9] + D) - 4 * (n[8] + n[9] * D))) / 2;
}
// Saturation pressure, MPa, from temperature in K (Eq. 30).
function if97SaturationPressureMpa(t_k) {
  const n = _IF97_SAT, th = t_k + n[8] / (t_k - n[9]);
  const A = th * th + n[0] * th + n[1], B = n[2] * th * th + n[3] * th + n[4], C = n[5] * th * th + n[6] * th + n[7];
  return Math.pow(2 * C / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
}
// Liquid water: [v m3/kg, h kJ/kg] at T in K, p in MPa (region 1).
function if97Region1(t_k, p_mpa) {
  const pi = p_mpa / 16.53, tau = 1386 / t_k;
  let gp = 0, gt = 0;
  for (const [I, J, n] of _IF97_R1) {
    gp -= n * I * Math.pow(7.1 - pi, I - 1) * Math.pow(tau - 1.222, J);
    gt += n * Math.pow(7.1 - pi, I) * J * Math.pow(tau - 1.222, J - 1);
  }
  return [_IF97_R * t_k / p_mpa * pi * gp / 1000, _IF97_R * t_k * tau * gt];
}
// Steam: [v m3/kg, h kJ/kg] at T in K, p in MPa (region 2).
function if97Region2(t_k, p_mpa) {
  const pi = p_mpa, tau = 540 / t_k;
  let gp = 1 / pi, gt = 0;
  for (const [J, n] of _IF97_R2O) gt += n * J * Math.pow(tau, J - 1);
  for (const [I, J, n] of _IF97_R2) {
    gp += n * I * Math.pow(pi, I - 1) * Math.pow(tau - 0.5, J);
    gt += n * Math.pow(pi, I) * J * Math.pow(tau - 0.5, J - 1);
  }
  return [_IF97_R * t_k / p_mpa * pi * gp / 1000, _IF97_R * t_k * tau * gt];
}
// The four equations, exposed so a test can hold them to the release's own
// program-verification tables (Tables 5, 15, 35 and 36).
export const IF97 = { saturationTempK: if97SaturationTempK, saturationPressureMpa: if97SaturationPressureMpa, region1: if97Region1, region2: if97Region2 };
const _PSI_PER_MPA = 1e6 / 6894.757293168; // exact pound-force per square inch
const _FT3LB_PER_M3KG = 0.45359237 / Math.pow(0.3048, 3);
const _BTULB_PER_KJKG = 1 / 2.326; // International Table Btu

// Absolute pressure limits of saturatedSteam(), psia.
export const SATURATED_STEAM_MIN_PSIA = 0.1;
export const SATURATED_STEAM_MAX_PSIA = 2300;

// Saturated properties at an absolute pressure in psia, in US units, or null
// outside 0.1 to 2,300 psia. Enthalpy is measured from liquid water at the
// triple point (32.018 F), as in US steam tables.
export function saturatedSteam(absolute_pressure_psia) {
  if (!(absolute_pressure_psia >= SATURATED_STEAM_MIN_PSIA && absolute_pressure_psia <= SATURATED_STEAM_MAX_PSIA)) return null;
  const p_mpa = absolute_pressure_psia / _PSI_PER_MPA;
  const t_k = if97SaturationTempK(p_mpa);
  const [vf, hf] = if97Region1(t_k, p_mpa);
  const [vg, hg] = if97Region2(t_k, p_mpa);
  const hf_btulb = hf * _BTULB_PER_KJKG, hg_btulb = hg * _BTULB_PER_KJKG;
  return {
    sat_temp_f: t_k * 1.8 - 459.67,
    spec_vol_ft3lb: vg * _FT3LB_PER_M3KG,
    liquid_spec_vol_ft3lb: vf * _FT3LB_PER_M3KG,
    hf_btulb, hg_btulb, hfg_btulb: hg_btulb - hf_btulb,
  };
}
