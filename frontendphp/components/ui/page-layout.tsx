'use client'

import { ReactNode } from 'react'
import { BackToHomeButton } from '@/components/ui/back-to-home-button'

interface PageLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  showBackButton?: boolean
  headerActions?: ReactNode
  className?: string
}

export function PageLayout({
  children,
  title,
  description,
  showBackButton = false,
  headerActions,
  className = ''
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 ${className}`} suppressHydrationWarning={true}>
      <div className="container mx-auto px-4 py-8" suppressHydrationWarning={true}>
        {/* Header */}
        {(title || showBackButton || headerActions) && (
          <header className="mb-8" suppressHydrationWarning={true}>
            <div className="flex items-center justify-between" suppressHydrationWarning={true}>
              <div className="flex items-center gap-4" suppressHydrationWarning={true}>
                {showBackButton && <BackToHomeButton />}
                <div suppressHydrationWarning={true}>
                  {title && (
                    <h1 className="text-3xl font-bold tracking-tight text-balance" suppressHydrationWarning={true}>
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="mt-2 text-muted-foreground text-pretty" suppressHydrationWarning={true}>
                      {description}
                    </p>
                  )}
                </div>
              </div>
              {headerActions && (
                <div className="flex items-center gap-2" suppressHydrationWarning={true}>
                  {headerActions}
                </div>
              )}
            </div>
          </header>
        )}

        {/* Content */}
        <main suppressHydrationWarning={true}>
          {children}
        </main>
      </div>
    </div>
  )
}
