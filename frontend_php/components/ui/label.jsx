'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '@/lib/utils'

function Label({
  className,
  ...props
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]-events-none group-data-[disabled=true]-50 peer-disabled-not-allowed peer-disabled-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
