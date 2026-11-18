export type CraneModel = 'MD300L' | 'TM130';
export type ViewMode = '3D' | '2D_SIDE' | '2D_TOP';
export type View2D = Exclude<ViewMode, '3D'>;
export type OperatingSector = 'FRONTAL' | 'LATERAL_TRASEIRA' | 'TRASEIRO_RESTRITO';

export interface ChartMD300L {
  radii: number[];
  lengths: number[];
  matrix: Record<number, Record<number, number | null>>;
}

export interface ChartTM130 {
  angles: number[];
  capacities: Record<number, number>;
}

export interface AngleRange {
  min: number;
  max: number;
}

export interface SlewRange {
  min: number;
  max: number;
  /** true = giro contínuo de 360° (sem batentes). */
  continuous: boolean;
}

/** Setor de giro (azimute em graus; 0° = sobre a cabine, horário). Pode ter início negativo. */
export interface SectorDef {
  id: OperatingSector;
  startDeg: number;
  endDeg: number;
}

/** Posição de uma sapata no solo, relativa ao eixo de giro (x = lateral, z = frente). */
export interface PadPosition {
  x: number;
  z: number;
}

export interface VehicleLayout {
  bodyHalfWidth: number;
  frontZ: number;
  rearZ: number;
  cabStartZ: number;
  axlesZ: number[];
  pads: PadPosition[];
  /** true = medidas provisórias (não vieram de desenho do fabricante). */
  estimated: boolean;
}

/** Zonas no solo de um setor: verde [minR, safeR], laranja [safeR, warnR], vermelha [warnR, maxR]. */
export interface ZoneSet {
  sector: OperatingSector;
  startDeg: number;
  endDeg: number;
  minR: number;
  safeR: number;
  warnR: number;
  maxR: number;
  showOrange: boolean;
}

/** Parâmetros controlados pelo operador. */
export interface LiftInputs {
  model: CraneModel;
  boomLength: number; // m
  payloadKg: number;  // kg
  angle: number;      // ° de elevação
  rotation: number;   // ° de azimute
  cableLength: number; // m de cabo desenrolado (da ponta da lança até o centro da carga)
}

/** Tudo que é derivado dos inputs (telemetria, capacidade, status, zonas). */
export interface LiftAnalysis {
  // Geometria
  radAngle: number;
  radRot: number;
  radius: number;
  hookHeight: number;
  coordX: number;
  coordY: number;
  coordZ: number;
  minPossibleRadius: number;
  maxPossibleRadius: number;

  // Limites operacionais do modelo
  angleRange: AngleRange;
  slewRange: SlewRange;
  sector: OperatingSector;

  /** Comprimento da tabela de carga usada (próximo comprimento tabelado, MD300L). */
  tableLength: number | null;

  // Posição da carga
  loadHeight: number;
  isLoadAirborne: boolean;

  // Carga e capacidade
  hookWeight: number;
  totalLoadKg: number;
  maxCapacityKg: number | null;
  usagePct: number;

  // Status
  isOutOfChart: boolean;
  isOverload: boolean;
  isDanger: boolean;
  isWarning: boolean;
  /** Aprovado = utilização abaixo do limite normativo (RN01) E carga fora das sapatas. */
  isApproved: boolean;

  // Zonas no solo (uma por setor) e a do setor atual
  zones: ZoneSet[];
  activeZone: ZoneSet;
  safeRadiusGround: number;

  // Riscos físicos
  isCargoOverSapata: boolean;
  cableClipsIntoHaste: boolean;

  // Cores
  statusColorHex: number;
  statusColorCSS: string;
}
