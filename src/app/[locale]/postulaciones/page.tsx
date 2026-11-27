import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ApplicationsOffice } from '@/components/careers/admin/ApplicationsOffice';
import { CareersAuthGate } from '@/components/careers/admin/CareersAuthGate';
import { isAdminRequest } from '@/lib/careers/auth';

type PageParams = { params: Promise<{ locale: string }>; searchParams: Promise<{ reset?: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CareersAdmin' });

  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

export default async function PostulacionesPage({ params, searchParams }: PageParams) {
  const { locale } = await params;
  const { reset } = await searchParams;
  setRequestLocale(locale);
  const authed = await isAdminRequest();
  return (
    <CareersAuthGate initial={authed ? 'ready' : 'email'} resetToken={reset ?? ''}>
      <ApplicationsOffice />
    </CareersAuthGate>
  );
}
