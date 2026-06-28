import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Ma Pêche — Zones de pêche Wallonie',
  description:
    'Carte interactive officielle des zones de pêche en Wallonie. Consultez les règles par zone, saison, espèces autorisées, pêche de jour et de nuit.',
  applicationName: 'Ma Pêche',
  authors: [{ name: 'opencode' }],
  keywords: ['pêche', 'Wallonie', 'pêche Wallonie', 'carte pêche', 'zones de pêche', 'permis de pêche', 'Meuse'],
  icons: {
    icon: [
      { url: '/ma_peche.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/ma_peche.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#101820',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ma-peche-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background font-sans antialiased" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
