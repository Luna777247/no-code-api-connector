import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
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
        {/*
          Synchronous, safe cleanup to remove attributes injected by browser
          extensions (eg. bis_skin_checked, bis_register, data-bis-*, __processed_*)
          before React hydrates. Avoids invalid CSS/selectors like `[data-bis-*]`.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var els = document.getElementsByTagName('*');
                  for (var i = 0; i < els.length; i++) {
                    var el = els[i];
                    // collect names to remove to avoid mutating NamedNodeMap while iterating
                    var toRemove = [];
                    for (var j = 0; j < el.attributes.length; j++) {
                      var name = el.attributes[j].name;
                      if (
                        name === 'bis_skin_checked' ||
                        name === 'bis_register' ||
                        name.indexOf('data-bis-') === 0 ||
                        name.indexOf('__processed_') === 0
                      ) {
                        toRemove.push(name);
                      }
                    }
                    for (var k = 0; k < toRemove.length; k++) {
                      try { el.removeAttribute(toRemove[k]); } catch(e) {}
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <div>
          {children}
        </div>
        <ClientToaster />
      </body>
    </html>
  )
}
