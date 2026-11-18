import React, { useEffect, useState } from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import {
  buildReportPayload,
  buildSealedPackage,
  getTablesHash,
  verifyPackage,
  type VerificationResult
} from '../lib/integrity';

interface IntegritySealProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
  extendedUnderLoad: boolean;
}

export const IntegritySeal: React.FC<IntegritySealProps> = ({ inputs, analysis, extendedUnderLoad }) => {
  const [emittedAt] = useState(() => new Date().toISOString());
  const [sealed, setSealed] = useState<{ text: string; seal: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const tablesHash = await getTablesHash();
      const payload = buildReportPayload(inputs, analysis, extendedUnderLoad, emittedAt, tablesHash);
      const pkg = await buildSealedPackage(payload);
      if (alive) setSealed(pkg);
    })().catch(() => alive && setSealed(null));
    return () => { alive = false; };
  }, [inputs, analysis, extendedUnderLoad, emittedAt]);

  const copy = async () => {
    if (!sealed) return;
    try {
      await navigator.clipboard.writeText(sealed.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const verify = async () => setResult(await verifyPackage(pasted));

  return (
    <div className="integrity-box">
      <div className="integrity-header">
        <strong>🔒 Selo de integridade (SHA-256)</strong>
        <span className="telemetry-label">Emitido em {new Date(emittedAt).toLocaleString('pt-BR')}</span>
      </div>
      <code className="integrity-seal">{sealed ? sealed.seal : 'calculando...'}</code>
      <button className="btn-secondary integrity-copy" onClick={copy} disabled={!sealed}>
        {copied ? '✔ Copiado' : 'Copiar dados + selo'}
      </button>

      <details className="integrity-verify">
        <summary>Verificar um relatório</summary>
        <textarea
          className="integrity-textarea"
          placeholder="Cole aqui o texto completo (dados + selo) copiado do relatório"
          value={pasted}
          onChange={(e) => { setPasted(e.target.value); setResult(null); }}
        />
        <button className="btn-primary" onClick={verify} disabled={!pasted.trim()}>Verificar</button>
        {result && (
          <div className={`integrity-result ${result.ok ? 'integrity-ok' : 'integrity-fail'}`}>
            <strong>{result.ok ? '✅ ÍNTEGRO' : '⛔ ADULTERADO OU INVÁLIDO'}</strong>
            <ul>
              {result.checks.map((c) => (
                <li key={c.label}>{c.ok ? '✔' : '✘'} {c.label}{c.detail ? `: ${c.detail}` : ''}</li>
              ))}
            </ul>
            {result.notice && <p>{result.notice}</p>}
          </div>
        )}
      </details>
    </div>
  );
};
