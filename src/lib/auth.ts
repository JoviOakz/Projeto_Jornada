import { sha256Hex } from './integrity';

/**
 * Login SÓ DE FRONT-END (protótipo, sem backend).
 * As senhas não ficam em texto puro: guardamos só sal + hash SHA-256. Mesmo assim isto NÃO é segurança
 * real: quem abre o código ou o DevTools consegue contornar. Serve para demonstrar perfis de acesso (RBAC).
 * Em produção a autenticação e as permissões têm que ser validadas no servidor.
 */
export type Role = 'EXTERNO' | 'FUNCIONARIO' | 'ADMIN';
export type AppTab = 'PLAN' | 'TABLE' | 'REPORT' | 'ADMIN';

export interface RoleInfo {
  label: string;
  summary: string;
  tabs: AppTab[];
  canEditTables: boolean;
}

export const ROLES: Record<Role, RoleInfo> = {
  EXTERNO: {
    label: 'Externo',
    summary: 'Só simula no planejamento. Não vê as tabelas de carga nem emite relatórios.',
    tabs: ['PLAN'],
    canEditTables: false
  },
  FUNCIONARIO: {
    label: 'Funcionário',
    summary: 'Simula, consulta as tabelas de carga (sem editar) e gera relatórios.',
    tabs: ['PLAN', 'TABLE', 'REPORT'],
    canEditTables: false
  },
  ADMIN: {
    label: 'Administrador',
    summary: 'Acessa todas as abas, edita as tabelas de carga e gerencia a frota.',
    tabs: ['PLAN', 'TABLE', 'REPORT', 'ADMIN'],
    canEditTables: true
  }
};

interface UserRecord { username: string; salt: string; hash: string; role: Role }

const USERS: UserRecord[] = [
  { username: 'externo', salt: 'gr-ext-7f3a', hash: '1b54645a513e67d9472b7a12048a750b5d64560150441148d954e6842e0f8e4d', role: 'EXTERNO' },
  { username: 'funcionario', salt: 'gr-fun-2b91', hash: 'c2b868701151ce2646d41511b07900eb6d3369de0295b8a0efef272878718d53', role: 'FUNCIONARIO' },
  { username: 'admin', salt: 'gr-adm-c408', hash: 'd14fd68ad61b9dd6708aee226d5c6003408af237f4071bda905323cccd873708', role: 'ADMIN' }
];

/** Acessos mostrados na tela de login, só para a demonstração. */
export const DEMO_ACCESS: { username: string; password: string; role: Role }[] = [
  { username: 'externo', password: '1234', role: 'EXTERNO' },
  { username: 'funcionario', password: 'func@2026', role: 'FUNCIONARIO' },
  { username: 'admin', password: 'Admin@Ribas2026', role: 'ADMIN' }
];

export interface Session { username: string; role: Role }

export async function authenticate(username: string, password: string): Promise<Session | null> {
  const user = USERS.find((u) => u.username === username.trim().toLowerCase());
  const hash = await sha256Hex(`${user ? user.salt : 'x'}:${password}`);
  return user && hash === user.hash ? { username: user.username, role: user.role } : null;
}

const SESSION_KEY = 'gr.session';

export function loadSession(): Session | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    return s && s.role in ROLES && USERS.some((u) => u.username === s.username && u.role === s.role) ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(s: Session | null) {
  try {
    if (typeof window === 'undefined') return;
    if (s) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch { /* sem armazenamento: a sessão vale só nesta tela */ }
}
