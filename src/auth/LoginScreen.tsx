import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { Logo } from '@/components/Logo';
import { Button, Field, inputCls } from '@/components/ui';
import { useOnline } from '@/lib/hooks';
import { useAuth } from '@/store/auth';

export function LoginScreen() {
  const signIn = useAuth((s) => s.signIn);
  const online = useOnline();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="scroller h-full px-6" style={{ paddingTop: 'calc(24px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}>
      <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="flex justify-center">
          <Logo className="h-28 w-auto" />
        </motion.div>
        <h1 className="mt-8 text-center text-[34px] font-bold tracking-tight">YP Gym Tracker</h1>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="E-Mail">
            <input
              className={inputCls}
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Passwort">
            <div className="relative">
              <input
                className={`${inputCls} pr-20`}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1 h-10 rounded-lg px-3 text-[13px] font-medium text-mute">
                {show ? 'Verbergen' : 'Zeigen'}
              </button>
            </div>
          </Field>
          {!online && <p className="rounded-xl bg-warm/10 px-4 py-3 text-[14px] text-warm">Du bist offline. Für die erste Anmeldung braucht es einmal Internet.</p>}
          {error && (
            <p role="alert" className="rounded-xl bg-bad/10 px-4 py-3 text-[14px] text-bad">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || !online}>
            {busy ? 'Melde an …' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  );
}
