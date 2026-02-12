import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

import GoogleTagManager from '@/components/GoogleTagManager';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Hunggree - Premium Digital Menus & WhatsApp Ordering',
  description: 'Boost your restaurant revenue with elite digital menus. Enable direct WhatsApp orders and luxury guest experiences.',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID || ''} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
