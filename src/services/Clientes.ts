import { supabase } from '../lib/supabase';
import { Income, IncomeInput, IngresoPago, IngresoPagoInput } from '../types';

export const incomesService = {
  async obtenerIngresos(): Promise<Income[]> {
    const { data, error } = await supabase
      .from('ingresos')
      .select(`
        id,
        created_at,
        cliente,
        cliente_contacto,
        telefono_cliente,
        concepto,
        monto,
        monto_total,
        monto_cobrado,
        monto_mensual,
        monto_mensual_ars,
        moneda,
        estado,
        estado_pago,
        fecha_inicio,
        fecha_vencimiento,
        cliente_enlace,
        logo_url,
        project_url,
        ai_studio_url,
        ai_studio_email,
        supabase_url,
        supabase_email,
        cloudinary_url,
        cloudinary_email,
        vscode_url,
        db_type,
        email_db,
        link_db,
        link_app,
        metodo_pago,
        updated_at
      `)
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(`Error al obtener ingresos: ${error.message}`);
    }

    return (data as Income[]) || [];
  },

  async crearIngreso(ingreso: IncomeInput): Promise<Income> {
    const { data, error } = await supabase
      .from('ingresos')
      .insert(ingreso)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear ingreso: ${error.message}`);
    }

    return data as Income;
  },

  async actualizarIngreso(id: string, ingreso: Partial<IncomeInput>): Promise<Income> {
    const { data, error } = await supabase
      .from('ingresos')
      .update(ingreso)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar ingreso: ${error.message}`);
    }

    return data as Income;
  },

  async eliminarIngreso(id: string): Promise<void> {
    const { error } = await supabase
      .from('ingresos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar ingreso: ${error.message}`);
    }
  },

  async obtenerPagosPorIngreso(ingresoId: string): Promise<IngresoPago[]> {
    const { data, error } = await supabase
      .from('ingresos_pagos')
      .select('*')
      .eq('ingreso_id', ingresoId)
      .order('periodo', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener pagos: ${error.message}`);
    }

    return (data as IngresoPago[]) || [];
  },

  async obtenerTodosLosPagos(): Promise<IngresoPago[]> {
    const { data, error } = await supabase
      .from('ingresos_pagos')
      .select('*')
      .order('periodo', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener todos los pagos: ${error.message}`);
    }

    return (data as IngresoPago[]) || [];
  },

  async registrarPago(pago: IngresoPagoInput): Promise<IngresoPago> {
    console.log("CLIENTES_SERVICE_REGISTRAR_PAGO_INIT:", pago);
    const { data, error } = await supabase
      .from('ingresos_pagos')
      .insert(pago)
      .select()
      .single();

    if (error) {
      console.error("CLIENTES_SERVICE_REGISTRAR_PAGO_ERROR:", error);
      if (error.message.includes('row-level security policy')) {
        throw new Error(`Error de Seguridad (RLS): No tienes permisos para insertar en 'ingresos_pagos'. Por favor, verifica las políticas de Supabase.`);
      }
      throw new Error(`Error al registrar pago: ${error.message}`);
    }

    console.log("CLIENTES_SERVICE_REGISTRAR_PAGO_SUCCESS:", data);
    return data as IngresoPago;
  },

  async actualizarPagoIngreso(id: string, pago: Partial<IngresoPagoInput>): Promise<IngresoPago> {
    const { data, error } = await supabase
      .from('ingresos_pagos')
      .update(pago)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Error al actualizar pago: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Error al actualizar pago: No se encontró el registro o no se pudo retornar el objeto.`);
    }

    return data as IngresoPago;
  },

  async eliminarPagoIngreso(id: string): Promise<void> {
    console.log("CLIENTES_SERVICE_ELIMINAR_PAGO_INIT:", id);
    
    // 1. Antes de borrar: verificar existencia
    const { data: existingPago, error: selectError } = await supabase
      .from('ingresos_pagos')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    console.log("CLIENTES_SERVICE_SELECT_PAGO_BEFORE_DELETE:", { existingPago, selectError });

    if (selectError) {
      throw new Error(`Error al verificar existencia del pago: ${selectError.message}`);
    }

    if (!existingPago) {
      throw new Error("No se encontró el registro de pago para eliminar (ID inexistente).");
    }

    // 2. Borrar con select para confirmar afectación
    const { data, error } = await supabase
      .from('ingresos_pagos')
      .delete()
      .eq('id', id)
      .select();

    console.log("CLIENTES_SERVICE_DELETE_PAGO_RESULT:", { data, error });

    if (error) {
      throw new Error(`Error al eliminar pago: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error("No se pudo eliminar el registro. Puede ser una restricción de seguridad (RLS) o el registro ya no existe.");
    }
  },
};
