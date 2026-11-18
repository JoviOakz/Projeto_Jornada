import React from 'react';
import type { LiftAnalysis, LiftInputs } from '../types';
import { MD300L_LENGTHS } from '../data/charts';
import { CABLE_MAX_M, CABLE_MIN_M, MD300L_BOOM_MAX_M, MD300L_BOOM_RETRACTED_M } from '../data/craneSpecs';
import { getSlewRange } from '../lib/limits';

interface ControlsPanelProps {
  inputs: LiftInputs;
  analysis: LiftAnalysis;
  onChange: (patch: Partial<LiftInputs>) => void;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({ inputs, analysis, onChange }) => {
  const { model, boomLength, angle, rotation, payloadKg, cableLength } = inputs;
  const { angleRange, tableLength, loadHeight, isLoadAirborne } = analysis;
  const slewRange = getSlewRange(model);

  return (
    <>
      <section className="control-section">
      <h3 className="section-title">Equipamento</h3>
      <div className="control-group">
        <label className="group-title">Modelo do Guindaste</label>
        <div className="button-toggle">
          <button className={model === 'MD300L' ? 'active' : ''} onClick={() => onChange({ model: 'MD300L' })}>
            Madal Palfinger MD 300L (30t)
          </button>
          <button className={model === 'TM130' ? 'active' : ''} onClick={() => onChange({ model: 'TM130' })}>
            Luna TM 130 (26t)
          </button>
        </div>
      </div>
      </section>

      {/* Lança */}
      <section className="control-section">
      <h3 className="section-title">Lança e giro</h3>
      {model === 'MD300L' && (
        <div className="control-group">
          <div className="label-with-value">
            <label className="group-title">Extensão da Lança (m) :</label>
            <span className="value-badge">{boomLength.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            min={MD300L_BOOM_RETRACTED_M}
            max={MD300L_BOOM_MAX_M}
            step={0.1}
            value={boomLength}
            onChange={(e) => onChange({ boomLength: Number(e.target.value) })}
            className="slider-input"
          />
          <div className="length-chips">
            {MD300L_LENGTHS.map((len) => (
              <button key={len} className={tableLength === len && boomLength === len ? 'active' : ''} onClick={() => onChange({ boomLength: len })}>
                {len}
              </button>
            ))}
          </div>
          <span className="telemetry-label">
            Tabela de carga usada: {tableLength?.toFixed(1)} m
            {tableLength !== null && Math.abs(tableLength - boomLength) > 0.05
              ? ' (comprimento tabelado seguinte, por segurança)'
              : ''}
            . Estender somente sem carga.
          </span>
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
        <span className="telemetry-label">Faixa permitida: {angleRange.min}° a {angleRange.max}°</span>
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

      </section>

      {/* Carga */}
      <section className="control-section">
      <h3 className="section-title">Carga</h3>
      {/* Cabo do guincho */}
      <div className="control-group">
        <div className="label-with-value">
          <label className="group-title">Cabo do Guincho (m) :</label>
          <span className="value-badge">{cableLength.toFixed(1)} m</span>
        </div>
        <input
          type="range"
          min={CABLE_MIN_M}
          max={CABLE_MAX_M}
          step={0.5}
          value={cableLength}
          onChange={(e) => onChange({ cableLength: Number(e.target.value) })}
          className="slider-input"
        />
        <span className="telemetry-label">
          {isLoadAirborne ? `Carga suspensa a ${loadHeight.toFixed(1)} m do solo` : 'Carga apoiada no solo'}
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
      </section>
    </>
  );
};
