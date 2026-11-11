export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/** Faixa de ângulos usada para calcular os raios mínimo/máximo possíveis. */
export const MIN_BOOM_ANGLE_DEG = 10;
export const MAX_BOOM_ANGLE_DEG = 70;

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

export function computeGeometry(boomLength: number, angle: number, rotation: number): Geometry {
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
    maxPossibleRadius: boomLength * Math.cos(degToRad(MIN_BOOM_ANGLE_DEG)),
    minPossibleRadius: Math.max(0.5, boomLength * Math.cos(degToRad(MAX_BOOM_ANGLE_DEG)))
  };
}
