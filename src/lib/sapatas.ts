import { CARGO_HALF_SIZE_M, PAD_HALF_SIZE_M, VEHICLE_LAYOUT } from '../data/craneSpecs';
import type { CraneModel } from '../types';

/** Posição da carga no solo, relativa ao eixo de giro (x = lateral, z = frente). */
export function hookGroundPosition(radius: number, radRot: number) {
  return { x: radius * Math.sin(radRot), z: radius * Math.cos(radRot) };
}

/** Para cada sapata (mesma ordem de VEHICLE_LAYOUT[model].pads): a carga está sobre ela? */
export function padHits(model: CraneModel, radius: number, radRot: number): boolean[] {
  const { x, z } = hookGroundPosition(radius, radRot);
  const reach = PAD_HALF_SIZE_M + CARGO_HALF_SIZE_M;
  return VEHICLE_LAYOUT[model].pads.map(
    (pad) => Math.abs(x - pad.x) <= reach && Math.abs(z - pad.z) <= reach
  );
}

/** A carga não pode passar nem descer sobre uma sapata. */
export function isCargoOverSapata(model: CraneModel, radius: number, radRot: number): boolean {
  return padHits(model, radius, radRot).some(Boolean);
}
