import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from '@/components/auth'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Warboard',
  description: 'Warhammer 40k army list builder and game state tracker',
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Warboard',
  },
  icons: {
    icon: '/icons/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} text-white min-h-screen`}>
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
