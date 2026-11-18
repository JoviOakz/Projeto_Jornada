import { CHARTS_MD300L, tableLengthFor } from '../data/charts';
import {
  CABLE_MAX_M,
  CABLE_MIN_M,
  MD300L_BOOM_MAX_M,
  MD300L_BOOM_RETRACTED_M,
  TM130_BOOM_LENGTH_M,
  MD300L_FRONTAL_HALF_ARC_DEG,
  MD300L_MAX_ANGLE_DEG,
  MD300L_MIN_ANGLE_DEG,
  MD300L_SLEW_RANGE,
  TM130_ANGLE_RANGE,
  TM130_SLEW_CENTER_DEG,
  TM130_SLEW_RANGE
} from '../data/craneSpecs';
import type { AngleRange, CraneModel, LiftInputs, OperatingSector, SlewRange } from '../types';
import { radiusToAngleDeg } from './geometry';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const SECTOR_LABELS: Record<OperatingSector, string> = {
  FRONTAL: 'Frontal (sobre a cabine, 110°)',
  LATERAL_TRASEIRA: 'Lateral / Traseira (250°)',
  TRASEIRO_RESTRITO: 'Traseiro (setor restrito de 120°)'
};

/** Menor raio presente nas duas tabelas (frontal e lateral) para a lança. */
function tableMinRadius(boomLength: number): number | null {
  const mins = [CHARTS_MD300L.FRONTAL, CHARTS_MD300L.LATERAL_TRASEIRA].map((chart) => {
    const tLen = tableLengthFor(boomLength);
    const row = tLen === null ? undefined : chart.matrix[tLen];
    const radii = row ? Object.keys(row).map(Number) : [];
    return radii.length ? Math.min(...radii) : null;
  });
  if (mins.some((m) => m === null)) return null;
  return Math.max(...(mins as number[]));
}

/** Faixa de elevação permitida (MD300L: 0° a 83°, limitada pelo menor raio da tabela). */
export function getAngleRange(model: CraneModel, boomLength: number): AngleRange {
  if (model === 'TM130') return TM130_ANGLE_RANGE;
  const minR = tableMinRadius(boomLength);
  if (minR === null) return { min: MD300L_MIN_ANGLE_DEG, max: MD300L_MAX_ANGLE_DEG };
  const tableMaxAngle = Math.floor(radiusToAngleDeg(minR, boomLength));
  return { min: MD300L_MIN_ANGLE_DEG, max: Math.min(MD300L_MAX_ANGLE_DEG, tableMaxAngle) };
}

export function getSlewRange(model: CraneModel): SlewRange {
  return model === 'TM130' ? TM130_SLEW_RANGE : MD300L_SLEW_RANGE;
}

export function getOperatingSector(model: CraneModel, rotation: number): OperatingSector {
  if (model === 'TM130') return 'TRASEIRO_RESTRITO';
  const az = ((rotation % 360) + 360) % 360;
  return az <= MD300L_FRONTAL_HALF_ARC_DEG || az >= 360 - MD300L_FRONTAL_HALF_ARC_DEG
    ? 'FRONTAL'
    : 'LATERAL_TRASEIRA';
}

/** Garante que os inputs respeitem os limites do modelo (usar após qualquer alteração). */
export function normalizeInputs(inputs: LiftInputs, previousModel?: CraneModel): LiftInputs {
  const modelChanged = previousModel !== undefined && previousModel !== inputs.model;
  const boomLength =
    inputs.model === 'TM130'
      ? TM130_BOOM_LENGTH_M
      : clamp(Math.round(inputs.boomLength * 10) / 10, MD300L_BOOM_RETRACTED_M, MD300L_BOOM_MAX_M);

  const angleRange = getAngleRange(inputs.model, boomLength);
  const slew = getSlewRange(inputs.model);

  let rotation = inputs.rotation;
  if (!slew.continuous) {
    rotation = modelChanged ? TM130_SLEW_CENTER_DEG : clamp(rotation, slew.min, slew.max);
  }
  return {
    ...inputs,
    boomLength,
    angle: clamp(inputs.angle, angleRange.min, angleRange.max),
    rotation,
    cableLength: clamp(inputs.cableLength, CABLE_MIN_M, CABLE_MAX_M)
  };
}
