import type { ReactNode } from 'react';
import { AcademyTheme } from '@/components/academia/AcademySurface';

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AcademyTheme className="min-h-dvh justify-center">{children}</AcademyTheme>;
}
