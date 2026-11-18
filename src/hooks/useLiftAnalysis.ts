import { useMemo } from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import { analyzeLift } from '../lib/analysis';

export function useLiftAnalysis(inputs: LiftInputs): LiftAnalysis {
  return useMemo(() => analyzeLift(inputs), [inputs]);
}
