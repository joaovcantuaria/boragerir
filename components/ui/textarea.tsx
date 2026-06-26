import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground resize-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Cores explícitas
        "bg-white text-gray-900 border-gray-300",
        "dark:bg-[#252525] dark:text-gray-100 dark:border-white/15",
        className
      )}
      {...props} />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
