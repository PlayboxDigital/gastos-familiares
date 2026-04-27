import * as React from "react"
import { cn } from "../../lib/utils"

export interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
}

export interface TooltipProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface TooltipTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  delayDuration: number
}>({
  open: false,
  setOpen: () => {},
  delayDuration: 300,
})

export function TooltipProvider({ children, delayDuration = 300 }: TooltipProviderProps) {
  const [open, setOpen] = React.useState(false)
  const timeoutRef = React.useRef<number>()

  const handleSetOpen = (newOpen: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (newOpen) {
      timeoutRef.current = window.setTimeout(() => setOpen(true), delayDuration)
    } else {
      setOpen(false)
    }
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <TooltipContext.Provider value={{ open, setOpen: handleSetOpen, delayDuration }}>
      {children}
    </TooltipContext.Provider>
  )
}

export const Tooltip = ({ children }: TooltipProps) => {
  return <>{children}</>
}

export const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(TooltipContext)
    return (
      <button
        ref={ref}
        type="button"
        className={cn(className)}
        onClick={() => context.setOpen(!context.open)}
        onMouseEnter={() => context.setOpen(true)}
        onMouseLeave={() => context.setOpen(false)}
        {...props}
      />
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 4, ...props }, ref) => {
    const context = React.useContext(TooltipContext)
    
    if (!context.open) return null

    return (
      <div
        ref={ref}
        className={cn(
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm shadow-md",
          className
        )}
        {...props}
      />
    )
  }
)
TooltipContent.displayName = "TooltipContent"