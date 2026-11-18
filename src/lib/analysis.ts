import { tableLengthFor } from '../data/charts';
import type { LiftAnalysis, LiftInputs } from '../types';
import { HOOK_WEIGHT_KG, NORMATIVE_LIMIT_PCT, computeZones, getMaxCapacityKg } from './capacity';
import { computeGeometry, isLoadAirborne, loadCenterHeight } from './geometry';
import { getAngleRange, getOperatingSector, getSlewRange } from './limits';
import { isCargoOverSapata } from './sapatas';

/** Análise completa de um içamento (função pura, sem React: usada pela tela e pelo verificador). */
export function analyzeLift(inputs: LiftInputs): LiftAnalysis {
  const { model, boomLength, payloadKg, angle, rotation, cableLength } = inputs;

  const angleRange = getAngleRange(model, boomLength);
  const slewRange = getSlewRange(model);
  const sector = getOperatingSector(model, rotation);
  const geo = computeGeometry(boomLength, angle, rotation, angleRange);
  const { radius, hookHeight, radRot, minPossibleRadius, maxPossibleRadius } = geo;

  const tableLength = model === 'MD300L' ? tableLengthFor(boomLength) : null;
  const loadHeight = loadCenterHeight(hookHeight, cableLength);
  const airborne = isLoadAirborne(boomLength, angle, cableLength);

  const hookWeight = HOOK_WEIGHT_KG[model];
  const totalLoadKg = payloadKg + hookWeight;
  const maxCapacityKg = getMaxCapacityKg(model, sector, boomLength, radius, angle);

  const isOutOfChart = maxCapacityKg === null;
  // Sem arredondar: 100,4% precisa contar como sobrecarga.
  const usagePct = maxCapacityKg ? (totalLoadKg / maxCapacityKg) * 100 : 100;

  const isOverload = isOutOfChart || usagePct > 100;
  const isDanger = !isOverload && usagePct >= NORMATIVE_LIMIT_PCT;
  const isWarning = isDanger;

  const isOverSapata = isCargoOverSapata(model, radius, radRot);
  // RN01: reprovado a partir de 85%; carga sobre sapata também reprova.
  const isApproved = !isOverload && !isWarning && !isOverSapata;

  const zones = computeZones({ model, boomLength, totalLoadKg, minR: minPossibleRadius, maxR: maxPossibleRadius });
  const activeZone = zones.find((z) => z.sector === sector) ?? zones[0];

  // TODO: regra quase inalcançável com a geometria atual.
  const cableClipsIntoHaste = angle > 60 && radius < 1.5;

  let statusColorHex = 0x10b981;
  let statusColorCSS = '#10b981';
  if (isOutOfChart) { statusColorHex = 0x64748b; statusColorCSS = '#64748b'; }
  else if (isOverload) { statusColorHex = 0xef4444; statusColorCSS = '#ef4444'; }
  else if (isDanger || isOverSapata) { statusColorHex = 0xf97316; statusColorCSS = '#f97316'; }

  return {
    ...geo,
    angleRange, slewRange, sector,
    tableLength, loadHeight, isLoadAirborne: airborne,
    hookWeight, totalLoadKg, maxCapacityKg, usagePct,
    isOutOfChart, isOverload, isDanger, isWarning, isApproved,
    zones, activeZone, safeRadiusGround: activeZone.safeR,
    isCargoOverSapata: isOverSapata,
    cableClipsIntoHaste,
    statusColorHex, statusColorCSS
  };
}
