import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@/styles/globals.css';
import { Layout } from '@/shared/components/Layout';
import { themeScript } from '@/shared/theme/theme-script';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CarbonBox · Captura de datos',
  description: 'Carga de datos de actividad en CSV y seguimiento de su procesamiento',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
