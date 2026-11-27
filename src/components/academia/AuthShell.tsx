import type { ReactNode } from 'react';
import Link from 'next/link';
import { VStack } from '@astryxdesign/core/VStack';
import { Cover } from './ui';

type Course = { slug: string; title: string; cover_url: string };

export function AuthShell({ course, children }: { course?: Course | null; children: ReactNode }) {
  return (
    <main className={course ? 'academy-page max-w-6xl' : 'academy-page max-w-xl'}>
      <section className={course ? 'academy-panel grid overflow-hidden lg:grid-cols-5' : 'academy-panel overflow-hidden'}>
        <VStack as="section" gap={6} className={course ? 'min-w-0 p-5 sm:p-8 lg:col-span-3 lg:p-12' : 'min-w-0 p-5 sm:p-8'}>{children}</VStack>
        {course ? (
          <VStack as="aside" gap={8} className="academy-hero order-first p-6 text-white sm:p-8 lg:order-last lg:col-span-2 lg:p-10">
            <Link href={`/academia/${course.slug}`} className="academy-focus flex items-center gap-4 rounded-academy-lg border border-white/15 bg-white/5 p-3 hover:border-white/40">
              <figure className="w-24 shrink-0 overflow-hidden rounded-academy"><Cover url={course.cover_url} title={course.title} slug={course.slug} /></figure>
              <VStack gap={1} className="min-w-0">
                <strong className="break-words font-semibold leading-snug text-white">{course.title}</strong>
              </VStack>
            </Link>
          </VStack>
        ) : null}
      </section>
    </main>
  );
}

export function AuthError({ children, id }: { children: ReactNode; id?: string }) {
  return <p id={id} role="alert" className="rounded-academy border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{children}</p>;
}
