import React from 'react';
import type { VerificationResult } from '../lib/integrity';

export const VerificationResultView: React.FC<{ result: VerificationResult }> = ({ result }) => (
  <div className={`integrity-result ${result.ok ? 'integrity-ok' : 'integrity-fail'}`}>
    <strong>{result.ok ? '✅ ÍNTEGRO' : '⛔ ADULTERADO OU INVÁLIDO'}</strong>
    <ul>
      {result.checks.map((c) => (
        <li key={c.label}>{c.ok ? '✔' : '✘'} {c.label}{c.detail ? `: ${c.detail}` : ''}</li>
      ))}
    </ul>
    {result.notice && <p>{result.notice}</p>}
  </div>
);
