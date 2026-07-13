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

  async registrarOActualizarPagoPorPeriodo(pago: GastoPagoHistorialInput): Promise<GastoPagoHistorial> {
    // Buscar por gasto_id + periodo para evitar duplicados por período
    const query = supabase.from('gastos_pagos_historial').select('*').eq('gasto_id', pago.gasto_id).eq('periodo_anio', pago.periodo_anio).eq('periodo_mes', pago.periodo_mes);

    const { data: existing, error: selectError } = await query.maybeSingle();
    if (selectError) {
      console.error('ERROR verificando pago existente en historial:', selectError);
      throw new Error(`Error al verificar pago existente: ${selectError.message}`);
    }

    if (existing) {
      // Acumular el monto_pagado para soportar pagos parciales sucesivos
      const acumulado = Number(existing.monto_pagado || 0) + Number(pago.monto_pagado || 0);
      const payload = { ...pago, monto_pagado: acumulado };

      const { data, error } = await supabase
        .from('gastos_pagos_historial')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('ERROR actualizando pago existente en historial:', error);
        throw new Error(`Error al actualizar pago existente: ${error.message}`);
      }

      return data as GastoPagoHistorial;
    }

    return this.crearPagoHistorial(pago);
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
  },

  async actualizarGastoIdEnPagos(viejoGastoId: string, nuevoGastoId: string): Promise<void> {
    const { error } = await supabase
      .from('gastos_pagos_historial')
      .update({ gasto_id: nuevoGastoId })
      .eq('gasto_id', viejoGastoId);
    
    if (error) {
      throw new Error(`Error al traspasar pagos: ${error.message}`);
    }
  }
};
