import React, { FormEvent, useState } from 'react';
import { AlertCircle, Home, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../hooks/useAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginScreen: React.FC = () => {
  const { signIn, accessError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const error = formError || accessError;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      setFormError('Ingresá un correo electrónico válido.');
      return;
    }
    if (!password) {
      setFormError('Ingresá tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await signIn(normalizedEmail, password);
    } catch (cause) {
      setPassword('');
      setFormError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo conectar con el servidor. Intentá nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <Home className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
            GASTOS FAMILIARES
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Acceso personal
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresá con tu cuenta para acceder a Familia Ayestaran.
          </p>
        </div>

        <Card className="rounded-3xl border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-black text-slate-900">
              Iniciar sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {error && (
                <div
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-sm font-semibold">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="auth-email" className="text-sm font-bold text-slate-700">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                    className="h-12 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-blue-500"
                    placeholder="nombre@correo.com"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auth-password" className="text-sm font-bold text-slate-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                    className="h-12 rounded-xl pl-10 focus-visible:ring-2 focus-visible:ring-blue-500"
                    placeholder="Tu contraseña"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl bg-blue-600 font-black hover:bg-blue-700"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-400">
          Acceso exclusivo para usuarios autorizados.
        </p>
      </div>
    </main>
  );
};
