import React, { useCallback, useEffect, useState } from 'react';
import './App.css';

import type { LiftInputs, ViewMode } from './types';
import { useLiftAnalysis } from './hooks/useLiftAnalysis';
import { normalizeInputs } from './lib/limits';
import { isLoadAirborne } from './lib/geometry';
import { Crane3D } from './components/Crane3D';
import { Crane2D } from './components/Crane2D';
import { ControlsPanel } from './components/ControlsPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ReportPanel } from './components/ReportPanel';
import { LoadChartTable } from './components/LoadChartTable';
import { StatusBar } from './components/StatusBar';
import { VerifyModal } from './components/VerifyModal';
import { readPackageFromHash } from './lib/integrity';

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

type AppTab = 'PLAN' | 'TABLE' | 'REPORT';

const APP_TABS: { id: AppTab; label: string }[] = [
  { id: 'PLAN', label: 'Planejamento' },
  { id: 'TABLE', label: 'Tabela de carga' },
  { id: 'REPORT', label: 'Relatório e segurança' }
];

export const App: React.FC = () => {
  const [inputs, setInputs] = useState<LiftInputs>(INITIAL_INPUTS);
  const [viewMode, setViewMode] = useState<ViewMode>('3D');
  const [tab, setTab] = useState<AppTab>('PLAN');

  // Link/QR de verificação: abre a tela de verificação com o pacote já carregado.
  const [verifyText, setVerifyText] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : readPackageFromHash(window.location.hash)
  );
  useEffect(() => {
    const onHash = () => setVerifyText(readPackageFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const closeVerify = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setVerifyText(null);
  };

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
      <header className="header">
        <div className="header-brand">
          <span className="logo-icon">🏗️</span>
          <div>
            <h1>Planejamento de Içamentos</h1>
            <p>Guindastes Ribas Ltda.</p>
          </div>
        </div>

        <nav className="app-tabs" role="tablist" aria-label="Seções do sistema">
          {APP_TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'PLAN' && (
        <>
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
        </>
      )}

      {tab === 'TABLE' && <LoadChartTable inputs={inputs} analysis={analysis} />}

      {tab === 'REPORT' && (
        <ReportPanel inputs={inputs} analysis={analysis} extendedUnderLoad={extendedUnderLoad} />
      )}

      {verifyText !== null && <VerifyModal packageText={verifyText} onClose={closeVerify} />}
    </div>
  );
};

export default App;
