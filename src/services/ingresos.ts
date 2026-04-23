import { supabase } from '../lib/supabase';
import { Income, IncomeInput } from '../types';

export const incomesService = {
  async obtenerIngresos(): Promise<Income[]> {
    const { data, error } = await supabase
      .from('ingresos')
      .select('*')
      .order('fecha', { ascending: false });

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
};
