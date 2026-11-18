import React, { useEffect, useState } from 'react';
import { readRecordedPayload, verifyPackage, type VerificationResult } from '../lib/integrity';
import { SECTOR_LABELS } from '../lib/limits';
import type { OperatingSector } from '../types';
import { VerificationResultView } from './VerificationResultView';

interface VerifyModalProps {
  packageText: string;
  onClose: () => void;
}

/** Aberto ao escanear o QR code (ou abrir o link) de um relatório. */
export const VerifyModal: React.FC<VerifyModalProps> = ({ packageText, onClose }) => {
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let alive = true;
    verifyPackage(packageText).then((r) => { if (alive) setResult(r); });
    return () => { alive = false; };
  }, [packageText]);

  const rec = readRecordedPayload(packageText);

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Verificação de Relatório</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {result ? <VerificationResultView result={result} /> : <p>Verificando...</p>}
          {rec && (
            <>
              <p className="telemetry-label">Dados gravados no relatório{result?.ok ? '' : ' (não confiáveis: a verificação falhou)'}:</p>
              <div className="report-grid">
                <div><strong>Emitido em:</strong> {new Date(rec.emitidoEm).toLocaleString('pt-BR')}</div>
                <div><strong>Equipamento:</strong> {rec.entradas.model === 'MD300L' ? 'Madal Palfinger MD 300L' : 'Luna TM 130'}</div>
                <div><strong>Lança:</strong> {rec.entradas.boomLength.toFixed(1)} m</div>
                <div><strong>Ângulo / Giro:</strong> {rec.entradas.angle}° / {rec.entradas.rotation}°</div>
                <div><strong>Carga:</strong> {rec.entradas.payloadKg.toLocaleString()} kg</div>
                <div><strong>Raio:</strong> {rec.resultado.raio} m</div>
                <div><strong>Utilização:</strong> {rec.resultado.utilizacaoPct}%</div>
                <div><strong>Setor:</strong> {SECTOR_LABELS[rec.resultado.setor as OperatingSector] ?? rec.resultado.setor}</div>
              </div>
              <div className={`status-box ${rec.resultado.aprovado ? 'status-green' : 'status-red'}`}>
                RESULTADO GRAVADO: {rec.resultado.aprovado ? 'APROVADO' : 'REPROVADO'}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};
