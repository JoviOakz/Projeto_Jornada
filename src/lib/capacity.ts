import { CHART_MD300L, CHART_TM130 } from '../data/charts';
import type { CraneModel } from '../types';
import { radiusToAngleDeg } from './geometry';

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

const RADIUS_STEP_M = 0.1;

/** Capacidade (kg) em um dado raio, para qualquer modelo. */
function capacityAtRadius(model: CraneModel, boomLength: number, r: number): number | null {
  return model === 'MD300L'
    ? interpolateMD300L(boomLength, r)
    : interpolateTM130(radiusToAngleDeg(r, boomLength));
}

/**
 * Maior raio (contíguo a partir do mínimo) em que a capacidade ainda atende a `requiredCapacity`.
 * - Se nem o raio mínimo atende, retorna `minR` (zona vazia).
 * - Se todos os raios atendem, retorna `maxR` (zona completa).
 */
function findLimitRadius(
  model: CraneModel,
  boomLength: number,
  requiredCapacity: number,
  minR: number,
  maxR: number
): number {
  const first = capacityAtRadius(model, boomLength, minR);
  if (first === null || first < requiredCapacity) return minR;

  const steps = Math.ceil((maxR - minR) / RADIUS_STEP_M);
  let lastOk = minR;
  for (let i = 1; i <= steps; i++) {
    const r = Math.min(minR + i * RADIUS_STEP_M, maxR);
    const cap = capacityAtRadius(model, boomLength, r);
    if (cap === null || cap < requiredCapacity) return lastOk;
    lastOk = r;
  }
  return maxR;
}

/** Raio máximo onde a utilização ainda fica abaixo do limite seguro (zona verde). */
export function computeSafeRadiusGround({
  model, boomLength, totalLoadKg, minR, maxR
}: RadiusLimitParams): number {
  return findLimitRadius(model, boomLength, totalLoadKg / SAFE_RADIUS_RATIO, minR, maxR);
}

/** Raio máximo onde a carga ainda é suportada (100% da capacidade) — início da zona vermelha. */
export function computeWarningRadiusGround({
  model, boomLength, totalLoadKg, minR, maxR
}: RadiusLimitParams): number {
  return findLimitRadius(model, boomLength, totalLoadKg, minR, maxR);
}
