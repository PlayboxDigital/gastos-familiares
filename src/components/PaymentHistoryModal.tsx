import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Expense, GastoPagoHistorial } from '../types';
import { gastosPagosHistorialService } from '../services/gastosPagosHistorial';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { History as HistoryIcon, Receipt, Calendar, CreditCard, Landmark, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helpers locales para blindaje de fechas
const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
}

// Componente de ítem de historial memoizado para evitar re-renders innecesarios
const HistoryItem = React.memo(({ pago, index, onVerComprobante }: { pago: GastoPagoHistorial, index: number, onVerComprobante: (url: string) => void }) => {
  const formatDate = (dateStr: string) => {
    const date = safeParseDate(dateStr);
    if (!date) return 'N/A';
    return format(date, 'dd MMMM, yyyy', { locale: es });
  };

  const comprobanteUrl = pago.comprobante_transformado_url || pago.comprobante_cloudinary_secure_url || pago.comprobante_cloudinary_url;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group mb-4"
    >
      <div className="absolute top-0 right-0 p-4 max-md:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity">
        {comprobanteUrl && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-[10px] font-black border-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-50 shadow-sm active:scale-95 transition-transform"
            onClick={() => onVerComprobante(comprobanteUrl)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> VER
          </Button>
        )}
      </div>

      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> {formatDate(pago.fecha_pago)}
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
            Período: {format(new Date(pago.periodo_anio, pago.periodo_mes - 1), 'MMMM yyyy', { locale: es })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-slate-900">${pago.monto_pagado.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">PAGADO</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Medio</p>
            <p className="text-xs font-bold text-slate-700">{pago.forma_pago}</p>
          </div>
        </div>
        {(pago.entidad_pago || pago.referencia_pago) && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-xl">
              <Landmark className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Ref</p>
              <p className="text-xs font-bold text-slate-700 truncate max-w-[100px]">
                {pago.entidad_pago}
              </p>
            </div>
          </div>
        )}
      </div>

      {pago.observaciones && (
        <div className="mt-4 p-3 bg-slate-50/10 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-500 italic"><span className="font-bold uppercase not-italic mr-1 text-slate-400">Nota:</span> {pago.observaciones}</p>
        </div>
      )}
    </motion.div>
  );
});

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({ isOpen, onClose, expense }) => {
  const [history, setHistory] = useState<GastoPagoHistorial[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && expense) {
      loadHistory();
    }
  }, [isOpen, expense]);

  const loadHistory = async () => {
    if (!expense) return;
    setLoading(true);
    try {
      const key = expense.servicio_clave || expense.concepto || '';
      const data = await gastosPagosHistorialService.obtenerHistorialPorServicio(key);
      setHistory(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerComprobante = React.useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-md:h-auto max-md:max-h-[90dvh] max-md:p-0 max-md:gap-0 sm:max-w-[550px] overflow-hidden flex flex-col">
        <div className="bg-indigo-600 p-6 text-white shrink-0 pt-10 md:pt-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <HistoryIcon className="w-5 h-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold">Historial de Pagos</DialogTitle>
            </div>
            <DialogDescription className="text-indigo-50 opacity-90 font-medium">
              Pagos anteriores para: {expense.subcategoria}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 modal-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-400">CARGANDO HISTORIAL...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Receipt className="w-8 h-8 text-slate-200" />
              </div>
              <div>
                <p className="text-slate-900 font-bold">Sin registros históricos</p>
                <p className="text-sm text-slate-400">Aún no se han registrado pagos para este servicio.</p>
              </div>
            </div>
          ) : (
            <div className="pb-4">
              <AnimatePresence initial={false}>
                {history.slice(0, 50).map((pago, index) => (
                  <HistoryItem 
                    key={pago.id} 
                    pago={pago} 
                    index={index} 
                    onVerComprobante={handleVerComprobante} 
                  />
                ))}
              </AnimatePresence>
              {history.length > 50 && (
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-4">Mostrando los últimos 50 registros</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-white border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} className="w-full rounded-2xl h-12 text-xs font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest active:scale-95 transition-transform">
            CERRAR HISTORIAL
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
