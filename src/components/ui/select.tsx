import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown, Check } from "lucide-react"

interface SelectContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  onValueChange: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error("Select components must be used within a Select provider")
  }
  return context
}

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
  defaultValue?: string
  [key: string]: any
}

export const Select = ({ children, className, value, onValueChange, defaultValue, ...props }: SelectProps) => {
  const [open, setOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value ?? defaultValue ?? "")
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ open, setOpen, value: selectedValue, onValueChange: handleValueChange }}>
      <div ref={ref} className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export interface SelectTriggerProps {
  asChild?: boolean
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const SelectTrigger = ({ className = "", children, ...props }: SelectTriggerProps) => {
  const { open, setOpen, value } = useSelectContext()

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "w-full h-10 flex items-center justify-between border border-slate-200 rounded-lg px-3 text-sm bg-white transition-all duration-200",
        "hover:border-slate-300 hover:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        open && "border-blue-500 ring-2 ring-blue-500/20",
        className
      )}
      {...props}
    >
      <span className={cn("truncate", !value && "text-slate-400")}>
        {children}
      </span>
      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
    </button>
  )
}

export interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const SelectValue = ({ placeholder, children, className, ...props }: SelectValueProps) => {
  const { value } = useSelectContext()
  return (
    <span className={cn("truncate", !value && "text-slate-400", className)} {...props}>
      {children || value || placeholder}
    </span>
  )
}

export interface SelectContentProps {
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const SelectContent = ({ children, className = "", ...props }: SelectContentProps) => {
  const { open } = useSelectContext()

  if (!open) return null

  return (
    <div
      className={cn(
        "absolute z-[100] mt-1 w-full min-w-[200px] border border-slate-200 rounded-lg bg-white shadow-lg overflow-hidden",
        "animate-in fade-in zoom-in-95 duration-150",
        className
      )}
      {...props}
    >
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  )
}

export interface SelectItemProps {
  value?: string
  children?: React.ReactNode
  className?: string
  key?: React.Key
  disabled?: boolean
  [key: string]: any
}

export const SelectItem = ({ children, className = "", value, disabled, ...props }: SelectItemProps) => {
  const { value: selectedValue, onValueChange } = useSelectContext()
  const isSelected = selectedValue === value

  const handleClick = () => {
    if (disabled) return
    onValueChange(value || "")
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors duration-150",
        "hover:bg-slate-50",
        isSelected && "bg-blue-50 text-blue-700",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
    </div>
  )
}