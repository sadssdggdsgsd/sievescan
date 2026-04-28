/**
 * calculationService.ts
 * 
 * Implements Hazen and Gustafson formulas for hydraulic conductivity (K).
 */

export interface CalculationResult {
  hazenK: number;
  gustafsonK: number;
  u: number;
  e: number;
  g: number;
  E: number;
}

export function calculateConductivity(d10: number, d60: number): CalculationResult {
  // Method A: Hazen's formula
  // Standard geotechnical shortcut: K [m/day] = 100 * D10^2 [mm]
  // To get m/s: (100 * D10^2) / 86400
  const hazenK = (100 * Math.pow(d10, 2)) / 86400;

  // Method B: Gustafson's formula
  // U = D10 / D60
  const U = d10 / d60;
  
  // Natural Logarithm (LN)
  const lnU = Math.log(U);
  
  // Base-10 Logarithm (LOG)
  const logU = Math.log10(U);

  // e = 0.8 * ((1/(2 * LN(U)) - (1 / ((U * U) - 1))))
  const e = 0.8 * ((1 / (2 * lnU)) - (1 / (Math.pow(U, 2) - 1)));

  // g = (1.3 / LOG(U)) * (((U * U) - 1) / (U^1.8))
  const g = (1.3 / logU) * ((Math.pow(U, 2) - 1) / Math.pow(U, 1.8));

  // E = (1.35 * (1000 * 9.81) / 0.0013) * (((e^3) / (1 + e)) * (1 / (g * g)))
  const E = (1.35 * (1000 * 9.81) / 0.0013) * (
    (Math.pow(e, 3) / (1 + e)) * (1 / (g * g))
  );

  // K = E * (D10 / 1000)^2
  const gustafsonK = E * Math.pow(d10 / 1000, 2);

  return {
    hazenK,
    gustafsonK,
    u: U,
    e,
    g,
    E
  };
}
