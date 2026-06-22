import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DONADA',
  description: 'Cardano NFTs. Rent. Enter. Win. Prizes paid automatically on-chain.',
  metadataBase: new URL('https://donada.io'),
  openGraph: {
    title: 'DONADA',
    description: 'Cardano NFTs. Rent. Enter. Win. Prizes paid automatically on-chain.',
    url: 'https://donada.io',
    siteName: 'DONADA',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DONADA',
    description: 'Cardano NFTs. Rent. Enter. Win. Prizes paid automatically on-chain.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        {/* beforeInteractive runs before any Next.js/React code — sets data-theme before first paint */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var p=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',s||p);}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
