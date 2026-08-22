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

  /**
   * Nueva implementación atómica que delega en la RPC `public.registrar_pago_por_periodo`.
   * Mantener la firma compatible con `GastoPagoHistorialInput`.
   * No realiza select/update/insert desde el cliente; la lógica de acumulación y conflicto
   * debe resolverse en la RPC en la base de datos.
   */
  async registrarPagoPorPeriodoAtomic(pago: GastoPagoHistorialInput): Promise<GastoPagoHistorial> {
    // Mapear campos del payload a los parámetros de la RPC (p_*)
    const params: any = {
      p_gasto_id: pago.gasto_id,
      p_periodo_anio: pago.periodo_anio,
      p_periodo_mes: pago.periodo_mes,
      p_fecha_pago: pago.fecha_pago,
      p_monto_pagado: pago.monto_pagado,
      p_moneda: pago.moneda,
      p_forma_pago: pago.forma_pago,
      p_servicio_clave: pago.servicio_clave,
      p_entidad_pago: pago.entidad_pago || null,
      p_referencia_pago: pago.referencia_pago || null,
      p_titular_medio_pago: (pago as any).titular_medio_pago || null,
      p_cuotas: (pago as any).cuotas || null,
      p_observaciones: pago.observaciones || null,
      // Cloudinary fields (si están presentes)
      p_comprobante_nombre_original: (pago as any).comprobante_nombre_original || null,
      p_comprobante_cloudinary_public_id: (pago as any).comprobante_cloudinary_public_id || null,
      p_comprobante_cloudinary_url: (pago as any).comprobante_cloudinary_url || null,
      p_comprobante_cloudinary_secure_url: (pago as any).comprobante_cloudinary_secure_url || null,
      p_comprobante_cloudinary_resource_type: (pago as any).comprobante_cloudinary_resource_type || null,
      p_comprobante_cloudinary_format: (pago as any).comprobante_cloudinary_format || null,
      p_comprobante_cloudinary_bytes: (pago as any).comprobante_cloudinary_bytes || null,
      p_comprobante_cloudinary_width: (pago as any).comprobante_cloudinary_width || null,
      p_comprobante_cloudinary_height: (pago as any).comprobante_cloudinary_height || null,
      p_comprobante_transformado_url: (pago as any).comprobante_transformado_url || null,
      p_comprobante_hash: (pago as any).comprobante_hash || null,
    };

    // Llamada a la RPC
    const { data, error } = await supabase.rpc('registrar_pago_por_periodo', params);
    if (error) {
      console.error('ERROR RPC registrar_pago_por_periodo:', error);
      throw new Error(`Error en RPC registrar_pago_por_periodo: ${error.message}`);
    }

    // Supabase puede devolver objeto o array; normalizamos
    if (Array.isArray(data)) {
      if (data.length === 0) throw new Error('RPC registrar_pago_por_periodo devolvió array vacío');
      return data[0] as GastoPagoHistorial;
    }

    return data as GastoPagoHistorial;
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
