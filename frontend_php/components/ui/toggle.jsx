'use client'

import * as React from 'react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover-muted hover-muted-foreground disabled-events-none disabled-50 data-[state=on]-accent data-[state=on]-accent-foreground [&_svg]-events-none [&_svg([class*='size-'])]-4 [&_svg]-0 focus-visible-ring focus-visible-ring/50 focus-visible-[3px] outline-none transition-[color,box-shadow] aria-invalid-destructive/20 dark-invalid-destructive/40 aria-invalid-destructive whitespace-nowrap",
  {
    variants
      variant
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent shadow-xs hover-accent hover-accent-foreground',
      },
      size
        default: 'h-9 px-2 min-w-9',
        sm: 'h-8 px-1.5 min-w-8',
        lg: 'h-10 px-2.5 min-w-10',
      },
    },
    defaultVariants
      variant: 'default',
      size: 'default',
    },
  },
)

function Toggle({
  className,
  variant,
  size,
  ...props
}&
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
