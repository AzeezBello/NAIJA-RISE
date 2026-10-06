import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NAIJA RISE — Lagos',
  description: 'Build your life. Build your empire. Survive the city. An original Lagos open-world life simulation.',
  manifest: '/manifest.webmanifest',
  applicationName: 'NAIJA RISE',
  openGraph: { title: 'NAIJA RISE — Lagos', description: 'Build your life. Build your empire. Survive the city.', type: 'website' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'NAIJA RISE' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#07100e' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&family=Permanent+Marker&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
