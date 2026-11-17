import { CHART_MD300L } from '../data/charts';
import {
  MD300L_FRONTAL_HALF_ARC_DEG,
  MD300L_MAX_ANGLE_DEG,
  MD300L_MIN_ANGLE_DEG,
  MD300L_SLEW_RANGE,
  TM130_ANGLE_RANGE,
  TM130_SLEW_CENTER_DEG,
  TM130_SLEW_RANGE
} from '../data/limits';
import type { AngleRange, CraneModel, LiftInputs, OperatingSector, SlewRange } from '../types';
import { radiusToAngleDeg } from './geometry';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const SECTOR_LABELS: Record<OperatingSector, string> = {
  FRONTAL: 'Frontal (sobre a cabine)',
  LATERAL_TRASEIRA: 'Lateral / Traseira',
  TRASEIRO_RESTRITO: 'Traseiro (setor restrito de 120°)'
};

/**
 * Faixa de elevação permitida.
 * MD300L: 0° a 83°, limitada também pelo menor raio da tabela da lança escolhida
 * (ex.: lança curta não chega a 83° com carga).
 */
export function getAngleRange(model: CraneModel, boomLength: number): AngleRange {
  if (model === 'TM130') return TM130_ANGLE_RANGE;

  const row = CHART_MD300L.matrix[boomLength];
  const radii = row ? Object.keys(row).map(Number) : [];
  if (radii.length === 0) return { min: MD300L_MIN_ANGLE_DEG, max: MD300L_MAX_ANGLE_DEG };

  const tableMaxAngle = Math.floor(radiusToAngleDeg(Math.min(...radii), boomLength));
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
  const angleRange = getAngleRange(inputs.model, inputs.boomLength);
  const slew = getSlewRange(inputs.model);
  const modelChanged = previousModel !== undefined && previousModel !== inputs.model;

  let rotation = inputs.rotation;
  if (!slew.continuous) {
    rotation = modelChanged ? TM130_SLEW_CENTER_DEG : clamp(rotation, slew.min, slew.max);
  }

  return {
    ...inputs,
    angle: clamp(inputs.angle, angleRange.min, angleRange.max),
    rotation
  };
}
