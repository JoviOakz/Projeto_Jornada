import { sha256Hex } from './integrity';

/**
 * Login SÓ DE FRONT-END (protótipo, sem backend).
 * As senhas não ficam em texto puro: guardamos só sal + hash SHA-256. Mesmo assim isto NÃO é segurança
 * real: quem abre o código ou o DevTools consegue contornar. Serve para demonstrar perfis de acesso (RBAC).
 * Em produção a autenticação e as permissões têm que ser validadas no servidor.
 */
export type Role = 'VISITANTE' | 'FUNCIONARIO' | 'ADMIN';
export type AppTab = 'PLAN' | 'TABLE' | 'REPORT' | 'ADMIN';

export interface RoleInfo {
  label: string;
  summary: string;
  tabs: AppTab[];
  canEditTables: boolean;
}

export const ROLES: Record<Role, RoleInfo> = {
  VISITANTE: {
    label: 'Visitante',
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
  { username: 'visitantes', salt: 'gr-ext-7f3a', hash: '1b54645a513e67d9472b7a12048a750b5d64560150441148d954e6842e0f8e4d', role: 'VISITANTE' },
  { username: 'funcionario', salt: 'gr-fun-2b91', hash: '6e41bcf38bd63a80f1a6c5612ee871139c874b134f55a3742096370dd144c844', role: 'FUNCIONARIO' },
  { username: 'admin', salt: 'gr-adm-c408', hash: '639a0fbe9a18de4653c395cd15b1b36d149352558d090c3d087243e1a212afb9', role: 'ADMIN' }
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
