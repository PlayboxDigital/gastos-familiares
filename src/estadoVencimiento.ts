import { Expense } from './types';

export type EstadoVencimiento =
  | 'vencido'
  | 'por_vencer'
  | 'en_plazo'
  | 'pagado';

export const getEstadoVencimiento = (e: Expense): EstadoVencimiento => {
  const diaActual = new Date().getDate();
  const diaVenc = e.dia_vencimiento ?? 10;

  const saldo = e.monto - (e.total_abonado ?? 0);
  const pendiente = e.estado_pago !== 'Pagado' && saldo > 0;

  if (!pendiente) return 'pagado';
  if (diaActual > diaVenc) return 'vencido';
  if (diaActual >= diaVenc - 3) return 'por_vencer';

  return 'en_plazo';
};

export const getColorVencimiento = (estado: EstadoVencimiento) => {
  switch (estado) {
    case 'vencido':
      return 'text-rose-600 bg-rose-50 border-rose-200';
    case 'por_vencer':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'en_plazo':
      return 'text-slate-600 bg-slate-50 border-slate-200';
    case 'pagado':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  }
};