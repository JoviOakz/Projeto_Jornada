import React, { useEffect, useState } from 'react';
import type { CraneModel, LiftAnalysis, LiftInputs, OperatingSector } from '../types';
import { CHARTS_MD300L, CHART_TM130, MD300L_LENGTHS } from '../data/charts';
import { MD300L_MAX_ANGLE_DEG, TM130_BOOM_LENGTH_M } from '../data/craneSpecs';
import { HOOK_WEIGHT_KG, NORMATIVE_LIMIT_PCT } from '../lib/capacity';
import { radiusToAngleDeg } from '../lib/geometry';

interface LoadChartTableProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
}

interface Row {
  key: string;
  angle: number;
  radius: number;
  capacity: number;
  limit: number;
  maxPayload: number;
  usagePct: number;
  current: boolean;
  unreachable: boolean;
}

type MdSector = Extract<OperatingSector, 'FRONTAL' | 'LATERAL_TRASEIRA'>;

const fmt = (n: number, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Carga útil máxima aceita pela regra RN01 (carga total estritamente abaixo de 85% da tabela). */
function limits(capacity: number, hookKg: number) {
  const limit = Math.floor(capacity * (NORMATIVE_LIMIT_PCT / 100) - 1e-9);
  return { limit, maxPayload: Math.max(0, limit - hookKg) };
}

export const LoadChartTable: React.FC<LoadChartTableProps> = ({ inputs, analysis }) => {
  const [model, setModel] = useState<CraneModel>(inputs.model);
  const [sector, setSector] = useState<MdSector>(
    analysis.sector === 'FRONTAL' ? 'FRONTAL' : 'LATERAL_TRASEIRA'
  );
  const [length, setLength] = useState<number>(analysis.tableLength ?? MD300L_LENGTHS[2]);

  const syncWithSimulator = () => {
    setModel(inputs.model);
    setSector(analysis.sector === 'FRONTAL' ? 'FRONTAL' : 'LATERAL_TRASEIRA');
    if (analysis.tableLength !== null) setLength(analysis.tableLength);
  };

  // Ao abrir a aba, já começa mostrando a tabela do ponto atual.
  useEffect(syncWithSimulator, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hookKg = HOOK_WEIGHT_KG[model];
  const sameModel = model === inputs.model;
  const rows: Row[] = [];

  if (model === 'MD300L') {
    const chart = sector === 'FRONTAL' ? CHARTS_MD300L.FRONTAL : CHARTS_MD300L.LATERAL_TRASEIRA;
    const line = chart.matrix[length] ?? {};
    const radii = chart.radii.filter((r) => line[r] != null);
    const sameTable = sameModel && analysis.sector === sector && analysis.tableLength === length;
    const currentRadius = radii.find((r) => r >= analysis.radius - 1e-9);
    radii.forEach((r) => {
      const capacity = line[r] as number;
      const angle = radiusToAngleDeg(r, length);
      rows.push({
        key: `r${r}`,
        angle,
        radius: r,
        capacity,
        ...limits(capacity, hookKg),
        usagePct: (analysis.totalLoadKg / capacity) * 100,
        current: sameTable && r === currentRadius,
        unreachable: angle > MD300L_MAX_ANGLE_DEG
      });
    });
  } else {
    const L = TM130_BOOM_LENGTH_M;
    const currentAngle = [...CHART_TM130.angles].reverse().find((a) => a <= inputs.angle + 1e-9);
    CHART_TM130.angles.forEach((a) => {
      const capacity = CHART_TM130.capacities[a];
      rows.push({
        key: `a${a}`,
        angle: a,
        radius: L * Math.cos((a * Math.PI) / 180),
        capacity,
        ...limits(capacity, hookKg),
        usagePct: (analysis.totalLoadKg / capacity) * 100,
        current: sameModel && a === currentAngle,
        unreachable: false
      });
    });
  }

  const hasUnreachable = rows.some((r) => r.unreachable);

  return (
    <section className="card table-card">
      <div className="table-head">
        <div>
          <h2 className="card-title">Tabela de carga</h2>
          <p className="muted">
            Valores do catálogo do fabricante, já incluindo o peso do gancho ({hookKg} kg). A linha em destaque é o
            ponto atual do simulador.
          </p>
        </div>
        <button className="btn-secondary" onClick={syncWithSimulator}>🎯 Usar ponto atual</button>
      </div>

      <div className="table-filters">
        <div className="filter">
          <span className="filter-label">Guindaste</span>
          <div className="seg">
            <button className={model === 'MD300L' ? 'active' : ''} onClick={() => setModel('MD300L')}>Madal MD 300L</button>
            <button className={model === 'TM130' ? 'active' : ''} onClick={() => setModel('TM130')}>Luna TM 130</button>
          </div>
        </div>

        {model === 'MD300L' && (
          <>
            <div className="filter">
              <span className="filter-label">Setor de giro</span>
              <div className="seg">
                <button className={sector === 'FRONTAL' ? 'active' : ''} onClick={() => setSector('FRONTAL')}>Frontal (110°)</button>
                <button className={sector === 'LATERAL_TRASEIRA' ? 'active' : ''} onClick={() => setSector('LATERAL_TRASEIRA')}>Lateral e traseira (250°)</button>
              </div>
            </div>
            <div className="filter">
              <span className="filter-label">Comprimento da lança</span>
              <div className="seg">
                {MD300L_LENGTHS.map((l) => (
                  <button key={l} className={length === l ? 'active' : ''} onClick={() => setLength(l)}>
                    {fmt(l, 1)} m
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {model === 'TM130' && (
          <p className="muted">Lança fixa de {fmt(TM130_BOOM_LENGTH_M, 1)} m (valor provisório) e giro restrito ao setor traseiro.</p>
        )}
      </div>

      <div className="table-scroll">
        <table className="load-table">
          <thead>
            <tr>
              <th>Ângulo</th>
              <th>Raio</th>
              <th>Capacidade</th>
              <th>Limite {NORMATIVE_LIMIT_PCT}%</th>
              <th>Carga útil máx.</th>
              <th>Uso com {fmt(analysis.totalLoadKg)} kg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const over = r.usagePct >= NORMATIVE_LIMIT_PCT;
              return (
                <tr key={r.key} className={`${r.current ? 'row-current' : ''} ${r.unreachable ? 'row-dim' : ''}`}>
                  <td>{fmt(r.angle, model === 'TM130' ? 0 : 1)}°{r.unreachable ? ' *' : ''}</td>
                  <td>{fmt(r.radius, 1)} m</td>
                  <td>{fmt(r.capacity)} kg</td>
                  <td>{fmt(r.limit)} kg</td>
                  <td>{fmt(r.maxPayload)} kg</td>
                  <td className={over ? 'text-red' : 'text-green'}>
                    {fmt(r.usagePct, 1)}% {over ? '(reprovado)' : '(ok)'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="muted small">
        Carga útil máx. = limite de {NORMATIVE_LIMIT_PCT}% da capacidade menos o gancho (regra RN01 do protótipo, em validação
        com o engenheiro responsável).
        {hasUnreachable && ` * Ângulo acima de ${MD300L_MAX_ANGLE_DEG}°: a lança principal não alcança esse raio nesta lança.`}
      </p>
    </section>
  );
};
