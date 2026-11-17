import type { AngleRange } from '../types';

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Ângulo de elevação (°) necessário para a lança atingir um dado raio horizontal. */
export const radiusToAngleDeg = (radius: number, boomLength: number): number =>
  radToDeg(Math.acos(Math.min(1, Math.max(-1, radius / boomLength))));

/** Altura do pivô da lança em relação ao solo (m). */
export const PIVOT_HEIGHT_M = 2.5;

export interface Geometry {
  radAngle: number;
  radRot: number;
  radius: number;
  hookHeight: number;
  coordX: number;
  coordY: number;
  coordZ: number;
  minPossibleRadius: number;
  maxPossibleRadius: number;
}

/** Raios mínimo/máximo alcançáveis, dados os limites de elevação do modelo. */
export function computeGeometry(
  boomLength: number,
  angle: number,
  rotation: number,
  angleRange: AngleRange
): Geometry {
  const radAngle = degToRad(angle);
  const radRot = degToRad(rotation);

  const radius = Math.max(1, Number((boomLength * Math.cos(radAngle)).toFixed(2)));
  const hookHeight = Number((boomLength * Math.sin(radAngle) + PIVOT_HEIGHT_M).toFixed(2));

  return {
    radAngle,
    radRot,
    radius,
    hookHeight,
    coordX: Number((radius * Math.sin(radRot)).toFixed(2)),
    coordY: hookHeight,
    coordZ: Number((radius * Math.cos(radRot)).toFixed(2)),
    maxPossibleRadius: boomLength * Math.cos(degToRad(angleRange.min)),
    minPossibleRadius: Math.max(0.5, boomLength * Math.cos(degToRad(angleRange.max)))
  };
}
