import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { LiftAnalysis, LiftInputs } from '../types';
import {
  buildReportPayload,
  buildSealedPackage,
  getTablesHash,
  makeVerificationLink,
  verifyPackage,
  type VerificationResult
} from '../lib/integrity';
import { VerificationResultView } from './VerificationResultView';

interface IntegritySealProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
  extendedUnderLoad: boolean;
}

interface Sealed {
  text: string;
  seal: string;
  link: string;
  qr: string;
}

/** Código curto para identificar o relatório no papel: 8 primeiros caracteres do hash (XXXX-XXXX). */
const shortCode = (seal: string) => `${seal.slice(0, 4)}-${seal.slice(4, 8)}`.toUpperCase();

export const IntegritySeal: React.FC<IntegritySealProps> = ({ inputs, analysis, extendedUnderLoad }) => {
  const [emittedAt] = useState(() => new Date().toISOString());
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [copied, setCopied] = useState<'dados' | 'link' | null>(null);
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const tablesHash = await getTablesHash();
      const payload = buildReportPayload(inputs, analysis, extendedUnderLoad, emittedAt, tablesHash);
      const pkg = await buildSealedPackage(payload);
      const link = makeVerificationLink(window.location.origin + window.location.pathname, pkg.compact);
      // Correção de erro baixa ("L") para o QR ficar menos denso e escanear melhor.
      const qr = await QRCode.toDataURL(link, { errorCorrectionLevel: 'L', margin: 2, width: 480 });
      if (alive) setSealed({ text: pkg.text, seal: pkg.seal, link, qr });
    })().catch(() => { if (alive) setSealed(null); });
    return () => { alive = false; };
  }, [inputs, analysis, extendedUnderLoad, emittedAt]);

  const copy = async (what: 'dados' | 'link') => {
    if (!sealed) return;
    try {
      await navigator.clipboard.writeText(what === 'dados' ? sealed.text : sealed.link);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const verify = async () => setResult(await verifyPackage(pasted));

  return (
    <section className="card verify-card">
      <h2 className="card-title">🔒 Verificar autenticidade</h2>
      <p className="muted">
        Este relatório sai impresso para a obra. Com o QR code, qualquer pessoa confere pelo celular, sem digitar nada,
        se os números foram alterados depois da emissão. Os dados ficam dentro do QR e não são enviados a nenhum servidor.
      </p>

      <div className="verify-main">
        {sealed ? (
          <img className="verify-qr" src={sealed.qr} alt="QR code de verificação do relatório" />
        ) : (
          <div className="verify-qr verify-qr-loading">gerando QR…</div>
        )}
        <div className="verify-info">
          <span className="telemetry-label">Código do relatório</span>
          <code className="short-code">{sealed ? shortCode(sealed.seal) : '····-····'}</code>
          <span className="telemetry-label">Emitido em {new Date(emittedAt).toLocaleString('pt-BR')}</span>
          <span className="verify-hint">Escaneie o QR code para verificar este relatório.</span>
        </div>
      </div>

      <details className="tech-details">
        <summary>Detalhes técnicos (selo SHA-256)</summary>
        <p className="muted small">
          O código acima são os 8 primeiros caracteres do hash SHA-256 calculado sobre os dados do relatório. Qualquer
          alteração nos dados muda o hash completo.
        </p>
        <code className="integrity-seal">{sealed ? sealed.seal : 'calculando...'}</code>
        <div className="integrity-actions">
          <button className="btn-secondary" onClick={() => copy('link')} disabled={!sealed}>
            {copied === 'link' ? '✔ Copiado' : 'Copiar link de verificação'}
          </button>
          <button className="btn-secondary" onClick={() => copy('dados')} disabled={!sealed}>
            {copied === 'dados' ? '✔ Copiado' : 'Copiar dados + selo'}
          </button>
        </div>
      </details>

      <details className="tech-details integrity-verify">
        <summary>Verificar um relatório colando o texto</summary>
        <textarea
          className="integrity-textarea"
          placeholder="Cole aqui o texto completo (dados + selo) copiado do relatório"
          value={pasted}
          onChange={(e) => { setPasted(e.target.value); setResult(null); }}
        />
        <button className="btn-primary" onClick={verify} disabled={!pasted.trim()}>Verificar</button>
        {result && <VerificationResultView result={result} />}
      </details>
    </section>
  );
};
