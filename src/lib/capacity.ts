import { CHARTS_MD300L, CHART_TM130, tableLengthFor } from '../data/charts';
import { SECTORS } from '../data/craneSpecs';
import type { CraneModel, OperatingSector, ZoneSet } from '../types';
import { radiusToAngleDeg } from './geometry';

/** Limite normativo RN01: a partir disso a operação é reprovada. */
export const NORMATIVE_LIMIT_PCT = 85;
const NORMATIVE_RATIO = NORMATIVE_LIMIT_PCT / 100;

/** Peso do gancho/moitão por modelo (kg). */
export const HOOK_WEIGHT_KG: Record<CraneModel, number> = {
  MD300L: 235,
  TM130: 150
};

/**
 * MD300L: capacidade da tabela oficial do setor (frontal ou lateral/traseira).
 * Conservador: usa o PRÓXIMO raio tabelado e a tabela do PRÓXIMO comprimento de lança tabelado.
 * Acima do maior raio tabelado para a lança => fora de tabela (null).
 */
export function lookupMD300L(sector: OperatingSector, len: number, r: number): number | null {
  const chart = sector === 'FRONTAL' ? CHARTS_MD300L.FRONTAL : CHARTS_MD300L.LATERAL_TRASEIRA;
  const tLen = tableLengthFor(len);
  const row = tLen === null ? undefined : chart.matrix[tLen];
  if (!row) return null;
  const radii = chart.radii.filter((rad) => row[rad] !== undefined);
  const next = radii.find((rad) => rad >= r - 1e-9);
  return next === undefined ? null : row[next] ?? null;
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
      return c1 + ((ang - a1) / (a2 - a1)) * (c2 - c1);
    }
  }
  return 3000;
}

export function getMaxCapacityKg(
  model: CraneModel,
  sector: OperatingSector,
  boomLength: number,
  radius: number,
  angle: number
): number | null {
  return model === 'MD300L' ? lookupMD300L(sector, boomLength, radius) : interpolateTM130(angle);
}

// --- ZONAS NO SOLO ---
const RADIUS_STEP_M = 0.1;

function capacityAtRadius(
  model: CraneModel, sector: OperatingSector, boomLength: number, r: number
): number | null {
  return model === 'MD300L'
    ? lookupMD300L(sector, boomLength, r)
    : interpolateTM130(radiusToAngleDeg(r, boomLength));
}

/** Maior raio (contíguo a partir do mínimo) em que a capacidade atende `requiredCapacity`. */
function findLimitRadius(
  model: CraneModel, sector: OperatingSector, boomLength: number,
  requiredCapacity: number, minR: number, maxR: number
): number {
  const first = capacityAtRadius(model, sector, boomLength, minR);
  if (first === null || first < requiredCapacity) return minR;
  const steps = Math.ceil((maxR - minR) / RADIUS_STEP_M);
  let lastOk = minR;
  for (let i = 1; i <= steps; i++) {
    const r = Math.min(minR + i * RADIUS_STEP_M, maxR);
    const cap = capacityAtRadius(model, sector, boomLength, r);
    if (cap === null || cap < requiredCapacity) return lastOk;
    lastOk = r;
  }
  return maxR;
}

interface ZoneParams {
  model: CraneModel;
  boomLength: number;
  totalLoadKg: number;
  minR: number;
  maxR: number;
}

/** Uma zona (verde/laranja/vermelha) para cada setor de operação do modelo. */
export function computeZones({ model, boomLength, totalLoadKg, minR, maxR }: ZoneParams): ZoneSet[] {
  return SECTORS[model].map((s) => {
    const safeR = findLimitRadius(model, s.id, boomLength, totalLoadKg / NORMATIVE_RATIO, minR, maxR);
    const warnR = findLimitRadius(model, s.id, boomLength, totalLoadKg, minR, maxR);
    return {
      sector: s.id, startDeg: s.startDeg, endDeg: s.endDeg,
      minR, safeR, warnR, maxR, showOrange: safeR < warnR
    };
  });
}
