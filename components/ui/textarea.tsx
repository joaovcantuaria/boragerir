import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-xl border px-3 py-2 text-sm resize-none",
      "transition-colors placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26E1D]/30 focus-visible:border-[#F26E1D]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "bg-white border-gray-200 text-gray-900",
      "dark:bg-white/[0.04] dark:border-white/10 dark:text-gray-100",
      className
    )}
    {...props} />
))
Textarea.displayName = "Textarea"

export { Textarea }
