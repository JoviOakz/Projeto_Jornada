import type { AngleRange, SlewRange } from '../types';

// ---- Luna TM 130 (LN 130 TM BR) ----
// Elevação de 0° a 70°; giro da coluna restrito ao setor traseiro de 120°.
// Convenção de azimute: 0° = sobre a cabine (frente), 180° = diretamente atrás.
export const TM130_ANGLE_RANGE: AngleRange = { min: 0, max: 70 };
export const TM130_SLEW_RANGE: SlewRange = { min: 120, max: 240, continuous: false };
export const TM130_SLEW_CENTER_DEG = 180;

// ---- Madal Palfinger MD 300L (30 t) ----
// Lança principal: elevação até 83° (85° só com JIB). Giro contínuo de 360°.
export const MD300L_MIN_ANGLE_DEG = 0;
export const MD300L_MAX_ANGLE_DEG = 83;
export const MD300L_SLEW_RANGE: SlewRange = { min: 0, max: 360, continuous: true };

/** Setor frontal (sobre a cabine) ≈ 90° => ±45° em torno de 0°. Capacidade reduzida. */
export const MD300L_FRONTAL_HALF_ARC_DEG = 45;
