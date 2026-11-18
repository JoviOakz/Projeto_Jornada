import {
  MD300L_BOOM_RETRACTED_M,
  MD300L_EXTENDING_SECTIONS
} from '../data/craneSpecs';
import type { CraneModel } from '../types';

export interface BoomSegment {
  /** Início do trecho exposto, medido do pivô ao longo da lança (m). */
  start: number;
  length: number;
  /** Seção a que pertence (0 = base). */
  index: number;
}

/**
 * Trechos visíveis da lança telescópica.
 * A seção-base tem sempre 10,5 m; as demais saem em partes iguais (sequência simplificada).
 * Modelos sem dados de seções (TM130) usam um único trecho.
 */
export function computeBoomSegments(model: CraneModel, boomLength: number): BoomSegment[] {
  if (model !== 'MD300L') return [{ start: 0, length: boomLength, index: 0 }];
  const base = MD300L_BOOM_RETRACTED_M;
  const ext = Math.max(0, boomLength - base) / MD300L_EXTENDING_SECTIONS;
  const segs: BoomSegment[] = [{ start: 0, length: base, index: 0 }];
  for (let i = 1; i <= MD300L_EXTENDING_SECTIONS; i++) {
    if (ext > 0.01) segs.push({ start: base + ext * (i - 1), length: ext, index: i });
  }
  return segs;
}
