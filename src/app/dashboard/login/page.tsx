import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/VStack';
import { LoginForm } from '@/components/dashboard/LoginForm';
import { homeFor } from '@/lib/crm/roles';
import { dashboardSession, googleConfigured } from '@/lib/crm/session';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await dashboardSession();
  if (session) redirect(homeFor(session.role));
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <VStack gap={6}>
        <Heading level={1}>Cluster CRM</Heading>
        <LoginForm initialError={error || ''} />
        {googleConfigured() ? <Link href="/dashboard/auth/google" className="underline">Entrar con Google</Link> : null}
      </VStack>
    </main>
  );
}
