import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClientToaster } from "@/components/client-toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Data Platform",
  description: "No-code API connector and ETL platform",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove browser extension attributes that cause hydration mismatches
              function cleanupExtensionAttributes() {
                const elements = document.querySelectorAll('[bis_skin_checked], [data-bis-*]');
                elements.forEach(el => {
                  el.removeAttribute('bis_skin_checked');
                  // Remove any data-bis-* attributes
                  Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('data-bis-')) {
                      el.removeAttribute(attr.name);
                    }
                  });
                });
              }

              // Run immediately
              cleanupExtensionAttributes();

              // Run on DOMContentLoaded
              document.addEventListener('DOMContentLoaded', cleanupExtensionAttributes);

              // Run periodically to catch late additions
              setInterval(cleanupExtensionAttributes, 1000);
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased`} suppressHydrationWarning={true}>
        <div suppressHydrationWarning={true}>
          {children}
        </div>
        <ClientToaster />
        <Analytics />
      </body>
    </html>
  )
}
