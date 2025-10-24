import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file-foreground placeholder-muted-foreground selection-primary selection-primary-foreground dark-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file-flex file-7 file-0 file-transparent file-sm file-medium disabled-events-none disabled-not-allowed disabled-50 md-sm',
        'focus-visible-ring focus-visible-ring/50 focus-visible-[3px]',
        'aria-invalid-destructive/20 dark-invalid-destructive/40 aria-invalid-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
