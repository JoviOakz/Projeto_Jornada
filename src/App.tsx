import React, { useCallback, useState } from 'react';
import './App.css';

import type { LiftInputs, ViewMode } from './types';
import { useLiftAnalysis } from './hooks/useLiftAnalysis';
import { Crane3D } from './components/Crane3D';
import { Crane2D } from './components/Crane2D';
import { ControlsPanel } from './components/ControlsPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { LoadChartTable } from './components/LoadChartTable';
import { ReportModal } from './components/ReportModal';

const INITIAL_INPUTS: LiftInputs = {
  model: 'MD300L',
  boomLength: 17.7,
  payloadKg: 8000,
  angle: 45,
  rotation: 45
};

const VIEW_TABS: { mode: ViewMode; label: string }[] = [
  { mode: '3D', label: '🌐 Visão 3D WebGL (Com Zonas no Chão)' },
  { mode: '2D_SIDE', label: '📐 2D Vista Lateral' },
  { mode: '2D_TOP', label: '🔍 2D Vista Superior (Planta)' }
];

const VIEW_HINTS: Record<ViewMode, string> = {
  '3D': '🟢 Verde = Operação Permitida | 🔴 Vermelho = Sobrecarga',
  '2D_SIDE': '📐 Elevação da Lança',
  '2D_TOP': '🔍 Planta de Raio no Solo'
};

export const App: React.FC = () => {
  const [inputs, setInputs] = useState<LiftInputs>(INITIAL_INPUTS);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  const updateInputs = useCallback(
    (patch: Partial<LiftInputs>) => setInputs((prev) => ({ ...prev, ...patch })),
    []
  );

  const analysis = useLiftAnalysis(inputs);

  return (
    <div className="app-container">
      {/* Cabeçalho */}
      <header className="header">
        <div className="header-brand">
          <span className="logo-icon">🏗️</span>
          <div>
            <h1>Análise e Planejamento de Içamentos</h1>
            <p>Guindastes Ribas Ltda. — Protótipo de Engenharia Operacional</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setIsReportOpen(true)}>
            📄 Gerar Relatório Técnico
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Painel Gráfico */}
        <section className="canvas-card">
          <div className="card-header">
            <div className="view-tabs">
              {VIEW_TABS.map(({ mode, label }) => (
                <button
                  key={mode}
                  className={viewMode === mode ? 'active' : ''}
                  onClick={() => setViewMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="instruction-badge">{VIEW_HINTS[viewMode]}</span>
          </div>

          {viewMode === '3D' ? (
            <Crane3D inputs={inputs} analysis={analysis} />
          ) : (
            <Crane2D view={viewMode} inputs={inputs} analysis={analysis} />
          )}
        </section>

        {/* Sidebar */}
        <section className="controls-sidebar">
          <ControlsPanel inputs={inputs} onChange={updateInputs} />
          <TelemetryPanel analysis={analysis} />
        </section>
      </main>

      <LoadChartTable
        model={inputs.model}
        boomLength={inputs.boomLength}
        angle={inputs.angle}
        radius={analysis.radius}
        isOverload={analysis.isOverload}
        isWarning={analysis.isWarning}
      />

      {isReportOpen && (
        <ReportModal
          inputs={inputs}
          analysis={analysis}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
