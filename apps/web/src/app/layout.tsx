import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ToastContainer } from '../components/ui/ToastContainer';

export const metadata: Metadata = {
  title: 'Творческое пространство «На Заре»',
  description: 'Творческое пространство «На Заре»',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  manifest: '/manifest.json',
  metadataBase: new URL('https://nazare.ru'),
  openGraph: {
    title: 'Творческое пространство «На Заре»',
    description: 'Творческое пространство «На Заре»',
    url: 'https://nazare.ru',
    siteName: 'На заре',
    locale: 'ru_RU',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
