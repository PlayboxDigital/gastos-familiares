import * as React from "react"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const Select = ({ children, ...props }: SelectProps) => {
  return <div className="w-full" {...props}>{children}</div>
}

export interface SelectTriggerProps {
  asChild?: boolean
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const SelectTrigger = ({
  className = "",
  children,
  ...props
}: SelectTriggerProps) => {
  return (
    <div
      className={`w-full h-10 flex items-center border border-slate-200 rounded-md px-3 text-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const SelectValue = ({ placeholder, children, ...props }: SelectValueProps) => {
  return <span className="text-slate-500" {...props}>{children || placeholder}</span>
}

export interface SelectContentProps {
  children?: React.ReactNode
  className?: string
  [key: string]: any
}

export const SelectContent = ({
  children,
  className = "",
  ...props
}: SelectContentProps) => {
  return (
    <div className={`mt-1 border border-slate-200 rounded-md bg-white shadow-md ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface SelectItemProps {
  value?: string
  onClick?: () => void
  children?: React.ReactNode
  className?: string
  key?: React.Key
  [key: string]: any
}

export const SelectItem = ({
  children,
  className = "",
  value,
  onClick,
  ...props
}: SelectItemProps) => {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}