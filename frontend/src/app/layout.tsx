import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { Layout } from '@/shared/components/Layout';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'CarbonBox · Procesamiento de documentos',
  description: 'Carga y seguimiento del procesamiento de archivos CSV',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
