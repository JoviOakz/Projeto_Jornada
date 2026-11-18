import { useMemo } from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import { computeGeometry, isLoadAirborne, loadCenterHeight } from '../lib/geometry';
import { tableLengthFor } from '../data/charts';
import { getAngleRange, getOperatingSector, getSlewRange } from '../lib/limits';
import { isCargoOverSapata } from '../lib/sapatas';
import { HOOK_WEIGHT_KG, NORMATIVE_LIMIT_PCT, computeZones, getMaxCapacityKg } from '../lib/capacity';

export function useLiftAnalysis(inputs: LiftInputs): LiftAnalysis {
  const { model, boomLength, payloadKg, angle, rotation, cableLength } = inputs;

  const angleRange = useMemo(() => getAngleRange(model, boomLength), [model, boomLength]);
  const slewRange = getSlewRange(model);
  const sector = getOperatingSector(model, rotation);

  const geo = useMemo(
    () => computeGeometry(boomLength, angle, rotation, angleRange),
    [boomLength, angle, rotation, angleRange]
  );
  const { radius, hookHeight, radRot, minPossibleRadius, maxPossibleRadius } = geo;

  const tableLength = model === 'MD300L' ? tableLengthFor(boomLength) : null;
  const loadHeight = loadCenterHeight(hookHeight, cableLength);
  const airborne = isLoadAirborne(boomLength, angle, cableLength);

  const hookWeight = HOOK_WEIGHT_KG[model];
  const totalLoadKg = payloadKg + hookWeight;

  const maxCapacityKg = useMemo(
    () => getMaxCapacityKg(model, sector, boomLength, radius, angle),
    [model, sector, boomLength, radius, angle]
  );

  const isOutOfChart = maxCapacityKg === null;
  // Sem arredondar: 100,4% precisa contar como sobrecarga.
  const usagePct = maxCapacityKg ? (totalLoadKg / maxCapacityKg) * 100 : 100;

  const isOverload = isOutOfChart || usagePct > 100;
  const isDanger = !isOverload && usagePct >= NORMATIVE_LIMIT_PCT;
  const isWarning = isDanger;

  const isOverSapata = isCargoOverSapata(model, radius, radRot);
  // RN01: reprovado a partir de 85%; carga sobre sapata também reprova.
  const isApproved = !isOverload && !isWarning && !isOverSapata;

  const zones = useMemo(
    () => computeZones({ model, boomLength, totalLoadKg, minR: minPossibleRadius, maxR: maxPossibleRadius }),
    [model, boomLength, totalLoadKg, minPossibleRadius, maxPossibleRadius]
  );
  const activeZone = zones.find((z) => z.sector === sector) ?? zones[0];

  // TODO: regra quase inalcançável com a geometria atual.
  const cableClipsIntoHaste = angle > 60 && radius < 1.5;

  const { statusColorHex, statusColorCSS } = useMemo(() => {
    if (isOutOfChart) return { statusColorHex: 0x64748b, statusColorCSS: '#64748b' };
    if (isOverload) return { statusColorHex: 0xef4444, statusColorCSS: '#ef4444' };
    if (isDanger || isOverSapata) return { statusColorHex: 0xf97316, statusColorCSS: '#f97316' };
    return { statusColorHex: 0x10b981, statusColorCSS: '#10b981' };
  }, [isOutOfChart, isOverload, isDanger, isOverSapata]);

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
