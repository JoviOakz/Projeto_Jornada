import React from 'react';
import type { LiftAnalysis } from '../types';
import { NORMATIVE_LIMIT_PCT } from '../lib/capacity';

interface TelemetryPanelProps {
  analysis: LiftAnalysis;
  extendedUnderLoad: boolean;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ analysis, extendedUnderLoad }) => {
  const {
    radius, hookHeight, loadHeight, isLoadAirborne, safeRadiusGround, tableLength,
    isOverload, isDanger, isCargoOverSapata, cableClipsIntoHaste, sector
  } = analysis;

  const hasWarnings =
    extendedUnderLoad || isCargoOverSapata || cableClipsIntoHaste || sector === 'FRONTAL' || (isDanger && !isOverload);

  return (
    <section className="telemetry-card">
      <h3>Telemetria</h3>
      <div className="telemetry-grid cols-4">
        <div className="telemetry-item">
          <span className="telemetry-label">Raio (R)</span>
          <span className="telemetry-value">{radius} m</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Ponta da lança</span>
          <span className="telemetry-value">{hookHeight} m</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Altura da carga</span>
          <span className="telemetry-value">{isLoadAirborne ? `${loadHeight.toFixed(1)} m` : 'No solo'}</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Raio seguro (setor)</span>
          <span className="telemetry-value text-green">{safeRadiusGround.toFixed(1)} m</span>
        </div>
        {tableLength !== null && (
          <div className="telemetry-item">
            <span className="telemetry-label">Tabela usada</span>
            <span className="telemetry-value">{tableLength.toFixed(1)} m</span>
          </div>
        )}
      </div>

      {hasWarnings && (
        <div className="warnings-box">
          {extendedUnderLoad && (
            <div className="warning-item warning-critical">
              <span className="warning-icon">⚠️</span>
              <div className="warning-content">
                <strong>RISCO: Lança estendida com carga</strong>
                <p>A extensão da lança deve ser feita somente sem carga. Apoie a carga no solo, ajuste a extensão e depois levante pelo cilindro de elevação ou pelo guincho.</p>
              </div>
            </div>
          )}
          {isCargoOverSapata && (
            <div className="warning-item warning-critical">
              <span className="warning-icon">⚠️</span>
              <div className="warning-content">
                <strong>RISCO: Carga sobre Sapata</strong>
                <p>A carga está sobre a sapata (base de apoio no chão). Não é permitido passar nem descer a carga sobre as sapatas. Mude o giro ou o raio.</p>
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
          {sector === 'FRONTAL' && (
            <div className="warning-item warning-danger">
              <span className="warning-icon">⚠️</span>
              <div className="warning-content">
                <strong>Setor Frontal (sobre a cabine)</strong>
                <p>Usando a tabela oficial da área frontal (capacidade reduzida em relação à lateral/traseira).</p>
              </div>
            </div>
          )}
          {isDanger && !isOverload && (
            <div className="warning-item warning-danger">
              <span className="warning-icon">⚠️</span>
              <div className="warning-content">
                <strong>ZONA CRÍTICA ({NORMATIVE_LIMIT_PCT}-100%)</strong>
                <p>Operação na zona laranja: acima do limite normativo (RN01), portanto reprovada. Aumente o raio ou reduza a carga.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
