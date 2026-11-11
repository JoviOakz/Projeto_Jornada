import { useMemo } from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import { computeGeometry } from '../lib/geometry';
import {
  HOOK_WEIGHT_KG,
  NORMATIVE_LIMIT_PCT,
  computeSafeRadiusGround,
  computeWarningRadiusGround,
  getMaxCapacityKg
} from '../lib/capacity';

// Validação: carga acima das sapatas do guindaste
// TODO: regra atualmente inalcançável (hookHeight nunca fica < 2 m).
const SAPATA_HALF_WIDTH_M = 4;

export function useLiftAnalysis(inputs: LiftInputs): LiftAnalysis {
  const { model, boomLength, payloadKg, angle, rotation } = inputs;

  const geo = useMemo(
    () => computeGeometry(boomLength, angle, rotation),
    [boomLength, angle, rotation]
  );
  const { radius, hookHeight, minPossibleRadius, maxPossibleRadius } = geo;

  const hookWeight = HOOK_WEIGHT_KG[model];
  const totalLoadKg = payloadKg + hookWeight;

  const maxCapacityKg = useMemo(
    () => getMaxCapacityKg(model, boomLength, radius, angle),
    [model, boomLength, radius, angle]
  );

  const isOutOfChart = maxCapacityKg === null;
  const usagePct = maxCapacityKg ? Math.round((totalLoadKg / maxCapacityKg) * 100) : 100;

  const isOverload = isOutOfChart || usagePct > 100;
  const isDanger =
    !isOverload && usagePct >= NORMATIVE_LIMIT_PCT && usagePct <= 100;
  const isWarning = !isOverload && usagePct >= NORMATIVE_LIMIT_PCT;
  const isApproved = !isOverload && !isWarning;

  const safeRadiusGround = useMemo(
    () => computeSafeRadiusGround({
      model, boomLength, totalLoadKg, minR: minPossibleRadius, maxR: maxPossibleRadius
    }),
    [model, boomLength, totalLoadKg, minPossibleRadius, maxPossibleRadius]
  );

  const warningRadiusGround = useMemo(
    () => computeWarningRadiusGround({
      model, boomLength, totalLoadKg, minR: minPossibleRadius, maxR: maxPossibleRadius
    }),
    [model, boomLength, totalLoadKg, minPossibleRadius, maxPossibleRadius]
  );

  const showOrangeZone = safeRadiusGround < warningRadiusGround;

  const isCargoOverSapata = radius < SAPATA_HALF_WIDTH_M && hookHeight < 2;
  // TODO: regra quase inalcançável com a geometria atual.
  const cableClipsIntoHaste = angle > 60 && radius < 1.5;

  const { statusColorHex, statusColorCSS } = useMemo(() => {
    if (isOutOfChart) return { statusColorHex: 0x64748b, statusColorCSS: '#64748b' }; // Cinza
    if (isOverload) return { statusColorHex: 0xef4444, statusColorCSS: '#ef4444' };   // Vermelho
    if (isDanger) return { statusColorHex: 0xf97316, statusColorCSS: '#f97316' };     // Laranja
    if (isWarning) return { statusColorHex: 0xf59e0b, statusColorCSS: '#f59e0b' };    // Âmbar
    return { statusColorHex: 0x10b981, statusColorCSS: '#10b981' };                   // Verde
  }, [isOutOfChart, isOverload, isDanger, isWarning]);

  return {
    ...geo,
    hookWeight,
    totalLoadKg,
    maxCapacityKg,
    usagePct,
    isOutOfChart,
    isOverload,
    isDanger,
    isWarning,
    isApproved,
    safeRadiusGround,
    warningRadiusGround,
    showOrangeZone,
    isCargoOverSapata,
    cableClipsIntoHaste,
    statusColorHex,
    statusColorCSS
  };
}
