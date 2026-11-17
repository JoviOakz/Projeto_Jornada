import React from 'react';
import type { LiftInputs } from '../types';
import { CHART_MD300L } from '../data/charts';
import { getAngleRange, getSlewRange } from '../lib/limits';

interface ControlsPanelProps {
  inputs: LiftInputs;
  onChange: (patch: Partial<LiftInputs>) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({ inputs, onChange }) => {
  const { model, boomLength, angle, rotation, payloadKg } = inputs;
  const angleRange = getAngleRange(model, boomLength);
  const slewRange = getSlewRange(model);

  return (
    <>
      {/* Seletor do Modelo */}
      <div className="control-group">
        <label className="group-title">Modelo do Guindaste</label>
        <div className="button-toggle">
          <button
            className={model === 'MD300L' ? 'active' : ''}
            onClick={() => onChange({ model: 'MD300L' })}
          >
            Madal Palfinger MD 300L (30t)
          </button>
          <button
            className={model === 'TM130' ? 'active' : ''}
            onClick={() => onChange({ model: 'TM130' })}
          >
            Luna TM 130 (26t)
          </button>
        </div>
      </div>

      {/* Comprimento da Lança */}
      {model === 'MD300L' && (
        <div className="control-group">
          <label className="group-title">Comprimento da Lança (m)</label>
          <select
            value={boomLength}
            onChange={(e) => onChange({ boomLength: Number(e.target.value) })}
            className="select-input"
          >
            {CHART_MD300L.lengths.map((len) => (
              <option key={len} value={len}>
                {len} metros
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ângulo de Elevação */}
      <div className="control-group">
        <div className="label-with-value">
          <label className="group-title">Ângulo de Elevação (°) :</label>
          <span className="value-badge">{angle}°</span>
        </div>
        <input
          type="range"
          min={angleRange.min}
          max={angleRange.max}
          value={angle}
          onChange={(e) => onChange({ angle: Number(e.target.value) })}
          className="slider-input"
        />
        <span className="telemetry-label">
          Faixa permitida: {angleRange.min}° a {angleRange.max}°
        </span>
      </div>

      {/* Giro de Azimute */}
      <div className="control-group">
        <div className="label-with-value">
          <label className="group-title">Giro de Azimute (°) :</label>
          <span className="value-badge">{rotation}°</span>
        </div>
        <input
          type="range"
          min={slewRange.min}
          max={slewRange.max}
          value={rotation}
          onChange={(e) => onChange({ rotation: Number(e.target.value) })}
          className="slider-input"
        />
        <span className="telemetry-label">
          {slewRange.continuous
            ? 'Giro contínuo de 360° (0° = sobre a cabine)'
            : `Setor traseiro restrito: ${slewRange.min}° a ${slewRange.max}° (180° = atrás)`}
        </span>
      </div>

      {/* Peso da Carga */}
      <div className="control-group">
        <label className="group-title">Peso Içado na Carga (kg)</label>
        <input
          type="number"
          step="500"
          min="500"
          max="35000"
          value={payloadKg}
          onChange={(e) => onChange({ payloadKg: Number(e.target.value) })}
          className="number-input"
        />
      </div>
    </>
  );
};
