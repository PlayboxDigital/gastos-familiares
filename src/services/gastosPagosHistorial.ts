import { supabase } from '../lib/supabase';
import { GastoPagoHistorial, GastoPagoHistorialInput } from '../types';

export const gastosPagosHistorialService = {
  async obtenerHistorialPorServicio(servicioClave: string): Promise<GastoPagoHistorial[]> {
    const { data, error } = await supabase
      .from('gastos_pagos_historial')
      .select('*')
      .eq('servicio_clave', servicioClave)
      .order('fecha_pago', { ascending: false });
    
    if (error) {
      throw new Error(`Error al obtener historial del servicio: ${error.message}`);
    }
    return (data as GastoPagoHistorial[]) || [];
  },

  async obtenerTodoElHistorial(): Promise<GastoPagoHistorial[]> {
    const { data, error } = await supabase
      .from('gastos_pagos_historial')
      .select('*')
      .order('fecha_pago', { ascending: false });
    
    console.log("TABLA:", "gastos_pagos_historial")
    console.log("ERROR:", error)
    console.log("ROWS:", Array.isArray(data) ? data.length : null)
    console.log("DATA:", data)

    if (error) {
      throw new Error(`Error al obtener historial de pagos: ${error.message}`);
    }
    return (data as GastoPagoHistorial[]) || [];
  },

  async crearPagoHistorial(pago: GastoPagoHistorialInput): Promise<GastoPagoHistorial> {
    // Sanitización preventiva: asegurar que no se envíen NaNs a la base
    const payload = {
      ...pago,
      periodo_anio: isNaN(pago.periodo_anio) ? new Date().getFullYear() : pago.periodo_anio,
      periodo_mes: isNaN(pago.periodo_mes) ? new Date().getMonth() + 1 : pago.periodo_mes,
      monto_pagado: isNaN(pago.monto_pagado) ? 0 : pago.monto_pagado,
    };

    const { data, error } = await supabase
      .from('gastos_pagos_historial')
      .insert([payload]) // Usar array para mayor compatibilidad
      .select();
    
    if (error) {
      console.error('❌ Error de Supabase al insertar pago:', error);
      throw new Error(`Error al registrar pago en historial [${error.code}]: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('⚠️ Inserción exitosa pero no se devolvieron datos (posible RLS o Trigger rollback)');
      throw new Error('No se pudo verificar la creación del registro de pago.');
    }

    return data[0] as GastoPagoHistorial;
  },

  async eliminarPagoHistorial(pagoId: string): Promise<void> {
    const { error } = await supabase
      .from('gastos_pagos_historial')
      .delete()
      .eq('id', pagoId);

    if (error) {
      throw new Error(`Error al eliminar registro del historial: ${error.message}`);
    }
  },

  async obtenerHistorialPorGasto(gastoId: string): Promise<GastoPagoHistorial[]> {
    const { data, error } = await supabase
      .from('gastos_pagos_historial')
      .select('*')
      .eq('gasto_id', gastoId)
      .order('fecha_pago', { ascending: false });
    
    if (error) {
      throw new Error(`Error al obtener historial del gasto: ${error.message}`);
    }
    return (data as GastoPagoHistorial[]) || [];
  }
};
