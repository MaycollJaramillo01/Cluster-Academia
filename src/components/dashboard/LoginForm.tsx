'use client';

import { useActionState } from 'react';
import { login } from '@/lib/crm/access';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { VStack } from '@astryxdesign/core/VStack';
import { AcademySubmit } from '@/components/academia/AcademySubmit';

const messages: Record<string, string> = {
  clave: 'El correo o la contraseña no coinciden.',
  corta: 'La contraseña tiene al menos 8 caracteres.',
  setup: 'El correo o la contraseña no coinciden.',
  google: 'Google no completó el ingreso. Intenta de nuevo.',
  config: 'El ingreso con Google no está configurado.',
  lista: 'No hay correos autorizados.',
  state: 'La sesión de Google venció. Intenta de nuevo.',
  vencido: 'Pasaron más de 10 minutos. Vuelve a escribir tu contraseña.',
  cuenta: 'El correo o la contraseña no coinciden.',
};

// El error de la URL llega de Google o de un segundo paso vencido; el de la acción, de este mismo formulario.
export function LoginForm({ initialError }: { initialError: string }) {
  const [state, action] = useActionState(login, { error: initialError, email: '', attempt: 0 });
  const message = state.error ? messages[state.error] || 'No se pudo entrar. Intenta de nuevo.' : '';
  const passwordError = state.error === 'clave' || state.error === 'corta' || state.error === 'setup' || state.error === 'cuenta';

  return (
    <form action={action} className="space-y-5">
      {message ? (
        <p id="login-error" role="alert" className="rounded-academy border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{message}</p>
      ) : null}
      <VStack gap={1}>
        <label htmlFor="email" className="text-sm font-semibold">Correo</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          autoFocus={!state.email}
          defaultValue={state.email}
          key={`email-${state.email}`}
          className="academy-field w-full"
        />
      </VStack>
      <VStack gap={1}>
        <label htmlFor="password" className="text-sm font-semibold">Contraseña</label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={8}
          autoComplete="current-password"
          autoFocus={Boolean(state.email)}
          aria-invalid={passwordError || undefined}
          aria-describedby={passwordError ? 'login-error' : undefined}
          key={`password-${state.attempt}`}
          className={`academy-field t-input w-full ${passwordError ? 'border-red-700 is-shaking' : ''}`}
        />
      </VStack>
      <AcademySubmit pending="Entrando…" label="Entrar" fullWidth />
    </form>
  );
}
