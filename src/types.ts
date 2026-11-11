export type CraneModel = 'MD300L' | 'TM130';
export type ViewMode = '3D' | '2D_SIDE' | '2D_TOP';
export type View2D = Exclude<ViewMode, '3D'>;

export interface ChartMD300L {
  radii: number[];
  lengths: number[];
  matrix: Record<number, Record<number, number | null>>;
}

export interface ChartTM130 {
  angles: number[];
  capacities: Record<number, number>;
}

/** Parâmetros controlados pelo operador. */
export interface LiftInputs {
  model: CraneModel;
  boomLength: number; // m
  payloadKg: number;  // kg
  angle: number;      // ° de elevação
  rotation: number;   // ° de azimute
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
  /** Aprovado = utilização abaixo do limite normativo (RN01). */
  isApproved: boolean;

  // Zonas no solo
  safeRadiusGround: number;
  warningRadiusGround: number;
  showOrangeZone: boolean;

  // Riscos físicos
  isCargoOverSapata: boolean;
  cableClipsIntoHaste: boolean;

  // Cores
  statusColorHex: number;
  statusColorCSS: string;
}
