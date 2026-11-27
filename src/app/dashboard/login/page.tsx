import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heading } from '@astryxdesign/core/Heading';
import { AuthShell } from '@/components/academia/AuthShell';
import { LoginForm } from '@/components/dashboard/LoginForm';
import { homeFor } from '@/lib/crm/roles';
import { dashboardSession, googleConfigured } from '@/lib/crm/session';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await dashboardSession();
  if (session) redirect(homeFor(session.role));
  const { error } = await searchParams;

  return (
    <AuthShell>
      <Heading level={1} className="academy-section-title">Cluster CRM</Heading>
      <LoginForm initialError={error || ''} />
      {googleConfigured() ? <Link href="/dashboard/auth/google" className="academy-action academy-action-secondary justify-center">Entrar con Google</Link> : null}
    </AuthShell>
  );
}
