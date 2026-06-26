import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref}
    className={cn(
      "flex h-10 w-full rounded-xl border px-3 py-2 text-sm",
      "transition-colors placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26E1D]/30 focus-visible:border-[#F26E1D]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      // Light
      "bg-white border-gray-200 text-gray-900",
      // Dark
      "dark:bg-white/[0.04] dark:border-white/10 dark:text-gray-100",
      className
    )}
    {...props} />
))
Input.displayName = "Input"

export { Input }
