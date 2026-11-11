import React from 'react';
import type { CraneModel } from '../types';
import { CHART_MD300L, CHART_TM130 } from '../data/charts';

interface LoadChartTableProps {
  model: CraneModel;
  boomLength: number;
  angle: number;
  radius: number;
  isOverload: boolean;
  isWarning: boolean;
}

export const LoadChartTable: React.FC<LoadChartTableProps> = ({
  model,
  boomLength,
  angle,
  radius,
  isOverload,
  isWarning
}) => {
  const activeClass = (isActive: boolean) =>
    isActive ? (isOverload ? 'active-overload' : isWarning ? 'active-warning' : 'active-safe') : '';

  return (
    <footer className="table-section">
      <div className="card-header">
        <h2>Tabela Oficial de Cargas ({model === 'MD300L' ? 'MD 300L' : 'Luna TM 130'})</h2>
        <span className="legend-badge">Célula ativa iluminada dinamicamente conforme a geometria</span>
      </div>

      <div className="table-wrapper">
        {model === 'MD300L' ? (
          <table className="load-chart-table">
            <thead>
              <tr>
                <th>Raio (m) \ Lança (m)</th>
                {CHART_MD300L.lengths.map((len) => (
                  <th key={len} className={len === boomLength ? 'col-highlight' : ''}>
                    {len} m
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHART_MD300L.radii.map((rad) => (
                <tr key={rad}>
                  <td className="row-header">{rad.toFixed(1)} m</td>
                  {CHART_MD300L.lengths.map((len) => {
                    const val = CHART_MD300L.matrix[len]?.[rad];
                    const isActive = len === boomLength && Math.abs(rad - radius) < 0.6;
                    return (
                      <td key={len} className={`cell-value ${activeClass(isActive)}`}>
                        {val ? `${(val / 1000).toFixed(1)}t` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="load-chart-table">
            <thead>
              <tr>
                <th>Ângulo da Lança (°)</th>
                {CHART_TM130.angles.map((ang) => (
                  <th key={ang} className={Math.abs(ang - angle) <= 2.5 ? 'col-highlight' : ''}>
                    {ang}°
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="row-header">Capacidade (kg)</td>
                {CHART_TM130.angles.map((ang) => {
                  const val = CHART_TM130.capacities[ang];
                  const isActive = Math.abs(ang - angle) <= 2.5;
                  return (
                    <td key={ang} className={`cell-value ${activeClass(isActive)}`}>
                      {val ? `${val.toLocaleString()} kg` : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </footer>
  );
};
