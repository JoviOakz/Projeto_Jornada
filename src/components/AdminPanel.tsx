import React from 'react';
import { ROLES, type AppTab, type Role } from '../lib/auth';
import { overrideCount, resetTables } from '../lib/tableStore';

interface AdminPanelProps {
  onTablesChanged: () => void;
}

const ROLE_ORDER: Role[] = ['EXTERNO', 'FUNCIONARIO', 'ADMIN'];

const ACCESS_ROWS: { label: string; has: (role: Role) => string }[] = [
  { label: 'Planejamento (simulador 3D)', has: (r) => (ROLES[r].tabs.includes('PLAN') ? 'Sim' : 'Não') },
  { label: 'Tabela de carga: consultar', has: (r) => (ROLES[r].tabs.includes('TABLE') ? 'Sim' : 'Não') },
  { label: 'Tabela de carga: editar valores', has: (r) => (ROLES[r].canEditTables ? 'Sim' : 'Não') },
  { label: 'Gerar relatório com selo e QR', has: (r) => (ROLES[r].tabs.includes('REPORT' as AppTab) ? 'Sim' : 'Não') },
  { label: 'Administração (frota e tabelas)', has: (r) => (ROLES[r].tabs.includes('ADMIN') ? 'Sim' : 'Não') },
  { label: 'Verificar relatório pelo QR', has: () => 'Sim (sem login)' }
];

export const AdminPanel: React.FC<AdminPanelProps> = ({ onTablesChanged }) => {
  const changed = overrideCount();

  return (
    <div className="admin-grid">
      <section className="card">
        <h2 className="card-title">Perfis de acesso</h2>
        <p className="muted">O que cada tipo de usuário enxerga e pode fazer.</p>
        <div className="table-scroll">
          <table className="load-table access-table">
            <thead>
              <tr>
                <th>Permissão</th>
                {ROLE_ORDER.map((r) => <th key={r}>{ROLES[r].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {ACCESS_ROWS.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  {ROLE_ORDER.map((r) => {
                    const v = row.has(r);
                    return <td key={r} className={v.startsWith('Sim') ? 'text-green' : 'text-red'}>{v}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Tabelas de carga</h2>
        <p className="muted">
          {changed === 0
            ? 'As tabelas estão iguais às do catálogo do fabricante.'
            : `${changed} valor(es) alterado(s) em relação ao catálogo. Eles entram no cálculo e no hash do relatório.`}
          {' '}Para editar, use a aba Tabela de carga.
        </p>
        <div>
          <button
            className="btn-secondary"
            disabled={changed === 0}
            onClick={() => {
              if (window.confirm('Restaurar todas as tabelas para os valores do catálogo?')) {
                resetTables();
                onTablesChanged();
              }
            }}
          >
            ↩ Restaurar tabelas originais
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Cadastro de guindastes</h2>
        <p className="muted">
          Previsto para a próxima etapa: cadastrar um novo guindaste informando tabela de carga, faixa de ângulo,
          giro e layout das sapatas. Depende de um servidor para guardar os dados da frota.
        </p>
        <button className="btn-secondary" disabled>＋ Adicionar guindaste (em breve)</button>
      </section>
    </div>
  );
};
