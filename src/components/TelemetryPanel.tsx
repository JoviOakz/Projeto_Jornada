import React from 'react';
import type { LiftAnalysis } from '../types';
import { NORMATIVE_LIMIT_PCT } from '../lib/capacity';

interface TelemetryPanelProps {
  analysis: LiftAnalysis;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ analysis }) => {
  const {
    radius,
    hookHeight,
    safeRadiusGround,
    maxCapacityKg,
    totalLoadKg,
    usagePct,
    isOutOfChart,
    isOverload,
    isDanger,
    isWarning,
    isCargoOverSapata,
    cableClipsIntoHaste
  } = analysis;

  const colorSuffix = isOverload ? 'red' : isDanger ? 'orange' : isWarning ? 'amber' : 'green';

  return (
    <div className="telemetry-card">
      <h3>Telemetria & Envelope Operacional</h3>
      <div className="telemetry-grid">
        <div className="telemetry-item">
          <span className="telemetry-label">Raio (R)</span>
          <span className="telemetry-value">{radius} m</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Altura (H)</span>
          <span className="telemetry-value">{hookHeight} m</span>
        </div>
        <div className="telemetry-item full-width">
          <span className="telemetry-label">Raio Máximo Seguro no Solo</span>
          <span className="telemetry-value text-green">{safeRadiusGround.toFixed(1)} m</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Capacidade Máxima</span>
          <span className="telemetry-value">
            {maxCapacityKg ? `${maxCapacityKg.toLocaleString()} kg` : 'N/A'}
          </span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Carga Total Suspensa</span>
          <span className="telemetry-value">{totalLoadKg.toLocaleString()} kg</span>
        </div>
      </div>

      {/* Barra de Progresso com Limite Normativo */}
      <div className="progress-box">
        <div className="progress-labels">
          <span>Taxa de Utilização:</span>
          <span className={`text-${colorSuffix}`}>
            {isOutOfChart ? 'Fora de Tabela' : `${usagePct}%`}
          </span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill bg-${colorSuffix}`}
            style={{ width: `${Math.min(100, usagePct)}%` }}
          />
          <div
            className="normative-line"
            style={{ left: `${NORMATIVE_LIMIT_PCT}%` }}
            title={`Limite Normativo ${NORMATIVE_LIMIT_PCT}% (RN01)`}
          />
        </div>
        <div className="progress-footer">
          <span>0%</span>
          <span className="marker-85">{NORMATIVE_LIMIT_PCT}% Norma</span>
          <span>100% Máx</span>
        </div>
      </div>

      {/* Avisos de Perigos Físicos */}
      <div className="warnings-box">
        {isCargoOverSapata && (
          <div className="warning-item warning-critical">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <strong>RISCO: Carga sobre Sapata</strong>
              <p>A carga está posicionada acima da perninha do guindaste. Descida não é permitida por risco de colisão.</p>
            </div>
          </div>
        )}
        {cableClipsIntoHaste && (
          <div className="warning-item warning-critical">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <strong>RISCO: Penetração da Haste</strong>
              <p>Com o ângulo muito elevado, o cabo/carga atravessa a haste. Reduzir ângulo de elevação ou aumentar raio.</p>
            </div>
          </div>
        )}
        {isDanger && !isOverload && (
          <div className="warning-item warning-danger">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <strong>ZONA CRÍTICA ({NORMATIVE_LIMIT_PCT}-100%)</strong>
              <p>Operação está na zona laranja. Margem normativa de segurança (RN01) quase atingida. Procedência recomendada: aumentar raio ou reduzir carga.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
