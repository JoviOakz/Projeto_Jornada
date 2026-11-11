import React from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import { NORMATIVE_LIMIT_PCT } from '../lib/capacity';

interface ReportModalProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ inputs, analysis, onClose }) => {
  const { model, boomLength, angle, rotation } = inputs;
  const {
    radius,
    hookHeight,
    coordX,
    coordY,
    coordZ,
    safeRadiusGround,
    totalLoadKg,
    maxCapacityKg,
    usagePct,
    isOverload,
    isApproved
  } = analysis;

  // RN01: acima de 85% a operação é reprovada.
  const statusLabel = isOverload
    ? 'REPROVADO / SOBRECARGA'
    : isApproved
    ? 'APROVADO COM SEGURANÇA'
    : `REPROVADO / ACIMA DE ${NORMATIVE_LIMIT_PCT}% (RN01)`;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Relatório Técnico de Viabilidade de Içamento</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p><strong>Empresa Parceira:</strong> Guindastes Ribas Ltda.</p>
          <p><strong>Equipamento Selecionado:</strong> {model === 'MD300L' ? 'Madal Palfinger MD 300L' : 'Luna TM 130'}</p>
          <hr />
          <div className="report-grid">
            <div><strong>Comprimento da Lança:</strong> {boomLength} m</div>
            <div><strong>Ângulo de Elevação:</strong> {angle}°</div>
            <div><strong>Giro de Azimute:</strong> {rotation}°</div>
            <div><strong>Raio de Operação:</strong> {radius} m</div>
            <div><strong>Raio Máximo Seguro no Solo:</strong> {safeRadiusGround.toFixed(1)} m</div>
            <div><strong>Altura do Gancho:</strong> {hookHeight} m</div>
            <div><strong>Coordenadas 3D:</strong> X={coordX}m, Y={coordY}m, Z={coordZ}m</div>
            <div><strong>Carga Suspensa Total:</strong> {totalLoadKg.toLocaleString()} kg</div>
            <div><strong>Capacidade Máxima Permitida:</strong> {maxCapacityKg ? `${maxCapacityKg.toLocaleString()} kg` : 'N/A'}</div>
            <div><strong>Taxa de Utilização:</strong> {usagePct}%</div>
          </div>
          <hr />
          <div className={`status-box ${isApproved ? 'status-green' : 'status-red'}`}>
            STATUS FINAL DE OPERAÇÃO: {statusLabel}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => window.print()}>🖨️ Imprimir PDF</button>
          <button className="btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};
