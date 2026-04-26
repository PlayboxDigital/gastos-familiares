import * as React from "react"

export const Select = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-full">{children}</div>
}

export const SelectTrigger = ({
  className = "",
  children,
}: any) => {
  return (
    <div
      className={`w-full h-10 flex items-center border border-slate-200 rounded-md px-3 text-sm ${className}`}
    >
      {children}
    </div>
  )
}

export const SelectValue = ({ placeholder }: any) => {
  return <span className="text-slate-500">{placeholder}</span>
}

export const SelectContent = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="mt-1 border border-slate-200 rounded-md bg-white shadow-md">
      {children}
    </div>
  )
}

export const SelectItem = ({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) => {
  return (
    <div
      onClick={onClick}
      className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
    >
      {children}
    </div>
  )
}