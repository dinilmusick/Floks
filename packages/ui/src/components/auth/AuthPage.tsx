import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Shield, ArrowRight, AlertCircle } from 'lucide-react';

/**
 * @public
 * Canonical Auth Result contract.
 */
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: unknown;
  token?: string;
}

/**
 * @public
 * Canonical AuthPage Props for FLOKS reusable authentication page.
 */
export interface AuthPageProps {
  appName?: string;
  appSubtitle?: string;
  footerText?: string;
  onLogin: (email: string, password: string) => Promise<AuthResult>;
  onRegister: (input: { name: string; email: string; password: string }) => Promise<AuthResult>;
  onSuccess?: (result: AuthResult) => void;
  onSwitchToAdmin?: () => void;
}

/**
 * @public
 * Canonical FLOKS AuthPage section/page component.
 * Single source of truth for login/registration across DEPM, KRUSBL, and SKIPO apps.
 */
export const AuthPage: React.FC<AuthPageProps> = ({
  appName = 'SKIPO',
  appSubtitle = 'WORKSPACE',
  footerText,
  onLogin,
  onRegister,
  onSuccess,
  onSwitchToAdmin,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) return setError('Email address is required.');
    if (!password) return setError('Password is required.');
    if (mode === 'register' && !name.trim()) return setError('Please enter your full name or display name.');
    if (mode === 'register' && password.length < 4) return setError('Password must be at least 4 characters long.');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await onLogin(cleanEmail, password)
        : await onRegister({ name: name.trim(), email: cleanEmail, password });
      if (!result.success) throw new Error(result.error || 'Authentication failed.');
      onSuccess?.(result);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--skipo-bg)] text-[var(--skipo-text)] font-mono flex flex-col justify-between select-none">
      <header className="border-b-2 border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--skipo-accent)] text-black font-black flex items-center justify-center border border-[var(--skipo-border-color)]">▲</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-wider">{appName}</span>
              <span className="text-[10px] text-[var(--skipo-text-muted)] font-bold">{appSubtitle}</span>
            </div>
          </div>
        </div>
        {onSwitchToAdmin && (
          <button type="button" onClick={onSwitchToAdmin} className="px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center gap-1.5 shadow-[2px_2px_0px_#D4AF37]">
            <Shield size={13} /> ADMIN LOGIN <ArrowRight size={13} />
          </button>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md border-2 border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] shadow-[6px_6px_0px_var(--skipo-border-color)] p-6">
          <div className="grid grid-cols-2 gap-2 mb-6 border-b border-[var(--skipo-border-color)] pb-3">
            {(['login', 'register'] as const).map((next) => (
              <button key={next} type="button" onClick={() => { setMode(next); setError(null); }}
                className={`py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border ${mode === next ? 'bg-[var(--skipo-accent)] text-black border-[var(--skipo-border-color)]' : 'bg-[var(--skipo-bg)] text-[var(--skipo-text-muted)] border-transparent'}`}>
                {next === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}
                {next === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider">{mode === 'login' ? 'WORKSPACE SIGN IN' : 'NEW DEVELOPER ACCOUNT'}</h2>
            <p className="text-xs text-[var(--skipo-text-muted)] mt-1">{mode === 'login' ? 'Sign in to access your workspaces and application control plane.' : 'Create an account to manage your workspaces and applications.'}</p>
          </div>

          {error && <div className="mb-4 p-3 border-2 border-red-500/80 bg-red-950/40 text-red-300 text-xs flex items-start gap-2"><AlertCircle size={15} className="shrink-0 mt-0.5" /><div>{error}</div></div>}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && <div><label className="block text-[11px] font-bold text-[var(--skipo-text-muted)] uppercase tracking-wider mb-1">Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Developer" required className="w-full bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] focus:border-[var(--skipo-accent)] text-[var(--skipo-text)] text-xs px-3 py-2.5 outline-none font-mono" /></div>}
            <div><label className="block text-[11px] font-bold text-[var(--skipo-text-muted)] uppercase tracking-wider mb-1">Email Address or Username</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. developer@example.com" autoComplete="username" required className="w-full bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] focus:border-[var(--skipo-accent)] text-[var(--skipo-text)] text-xs px-3 py-2.5 outline-none font-mono" /></div>
            <div><label className="block text-[11px] font-bold text-[var(--skipo-text-muted)] uppercase tracking-wider mb-1">Password</label><div className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required className="w-full bg-[var(--skipo-bg)] border border-[var(--skipo-border-color)] focus:border-[var(--skipo-accent)] text-[var(--skipo-text)] text-xs px-3 py-2.5 outline-none font-mono pr-10" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-2.5 text-[var(--skipo-text-muted)]">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[var(--skipo-accent)] hover:opacity-90 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000] disabled:opacity-50">
              <LogIn size={14} /> {loading ? 'PROCESSING...' : mode === 'login' ? 'SIGN IN TO WORKSPACE' : 'CREATE ACCOUNT'}
            </button>
          </form>

          {onSwitchToAdmin && <div className="mt-6 pt-4 border-t border-[var(--skipo-border-color)] flex items-center justify-between text-[11px] text-[var(--skipo-text-muted)]"><span>System Administrator?</span><button type="button" onClick={onSwitchToAdmin} className="text-[#D4AF37] hover:underline font-bold flex items-center gap-1">Switch to Admin Portal <ArrowRight size={11} /></button></div>}
        </div>
      </main>
      <footer className="border-t border-[var(--skipo-border-color)] py-2 px-4 text-center text-[10px] text-[var(--skipo-text-muted)]">{footerText || `${appName} WORKSPACE SYSTEM`}</footer>
    </div>
  );
};

export default AuthPage;
