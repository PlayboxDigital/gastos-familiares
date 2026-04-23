import { Expense } from './types';

export type EstadoVencimiento =
  | 'vencido'
  | 'por_vencer'
  | 'en_plazo'
  | 'pagado';

export const getEstadoVencimiento = (e: Expense): EstadoVencimiento => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diaActual = now.getDate();
  const diaVenc = e.dia_vencimiento;

  const saldo = e.monto - (e.total_abonado ?? 0);
  const pendiente = e.estado_pago !== 'Pagado' && saldo > 0;

  if (!pendiente) return 'pagado';
  
  if (diaVenc === undefined || diaVenc === null) {
    console.log(`[GLOBAL_ESTADO] ITEM_ID: ${e.id} | SIN_VENCIMIENTO | CLASIFICACION: por_vencer`);
    return 'por_vencer';
  }
  
  const status = diaActual >= diaVenc ? 'vencido' : 'por_vencer';
  console.log(`[GLOBAL_ESTADO] ITEM_ID: ${e.id} | DIA_VENC_REAL: ${diaVenc} | DIA_ACTUAL: ${diaActual} | CLASIFICACION: ${status}`);
  
  return status;
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