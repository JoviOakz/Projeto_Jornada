import React, { useEffect, useState } from 'react';
import { authenticate, type Session } from '../lib/auth';

interface LoginScreenProps {
  onLogin: (session: Session) => void;
}

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const locked = secondsLeft > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || busy) return;
    setBusy(true);
    const session = await authenticate(username, password);
    setBusy(false);
    if (session) {
      onLogin(session);
      return;
    }
    const f = failures + 1;
    setPassword('');
    if (f >= MAX_ATTEMPTS) {
      setFailures(0);
      setNow(Date.now());
      setLockedUntil(Date.now() + LOCK_SECONDS * 1000);
      setError('');
    } else {
      setFailures(f);
      setError(`Usuário ou senha incorretos. Tentativas restantes: ${MAX_ATTEMPTS - f}.`);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-brand">
          <span className="logo-icon">🏗️</span>
          <div>
            <h1>Planejamento de Içamentos</h1>
            <p className="muted">Guindastes Ribas Ltda.</p>
          </div>
        </div>

        <label className="field">
          <span className="filter-label">Usuário</span>
          <input
            className="text-input"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="filter-label">Senha</span>
          <input
            className="text-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="login-error" role="alert">{error}</p>}
        {locked && (
          <p className="login-error" role="alert">
            Muitas tentativas. Aguarde {secondsLeft}s para tentar de novo.
          </p>
        )}

        <button className="btn-primary login-submit" type="submit" disabled={locked || busy}>
          {busy ? 'Verificando…' : 'Entrar'}
        </button>

        <p className="muted small">
          Para conferir um relatório impresso, escaneie o QR code dele: a verificação não exige login.
        </p>
      </form>
    </div>
  );
};
