import React, { useId, useMemo, useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { defineFrnlComponent } from '@ultrst-armada/frnlts';
import { useFrnlComponent } from '@ultrst-armada/frnlts/react';
import { useFloksFrnlStore } from '../../frnl/store.js';
import { frnlButton } from '../../frnl/frnlButton.js';
import { frnlTextInput } from '../../frnl/frnlTextInput.js';

export interface AuthResult { success: boolean; error?: string; user?: unknown; token?: string; }
export interface AuthPageProps {
  appName?: string;
  appSubtitle?: string;
  footerText?: string;
  onLogin: (email: string, password: string) => Promise<AuthResult>;
  onRegister: (input: { name: string; email: string; password: string }) => Promise<AuthResult>;
  onSuccess?: (result: AuthResult) => void;
  onSwitchToAdmin?: () => void;
}

export const authPageDefinition = defineFrnlComponent({
  name: 'AuthPage',
  states: {
    idle: { name: 'idle', events: { login: { functionId: 'AuthPage.idle.login' }, register: { functionId: 'AuthPage.idle.register' } }, visualParameters: {}, phases: { sustainPhase: { visualDefinition: { parameters: {} } } } },
    loading: { name: 'loading', events: {}, visualParameters: { opacity: 0.75 }, phases: { sustainPhase: { visualDefinition: { parameters: {} } } } },
    error: { name: 'error', events: { retry: { functionId: 'AuthPage.error.retry' } }, visualParameters: {}, phases: { sustainPhase: { visualDefinition: { parameters: {} } } } },
  },
});

export const AuthPage: React.FC<AuthPageProps> = ({
  appName = 'SKIPO',
  appSubtitle = 'WORKSPACE',
  footerText,
  onLogin,
  onRegister,
  onSuccess,
  onSwitchToAdmin,
}) => {
  const store = useFloksFrnlStore();
  const generated = useId().replace(/[:/]/g, '');
  const componentId = `AuthPage.${generated}`;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handlers = useMemo(() => ({
    'AuthPage.idle.login': () => {},
    'AuthPage.idle.register': () => {},
    'AuthPage.error.retry': () => setError(null),
  }), []);
  const frnl = useFrnlComponent({
    id: componentId,
    definition: authPageDefinition,
    store,
    state: error ? 'error' : loading ? 'loading' : 'idle',
    properties: { mode, appName },
    handlers,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return setError('Email address is required.');
    if (!password) return setError('Password is required.');
    if (mode === 'register' && !name.trim()) return setError('Display name is required.');
    setLoading(true); setError(null);
    try {
      const result = mode === 'login'
        ? await onLogin(cleanEmail, password)
        : await onRegister({ name: name.trim(), email: cleanEmail, password });
      if (!result.success) throw new Error(result.error || 'Authentication failed.');
      onSuccess?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={componentId} data-frnl-component="AuthPage" data-frnl-state={frnl.state} className="min-h-screen w-full bg-[var(--skipo-bg)] text-[var(--skipo-text)] font-mono flex flex-col justify-between">
      <header className="border-b-2 border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-[var(--skipo-accent)] text-black font-black flex items-center justify-center">▲</div><div><span className="text-sm font-black uppercase">{appName}</span><span className="ml-2 text-[10px] text-[var(--skipo-text-muted)]">{appSubtitle}</span></div></div>
        {onSwitchToAdmin && <button type="button" onClick={onSwitchToAdmin} className="px-3 py-1.5 text-[10px] font-black border-2 border-[var(--skipo-accent)] text-[var(--skipo-accent)] flex items-center gap-1.5"><Shield size={13} /> ADMIN <ArrowRight size={13} /></button>}
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md border-2 border-[var(--skipo-border-color)] bg-[var(--skipo-surface)] shadow-[6px_6px_0px_var(--skipo-border-color)] p-6">
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button type="button" onClick={() => { setMode('login'); setError(null); }} className={`py-2 text-[10px] font-black border ${mode === 'login' ? 'bg-[var(--skipo-accent)] text-black' : 'bg-[var(--skipo-bg)]'}`}><LogIn size={13} className="inline mr-1" /> SIGN IN</button>
            <button type="button" onClick={() => { setMode('register'); setError(null); }} className={`py-2 text-[10px] font-black border ${mode === 'register' ? 'bg-[var(--skipo-accent)] text-black' : 'bg-[var(--skipo-bg)]'}`}><UserPlus size={13} className="inline mr-1" /> CREATE ACCOUNT</button>
          </div>
          {error && <div className="mb-4 p-3 border-2 border-red-500/80 bg-red-950/30 text-red-300 text-xs flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && React.createElement(frnlTextInput, { id: componentId + '.name', label: 'Full Name', value: name, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value) })}
            {React.createElement(frnlTextInput, { id: componentId + '.email', label: 'Email Address', value: email, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), type: 'email', autoComplete: 'username' })}
            <div>
              {React.createElement(frnlTextInput, { id: componentId + '.password', label: 'Password', value: password, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), type: showPassword ? 'text' : 'password', autoComplete: mode === 'login' ? 'current-password' : 'new-password', trailingIcon: <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={13} /> : <Eye size={13} />}</button> })}
            </div>
            {React.createElement(frnlButton, { type: 'submit', disabled: loading, loading, variant: 'accent', size: 'lg', className: 'w-full', icon: <ArrowRight size={13} /> }, mode === 'login' ? 'SIGN IN TO WORKSPACE' : 'CREATE ACCOUNT')}
          </form>
          <p className="mt-5 pt-3 border-t border-[var(--skipo-border-color)] text-center text-[10px] text-[var(--skipo-text-muted)]">{footerText || `${appName} WORKSPACE SYSTEM`}</p>
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
