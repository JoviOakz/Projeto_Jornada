import { useMemo } from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import { analyzeLift } from '../lib/analysis';

/** `tablesVersion` muda quando o administrador edita as tabelas, para refazer o cálculo. */
export function useLiftAnalysis(inputs: LiftInputs, tablesVersion = 0): LiftAnalysis {
  return useMemo(() => analyzeLift(inputs), [inputs, tablesVersion]); // eslint-disable-line react-hooks/exhaustive-deps
}
