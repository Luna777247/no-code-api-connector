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
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 ${className}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        {(title || showBackButton || headerActions) && (
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {showBackButton && <BackToHomeButton />}
                <div>
                  {title && (
                    <h1 className="text-3xl font-bold tracking-tight text-balance">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="mt-2 text-muted-foreground text-pretty">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              {headerActions && (
                <div className="flex items-center gap-2">
                  {headerActions}
                </div>
              )}
            </div>
          </header>
        )}

        {/* Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}
