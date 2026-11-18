import React, { useCallback, useState } from 'react';
import './App.css';

import type { LiftInputs, ViewMode } from './types';
import { useLiftAnalysis } from './hooks/useLiftAnalysis';
import { normalizeInputs } from './lib/limits';
import { isLoadAirborne } from './lib/geometry';
import { Crane3D } from './components/Crane3D';
import { Crane2D } from './components/Crane2D';
import { ControlsPanel } from './components/ControlsPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ReportModal } from './components/ReportModal';
import { StatusBar } from './components/StatusBar';

const INITIAL_INPUTS: LiftInputs = {
  model: 'MD300L',
  boomLength: 17.7,
  payloadKg: 1000,
  angle: 45,
  rotation: 90,
  cableLength: 4
};

const VIEW_TABS: { mode: ViewMode; label: string }[] = [
  { mode: '3D', label: '🌐 3D' },
  { mode: '2D_SIDE', label: '📐 Lateral' },
  { mode: '2D_TOP', label: '🔍 Planta' }
];

export const App: React.FC = () => {
  const [inputs, setInputs] = useState<LiftInputs>(INITIAL_INPUTS);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // A extensão da lança só pode ser feita sem carga (catálogo MD 300L).
  const [extendedUnderLoad, setExtendedUnderLoad] = useState<boolean>(false);

  const updateInputs = useCallback(
    (patch: Partial<LiftInputs>) => {
      const next = normalizeInputs({ ...inputs, ...patch }, inputs.model);
      const lengthChanged = next.model === inputs.model && next.boomLength !== inputs.boomLength;
      const wasAirborne = isLoadAirborne(inputs.boomLength, inputs.angle, inputs.cableLength);
      const nowAirborne = isLoadAirborne(next.boomLength, next.angle, next.cableLength);
      if (lengthChanged) setExtendedUnderLoad(wasAirborne);
      else if (!nowAirborne) setExtendedUnderLoad(false);
      setInputs(next);
    },
    [inputs]
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

      <StatusBar analysis={analysis} extendedUnderLoad={extendedUnderLoad} />

      <main className="main-content">
        <div className="main-column">
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
            </div>

            {viewMode === '3D' ? (
              <Crane3D inputs={inputs} analysis={analysis} />
            ) : (
              <Crane2D view={viewMode} inputs={inputs} analysis={analysis} />
            )}
          </section>

          <TelemetryPanel analysis={analysis} extendedUnderLoad={extendedUnderLoad} />
        </div>

        <aside className="controls-sidebar">
          <ControlsPanel inputs={inputs} analysis={analysis} onChange={updateInputs} />
        </aside>
      </main>

      {isReportOpen && (
        <ReportModal
          inputs={inputs}
          analysis={analysis}
          extendedUnderLoad={extendedUnderLoad}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
