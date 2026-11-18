import React from 'react';
import type { LiftAnalysis } from '../types';
import { NORMATIVE_LIMIT_PCT } from '../lib/capacity';
import { SECTOR_LABELS } from '../lib/limits';

interface StatusBarProps {
  analysis: LiftAnalysis;
  extendedUnderLoad: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ analysis, extendedUnderLoad }) => {
  const {
    usagePct, maxCapacityKg, totalLoadKg, radius, sector,
    isOutOfChart, isOverload, isDanger, isWarning, isApproved, isCargoOverSapata
  } = analysis;

  const approved = isApproved && !extendedUnderLoad;
  const colorSuffix = isOverload ? 'red' : isDanger ? 'orange' : isWarning ? 'amber' : 'green';

  const reasons: string[] = [];
  if (isOutOfChart) reasons.push('Fora da tabela de carga para este raio e lança');
  else if (isOverload) reasons.push(`Sobrecarga: ${usagePct.toFixed(1)}% da capacidade`);
  else if (isWarning) reasons.push(`Utilização de ${usagePct.toFixed(1)}%, acima do limite de ${NORMATIVE_LIMIT_PCT}% (RN01)`);
  if (isCargoOverSapata) reasons.push('Carga sobre a sapata');
  if (extendedUnderLoad) reasons.push('Lança estendida com carga suspensa');

  return (
    <section className={`status-bar ${approved ? 'status-bar-ok' : 'status-bar-fail'}`}>
      <div className="status-verdict">
        <span className="status-icon">{approved ? '✅' : '⛔'}</span>
        <div>
          <strong>{approved ? 'OPERAÇÃO APROVADA' : 'OPERAÇÃO REPROVADA'}</strong>
          <p>{approved ? `Utilização abaixo de ${NORMATIVE_LIMIT_PCT}% e carga fora das sapatas.` : reasons.join(' · ')}</p>
        </div>
      </div>

      <div className="status-metrics">
        <div className="status-metric">
          <span className="telemetry-label">Capacidade máx.</span>
          <span className="telemetry-value">{maxCapacityKg ? `${maxCapacityKg.toLocaleString()} kg` : 'N/A'}</span>
        </div>
        <div className="status-metric">
          <span className="telemetry-label">Carga total</span>
          <span className="telemetry-value">{totalLoadKg.toLocaleString()} kg</span>
        </div>
        <div className="status-metric">
          <span className="telemetry-label">Raio</span>
          <span className="telemetry-value">{radius} m</span>
        </div>
        <div className="status-metric">
          <span className="telemetry-label">Setor</span>
          <span className="telemetry-value status-sector">{SECTOR_LABELS[sector]}</span>
        </div>
      </div>

      <div className="progress-box status-progress">
        <div className="progress-labels">
          <span>Taxa de Utilização</span>
          <span className={`text-${colorSuffix}`}>{isOutOfChart ? 'Fora de Tabela' : `${usagePct.toFixed(1)}%`}</span>
        </div>
        <div className="progress-track">
          <div className={`progress-fill bg-${colorSuffix}`} style={{ width: `${Math.min(100, usagePct)}%` }} />
          <div className="normative-line" style={{ left: `${NORMATIVE_LIMIT_PCT}%` }} title={`Limite Normativo ${NORMATIVE_LIMIT_PCT}% (RN01)`} />
        </div>
        <div className="progress-footer">
          <span>0%</span>
          <span className="marker-85">{NORMATIVE_LIMIT_PCT}% Norma</span>
          <span>100% Máx</span>
        </div>
      </div>
    </section>
  );
};
