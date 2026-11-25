import React from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import { NORMATIVE_LIMIT_PCT } from '../lib/capacity';
import { SECTOR_LABELS } from '../lib/limits';
import { IntegritySeal } from './IntegritySeal';

interface ReportPanelProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
  extendedUnderLoad: boolean;
}

export const ReportPanel: React.FC<ReportPanelProps> = ({ inputs, analysis, extendedUnderLoad }) => {
  const { model, boomLength, angle, rotation, cableLength } = inputs;
  const {
    radius, hookHeight, coordX, coordY, coordZ, safeRadiusGround, totalLoadKg, maxCapacityKg, usagePct,
    isOverload, isApproved, isCargoOverSapata, sector, tableLength, loadHeight, isLoadAirborne
  } = analysis;
  const approved = isApproved && !extendedUnderLoad;

  // RN01: acima de 85% a operação é reprovada.
  const statusLabel = isOverload
    ? 'REPROVADO / SOBRECARGA'
    : isCargoOverSapata
    ? 'REPROVADO / CARGA SOBRE SAPATA'
    : extendedUnderLoad
    ? 'REPROVADO / LANÇA ESTENDIDA COM CARGA'
    : approved
    ? 'APROVADO COM SEGURANÇA'
    : `REPROVADO / ACIMA DE ${NORMATIVE_LIMIT_PCT}% (RN01)`;

  const items: [string, string][] = [
    ['Comprimento da lança', `${boomLength.toFixed(1)} m`],
    ...(tableLength !== null ? [['Tabela de carga usada', `${tableLength.toFixed(1)} m`] as [string, string]] : []),
    ['Ângulo de elevação', `${angle}°`],
    ['Giro de azimute', `${rotation}°`],
    ['Setor de operação', SECTOR_LABELS[sector]],
    ['Raio de operação', `${radius} m`],
    ['Raio máximo seguro no solo', `${safeRadiusGround.toFixed(1)} m`],
    ['Altura da ponta da lança', `${hookHeight} m`],
    ['Cabo / altura da carga', `${cableLength.toFixed(1)} m / ${isLoadAirborne ? `${loadHeight.toFixed(1)} m` : 'no solo'}`],
    ['Coordenadas 3D', `X=${coordX} m, Y=${coordY} m, Z=${coordZ} m`],
    ['Carga suspensa total', `${totalLoadKg.toLocaleString()} kg`],
    ['Capacidade máxima permitida', maxCapacityKg ? `${maxCapacityKg.toLocaleString()} kg` : 'N/A'],
    ['Taxa de utilização', `${usagePct.toFixed(1)}%`]
  ];

  return (
    <div className="report-tab">
      <div className="report-layout">
        <section className="card report-card">
          <div className="report-title">
            <h2 className="card-title">Relatório técnico de viabilidade de içamento</h2>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Imprimir PDF</button>
          </div>
          <p><strong>Empresa parceira:</strong> Guindastes Ribas Ltda.</p>
          <p><strong>Equipamento:</strong> {model === 'MD300L' ? 'Madal Palfinger MD 300L' : 'Luna TM 130'}</p>
          <dl className="report-list">
            {items.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <div className={`status-box ${approved ? 'status-green' : 'status-red'}`}>
            STATUS FINAL DE OPERAÇÃO: {statusLabel}
          </div>
          <p className="muted small no-print">
            O relatório reflete os valores do simulador no momento em que esta aba foi aberta. Para mudar os valores,
            volte à aba Planejamento.
          </p>
        </section>

        <IntegritySeal inputs={inputs} analysis={analysis} extendedUnderLoad={extendedUnderLoad} />
      </div>
    </div>
  );
};
