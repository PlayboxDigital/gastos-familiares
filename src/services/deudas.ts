import { supabase } from '../lib/supabase';
import { Debt, DebtInput } from '../types';

export const deudasService = {
  async obtenerDeudas(): Promise<Debt[]> {
    const { data, error } = await supabase
      .from('deudas')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener deudas: ${error.message}`);
    }

    return (data as Debt[]) || [];
  },

  async crearDeuda(deuda: DebtInput): Promise<Debt> {
    const { data, error } = await supabase
      .from('deudas')
      .insert(deuda)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear deuda: ${error.message}`);
    }

    return data as Debt;
  },

  async actualizarDeuda(id: string, deuda: Partial<DebtInput>): Promise<Debt> {
    const { data, error } = await supabase
      .from('deudas')
      .update(deuda)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar deuda: ${error.message}`);
    }

    return data as Debt;
  },

  async eliminarDeuda(id: string): Promise<void> {
    console.log("DEUDAS_SERVICE_ELIMINAR_INICIO_ID:", id);
    const { error } = await supabase
      .from('deudas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("DEUDAS_SERVICE_ELIMINAR_ERROR:", error);
      throw new Error(`Error al eliminar deuda: ${error.message}`);
    }
    console.log("DEUDAS_SERVICE_ELIMINAR_EXITO_ID:", id);
  },
};
