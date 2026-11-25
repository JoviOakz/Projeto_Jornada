import { CHARTS_MD300L, CHART_TM130 } from '../data/charts';
import type { CraneModel, LiftAnalysis, LiftInputs } from '../types';
import { analyzeLift } from './analysis';

export const REPORT_VERSION = 1;
export const SEAL_MARKER = '---SELO-SHA256---';

export interface ReportPayload {
  app: string;
  versao: number;
  emitidoEm: string;
  tabelasHash: string;
  entradas: LiftInputs;
  resultado: {
    raio: number;
    capacidadeKg: number | null;
    cargaTotalKg: number;
    utilizacaoPct: number;
    setor: string;
    tabelaUsada: number | null;
    cargaSobreSapata: boolean;
    extensaoComCarga: boolean;
    aprovado: boolean;
  };
}

/** JSON com chaves ordenadas: o mesmo conteúdo sempre gera o mesmo texto (e o mesmo hash). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** SHA-256 em hexadecimal, via Web Crypto API do navegador (exige HTTPS ou localhost). */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash das tabelas de carga atuais (podem ser editadas pelo administrador): identifica a versão usada no cálculo. */
export function getTablesHash(): Promise<string> {
  return sha256Hex(stableStringify({ MD300L: CHARTS_MD300L, TM130: CHART_TM130 }));
}

export function buildReportPayload(
  inputs: LiftInputs,
  analysis: LiftAnalysis,
  extendedUnderLoad: boolean,
  emitidoEm: string,
  tabelasHash: string
): ReportPayload {
  return {
    app: 'GuindastesRibas',
    versao: REPORT_VERSION,
    emitidoEm,
    tabelasHash,
    entradas: { ...inputs },
    resultado: {
      raio: analysis.radius,
      capacidadeKg: analysis.maxCapacityKg,
      cargaTotalKg: analysis.totalLoadKg,
      utilizacaoPct: Number(analysis.usagePct.toFixed(1)),
      setor: analysis.sector,
      tabelaUsada: analysis.tableLength,
      cargaSobreSapata: analysis.isCargoOverSapata,
      extensaoComCarga: extendedUnderLoad,
      aprovado: analysis.isApproved && !extendedUnderLoad
    }
  };
}

/**
 * Pacote (dados + selo). `text` é legível (para copiar e guardar);
 * `compact` é a versão curta, usada no link e no QR code.
 */
export async function buildSealedPackage(
  payload: ReportPayload
): Promise<{ text: string; compact: string; seal: string }> {
  const seal = await sha256Hex(stableStringify(payload));
  return {
    text: `${JSON.stringify(payload, null, 2)}\n${SEAL_MARKER}\n${seal}`,
    compact: `${JSON.stringify(payload)}\n${SEAL_MARKER}\n${seal}`,
    seal
  };
}

// ---- Link de verificação (os dados vão no fragmento "#", que o navegador nunca envia ao servidor) ----
export const VERIFY_HASH_PREFIX = '#verificar=';

function toBase64Url(text: string): string {
  let bin = '';
  new TextEncoder().encode(text).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function makeVerificationLink(baseUrl: string, compactPackage: string): string {
  return `${baseUrl}${VERIFY_HASH_PREFIX}${toBase64Url(compactPackage)}`;
}

/** Lê o pacote do fragmento da URL. null = não há link de verificação; '' = link inválido. */
export function readPackageFromHash(hash: string): string | null {
  if (!hash.startsWith(VERIFY_HASH_PREFIX)) return null;
  try {
    return fromBase64Url(hash.slice(VERIFY_HASH_PREFIX.length));
  } catch {
    return '';
  }
}

/** Dados gravados no pacote, para exibir a quem verificou (não confiáveis até a verificação passar). */
export function readRecordedPayload(packageText: string): ReportPayload | null {
  const idx = packageText.lastIndexOf(SEAL_MARKER);
  if (idx < 0) return null;
  try {
    const p = JSON.parse(packageText.slice(0, idx).trim());
    return isPayload(p) ? p : null;
  } catch {
    return null;
  }
}

export interface VerificationCheck {
  label: string;
  ok: boolean;
  detail?: string;
}
export interface VerificationResult {
  ok: boolean;
  checks: VerificationCheck[];
  notice?: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const MODELS: CraneModel[] = ['MD300L', 'TM130'];

function isPayload(p: any): p is ReportPayload {
  const e = p?.entradas;
  const r = p?.resultado;
  return (
    p && typeof p === 'object' && typeof p.emitidoEm === 'string' && typeof p.tabelasHash === 'string' &&
    e && MODELS.includes(e.model) && [e.boomLength, e.payloadKg, e.angle, e.rotation, e.cableLength].every(isNum) &&
    r && typeof r === 'object' && typeof r.aprovado === 'boolean' && typeof r.extensaoComCarga === 'boolean'
  );
}

/**
 * Verifica um pacote (dados + selo):
 *  1) o hash dos dados confere com o selo (integridade);
 *  2) o cálculo refeito a partir das entradas gera os mesmos resultados (ninguém editou o veredito).
 */
export async function verifyPackage(packageText: string): Promise<VerificationResult> {
  const idx = packageText.lastIndexOf(SEAL_MARKER);
  if (idx < 0) {
    return { ok: false, checks: [{ label: 'Formato do pacote', ok: false, detail: 'Selo não encontrado. Cole o texto completo copiado do relatório.' }] };
  }
  const jsonText = packageText.slice(0, idx).trim();
  const seal = packageText.slice(idx + SEAL_MARKER.length).trim().toLowerCase();

  let payload: unknown;
  try {
    payload = JSON.parse(jsonText);
  } catch {
    return { ok: false, checks: [{ label: 'Formato do pacote', ok: false, detail: 'Os dados não são um JSON válido.' }] };
  }
  if (!isPayload(payload)) {
    return { ok: false, checks: [{ label: 'Formato do pacote', ok: false, detail: 'Estrutura do relatório inválida.' }] };
  }

  const checks: VerificationCheck[] = [];
  const currentTables = await getTablesHash();
  const sameTables = payload.tabelasHash === currentTables;
  const computedSeal = await sha256Hex(stableStringify(payload));
  checks.push({
    label: 'Selo SHA-256 confere com os dados',
    ok: computedSeal === seal,
    detail: computedSeal === seal ? undefined : 'Os dados foram alterados depois da emissão.'
  });

  if (!sameTables) {
    // O cálculo refeito usaria tabelas diferentes das da emissão: a comparação não faria sentido.
    checks.push({
      label: 'Cálculo refeito bate com o resultado gravado',
      ok: true,
      detail: 'não comparado: as tabelas de carga deste navegador são diferentes das usadas na emissão'
    });
  } else try {
    const a = analyzeLift(payload.entradas);
    const approved = a.isApproved && !payload.resultado.extensaoComCarga;
    const r = payload.resultado;
    const same =
      r.raio === a.radius &&
      r.capacidadeKg === a.maxCapacityKg &&
      r.cargaTotalKg === a.totalLoadKg &&
      r.utilizacaoPct === Number(a.usagePct.toFixed(1)) &&
      r.setor === a.sector &&
      r.tabelaUsada === a.tableLength &&
      r.cargaSobreSapata === a.isCargoOverSapata &&
      r.aprovado === approved;
    checks.push({
      label: 'Cálculo refeito bate com o resultado gravado',
      ok: same,
      detail: same ? undefined : 'O resultado não corresponde às entradas informadas.'
    });
  } catch {
    checks.push({ label: 'Cálculo refeito bate com o resultado gravado', ok: false, detail: 'Não foi possível refazer o cálculo.' });
  }

  return {
    ok: checks.every((c) => c.ok),
    checks,
    notice: sameTables ? undefined : 'Aviso: as tabelas de carga mudaram desde a emissão deste relatório.'
  };
}
