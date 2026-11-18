import type { AngleRange, CraneModel, SectorDef, SlewRange, VehicleLayout } from '../types';

// Convenção de azimute: 0° = sobre a cabine (frente), horário. 180° = diretamente atrás.

// ---- Luna TM 130 (LN 130 TM BR) ----
// Elevação de 0° a 70°; giro da coluna restrito ao setor traseiro de 120°.
export const TM130_ANGLE_RANGE: AngleRange = { min: 0, max: 70 };
export const TM130_SLEW_RANGE: SlewRange = { min: 120, max: 240, continuous: false };
export const TM130_SLEW_CENTER_DEG = 180;

// ---- Madal Palfinger MD 300L (30 t) ----
// Lança principal: elevação até 83° (85° só com JIB). Giro contínuo de 360°.
export const MD300L_MIN_ANGLE_DEG = 0;
export const MD300L_MAX_ANGLE_DEG = 83;
export const MD300L_SLEW_RANGE: SlewRange = { min: 0, max: 360, continuous: true };

/** Catálogo: área frontal = 110° (±55°); lateral e traseira = 250°. */
export const MD300L_FRONTAL_HALF_ARC_DEG = 55;

/** Setores de operação por modelo (cada um usa sua própria tabela de carga). */
export const SECTORS: Record<CraneModel, SectorDef[]> = {
  MD300L: [
    { id: 'FRONTAL', startDeg: -MD300L_FRONTAL_HALF_ARC_DEG, endDeg: MD300L_FRONTAL_HALF_ARC_DEG },
    { id: 'LATERAL_TRASEIRA', startDeg: MD300L_FRONTAL_HALF_ARC_DEG, endDeg: 360 - MD300L_FRONTAL_HALF_ARC_DEG }
  ],
  TM130: [{ id: 'TRASEIRO_RESTRITO', startDeg: TM130_SLEW_RANGE.min, endDeg: TM130_SLEW_RANGE.max }]
};

// ---- Sapatas (bases de apoio no chão, na ponta das patolas) ----
/** Metade do lado da sapata (m) — estimado a partir do desenho (~0,8 m de prato). */
export const PAD_HALF_SIZE_M = 0.4;
/** Metade do lado da carga (m). A carga não pode passar nem descer sobre a sapata. */
export const CARGO_HALF_SIZE_M = 0.8;

// MD 300L — medido no desenho técnico do catálogo (vistas lateral e frontal),
// tendo o eixo de giro (último eixo traseiro) como origem. z>0 = frente.
// Cotas: 6.500 mm entre centros das sapatas (±3,25 m); dianteiras ≈ 3,8 m à frente;
// traseiras ≈ 2,3 m atrás; entre-eixos 4.580 + 1.360 mm; para-choque ≈ 7,3 m; fim ≈ 3,0 m atrás.
const MD300L_LAYOUT: VehicleLayout = {
  bodyHalfWidth: 1.3,
  frontZ: 7.3,
  rearZ: -3.0,
  cabStartZ: 5.5,
  axlesZ: [5.93, 1.36, 0],
  pads: [
    { x: -3.25, z: 3.8 },
    { x: 3.25, z: 3.8 },
    { x: -3.25, z: -2.3 },
    { x: 3.25, z: -2.3 }
  ],
  estimated: false
};

export const VEHICLE_LAYOUT: Record<CraneModel, VehicleLayout> = {
  MD300L: MD300L_LAYOUT,
  // TODO: sem desenho do TM 130 — usando o layout do MD 300L como provisório.
  TM130: { ...MD300L_LAYOUT, estimated: true }
};

// ---- Lança telescópica ----
// MD 300L: 4 seções; 10.500 mm recolhida -> 32.100 mm estendida (catálogo).
export const MD300L_BOOM_RETRACTED_M = 10.5;
export const MD300L_BOOM_MAX_M = 32.1;
/** Seções que deslizam para fora da seção-base (4 seções no total). */
export const MD300L_EXTENDING_SECTIONS = 3;
/** TODO: comprimento real da lança do TM 130 (valor provisório, sem seções). */
export const TM130_BOOM_LENGTH_M = 17.7;

export const CABLE_MIN_M = 0.5;
export const CABLE_MAX_M = 34;
