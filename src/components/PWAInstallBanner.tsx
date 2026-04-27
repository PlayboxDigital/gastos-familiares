import React from "react"

interface PWAInstallBannerProps {
  open: boolean
  onClose: () => void
  onInstall?: () => void
  isIOS?: boolean
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ open, onClose, onInstall, isIOS }) => {
  if (!open) return null

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-[120] flex justify-center pointer-events-none md:bottom-6 md:right-6 md:left-auto md:w-auto"
      style={{}}
    >
      <div className="pointer-events-auto bg-white/95 border border-slate-200 shadow-xl rounded-xl px-4 py-3 flex flex-col md:flex-row items-center gap-2 max-w-xs md:max-w-sm w-full md:w-auto animate-in fade-in-up duration-200">
        {isIOS ? (
          <>
            <span className="text-sm text-slate-700 font-medium text-center">
              Para instalar: <b>Compartir → Agregar a pantalla de inicio</b>
            </span>
            <button
              className="text-xs text-blue-600 font-semibold mt-1 underline underline-offset-2"
              onClick={onClose}
            >
              Cerrar
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-700 font-medium">¿Quieres instalar la app?</span>
            <div className="flex gap-2 mt-2 md:mt-0">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1 text-xs font-semibold shadow"
                onClick={onInstall}
              >
                Instalar app
              </button>
              <button
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-3 py-1 text-xs font-semibold"
                onClick={onClose}
              >
                Ahora no
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
