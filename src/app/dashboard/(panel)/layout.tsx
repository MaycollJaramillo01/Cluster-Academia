import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { dashboardSession } from '@/lib/crm/session';
import { sidebarCounts } from '@/lib/crm/queries';
import { KeepFormData } from '@/components/dashboard/KeepFormData';
import { Setup, safeDbError } from '@/components/dashboard/Setup';
import { Shell } from '@/components/dashboard/Shell';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await dashboardSession();
  if (!session) redirect('/dashboard/login');

  try {
    const counts = await sidebarCounts();
    return (
      <Suspense fallback={<p className="p-8 font-mono text-xs uppercase tracking-[0.16em] text-black/40">Cargando</p>}>
        <KeepFormData />
        <Shell counts={counts} openAccess={false} role={session.role}>
          {children}
        </Shell>
      </Suspense>
    );
  } catch (error) {
    return <Setup detail={safeDbError(error)} />;
  }
}
