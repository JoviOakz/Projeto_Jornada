import { CHARTS_MD300L, CHART_TM130 } from '../data/charts';
import type { OperatingSector } from '../types';

/**
 * Edição das tabelas de carga pelo administrador (somente front-end).
 * As alterações valem só neste navegador (localStorage) e são aplicadas direto nas tabelas
 * embutidas, então todo o cálculo do app passa a usá-las. As tabelas originais ficam guardadas
 * para "Restaurar".
 */
type MdSector = Extract<OperatingSector, 'FRONTAL' | 'LATERAL_TRASEIRA'>;

const STORAGE_KEY = 'gr.tableOverrides';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const ORIGINAL = {
  FRONTAL: clone(CHARTS_MD300L.FRONTAL.matrix),
  LATERAL_TRASEIRA: clone(CHARTS_MD300L.LATERAL_TRASEIRA.matrix),
  TM130: clone(CHART_TM130.capacities)
};

export const mdKey = (sector: MdSector, len: number, radius: number) => `MD:${sector}:${len}:${radius}`;
export const tmKey = (angle: number) => `TM:${angle}`;

let overrides: Record<string, number> = {};

function readOriginal(key: string): number | undefined {
  const p = key.split(':');
  if (p[0] === 'MD') return (ORIGINAL[p[1] as MdSector][p[2] as unknown as number] ?? {})[p[3] as unknown as number] ?? undefined;
  return ORIGINAL.TM130[p[1] as unknown as number];
}

function write(key: string, value: number) {
  const p = key.split(':');
  if (p[0] === 'MD') {
    const chart = p[1] === 'FRONTAL' ? CHARTS_MD300L.FRONTAL : CHARTS_MD300L.LATERAL_TRASEIRA;
    const row = chart.matrix[Number(p[2])];
    if (row) row[Number(p[3])] = value;
  } else {
    CHART_TM130.capacities[Number(p[1])] = value;
  }
}

function persist() {
  try {
    if (typeof window === 'undefined') return;
    if (Object.keys(overrides).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* sem armazenamento: a edição vale só até recarregar */ }
}

/** Define a capacidade (kg) de uma célula. Retorna false se o valor for inválido. */
export function setCapacity(key: string, value: number): boolean {
  if (!Number.isFinite(value) || value <= 0 || value > 100000) return false;
  const rounded = Math.round(value);
  const original = readOriginal(key);
  if (original === undefined) return false;
  write(key, rounded);
  if (rounded === original) delete overrides[key];
  else overrides[key] = rounded;
  persist();
  return true;
}

export const isOverridden = (key: string) => key in overrides;
export const overrideCount = () => Object.keys(overrides).length;

export function resetTables() {
  Object.keys(overrides).forEach((key) => {
    const original = readOriginal(key);
    if (original !== undefined) write(key, original);
  });
  overrides = {};
  persist();
}

// Aplica as alterações salvas ao abrir o app.
try {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    Object.entries(saved).forEach(([key, v]) => {
      if (typeof v === 'number' && setCapacity(key, v)) return;
    });
  }
} catch { /* ignora armazenamento corrompido */ }
