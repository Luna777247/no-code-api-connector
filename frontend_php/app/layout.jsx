import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from "@/components/ui/sonner"
import './globals.css'

export const metadata = {
  title: 'no-code-api-connector',
  description: 'No-code API connector and ETL platform',
  generator: 'Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body 
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning={true}
      >
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
