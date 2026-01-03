import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Providers } from '@/lib/providers';
import { seedDatabase } from '@/lib/seed';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://taskello.app'),
  title: 'Time Tracking for Freelancers | Calm Proof of Work',
  description:
    'Estimate tasks, track actual time, and share clean proof of work. Taskello is for freelancers & solo developers. One-time lifetime purchase.',
  icons: {
    icon: '/brand/icon.ico',
  },
  openGraph: {
    title: 'Time Tracking for Freelancers | Calm Proof of Work',
    description:
      'Estimate tasks, track actual time, and share clean proof of work. Taskello is for freelancers & solo developers. One-time lifetime purchase.',
    url: 'https://taskello.app',
    siteName: 'Taskello',
    type: 'website',
    images: [
      {
        url: '/brand/taskello-logo.svg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Time Tracking for Freelancers | Calm Proof of Work',
    description:
      'Estimate tasks, track actual time, and share clean proof of work. Taskello is for freelancers & solo developers. One-time lifetime purchase.',
    images: [
      {
        url: '/brand/taskello-logo.svg',
      },
    ],
  },
};

seedDatabase().catch(console.error);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Taskello',
        applicationCategory: 'ProductivityApplication',
        operatingSystem: 'Web',
        url: 'https://taskello.app/',
        description:
          'Taskello helps freelancers and solo developers estimate tasks, track actual time, and share proof of work without distractions.',
        offers: {
          '@type': 'Offer',
          price: '25.00',
          priceCurrency: 'USD',
          url: 'https://taskello.app/#pricing',
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'Product',
        name: 'Taskello Lifetime Access',
        brand: { '@type': 'Brand', name: 'Taskello' },
        url: 'https://taskello.app/#pricing',
        description:
          'One-time lifetime purchase for Taskello: calm time tracking and estimation vs actual for independent work.',
        offers: {
          '@type': 'Offer',
          price: '25.00',
          priceCurrency: 'USD',
          url: 'https://taskello.app/#pricing',
          availability: 'https://schema.org/InStock',
        },
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-VCV9SWQFG4" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-VCV9SWQFG4');`}
        </Script>
        <script
          id="taskello-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
