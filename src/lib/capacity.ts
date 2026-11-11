import { CHART_MD300L, CHART_TM130 } from '../data/charts';
import type { CraneModel } from '../types';
import { degToRad } from './geometry';

/** Limite normativo RN01: acima disso a operação é reprovada. */
export const NORMATIVE_LIMIT_PCT = 85;

/** Peso do gancho/moitão por modelo (kg). */
export const HOOK_WEIGHT_KG: Record<CraneModel, number> = {
  MD300L: 235,
  TM130: 150
};

// TODO: unificar com NORMATIVE_LIMIT_PCT (hoje o raio seguro usa 84%, o status usa 85%).
const SAFE_RADIUS_RATIO = 0.84;

// --- INTERPOLAÇÃO ---
// TODO: último raio da tabela retorna null (deveria usar o valor da linha).
// TODO: interpolação linear é não-conservadora; avaliar usar o próximo raio maior.
export function interpolateMD300L(len: number, r: number): number | null {
  const row = CHART_MD300L.matrix[len];
  if (!row) return null;

  const availableRadii = CHART_MD300L.radii.filter((rad) => row[rad] !== undefined);
  if (availableRadii.length === 0) return null;

  if (r <= availableRadii[0]) return row[availableRadii[0]] ?? null;
  if (r >= availableRadii[availableRadii.length - 1]) return null;

  for (let i = 0; i < availableRadii.length - 1; i++) {
    const r1 = availableRadii[i];
    const r2 = availableRadii[i + 1];
    if (r >= r1 && r <= r2) {
      const c1 = row[r1]!;
      const c2 = row[r2]!;
      const t = (r - r1) / (r2 - r1);
      return c1 + t * (c2 - c1);
    }
  }
  return null;
}

export function interpolateTM130(ang: number): number {
  const angles = CHART_TM130.angles;
  if (ang <= angles[0]) return CHART_TM130.capacities[angles[0]];
  if (ang >= angles[angles.length - 1]) return CHART_TM130.capacities[angles[angles.length - 1]];

  for (let i = 0; i < angles.length - 1; i++) {
    const a1 = angles[i];
    const a2 = angles[i + 1];
    if (ang >= a1 && ang <= a2) {
      const c1 = CHART_TM130.capacities[a1];
      const c2 = CHART_TM130.capacities[a2];
      const t = (ang - a1) / (a2 - a1);
      return c1 + t * (c2 - c1);
    }
  }
  return 3000;
}

export function getMaxCapacityKg(
  model: CraneModel,
  boomLength: number,
  radius: number,
  angle: number
): number | null {
  return model === 'MD300L' ? interpolateMD300L(boomLength, radius) : interpolateTM130(angle);
}

// --- RAIOS-LIMITE NO SOLO ---
interface RadiusLimitParams {
  model: CraneModel;
  boomLength: number;
  totalLoadKg: number;
  minR: number;
  maxR: number;
}

/** Raio máximo onde a utilização ainda fica abaixo do limite seguro (zona verde). */
// TODO: TM130 usa o ângulo que falha (uma etapa não-conservadora) e,
// se nenhum ângulo falha, retorna o raio mínimo.
export function computeSafeRadiusGround({
  model, boomLength, totalLoadKg, minR, maxR
}: RadiusLimitParams): number {
  const targetCapacity = totalLoadKg / SAFE_RADIUS_RATIO;

  if (model === 'MD300L') {
    let foundLimit = maxR;
    for (let r = minR; r <= maxR; r += 0.2) {
      const cap = interpolateMD300L(boomLength, r);
      if (cap === null || cap < targetCapacity) {
        foundLimit = r;
        break;
      }
    }
    return Math.max(minR, Math.min(maxR, foundLimit));
  }

  const angles = CHART_TM130.angles;
  let safeLimitAngle = 70;
  for (let i = angles.length - 1; i >= 0; i--) {
    const a = angles[i];
    if (CHART_TM130.capacities[a] < targetCapacity) {
      safeLimitAngle = a;
      break;
    }
  }
  const rLimit = boomLength * Math.cos(degToRad(safeLimitAngle));
  return Math.max(minR, Math.min(maxR, rLimit));
}

/** Raio máximo onde a carga ainda é suportada (100% da capacidade) — início da zona vermelha. */
export function computeWarningRadiusGround({
  model, boomLength, totalLoadKg, minR, maxR
}: RadiusLimitParams): number {
  if (model === 'MD300L') {
    let foundLimit = maxR;
    for (let r = minR; r <= maxR; r += 0.2) {
      const cap = interpolateMD300L(boomLength, r);
      if (cap === null || cap < totalLoadKg) {
        foundLimit = r;
        break;
      }
    }
    return foundLimit;
  }

  const angles = CHART_TM130.angles;
  let warningAngle = 70;
  for (let i = angles.length - 1; i >= 0; i--) {
    const a = angles[i];
    if (CHART_TM130.capacities[a] < totalLoadKg) {
      warningAngle = a;
      break;
    }
  }
  const rLimit = boomLength * Math.cos(degToRad(warningAngle));
  return Math.max(minR, Math.min(maxR, rLimit));
}
