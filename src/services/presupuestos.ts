import { supabase } from '../lib/supabase';
import { CategoryConfig, CategoryInput } from '../types';

export const presupuestosService = {
  async obtenerPresupuestos(): Promise<CategoryConfig[]> {
    const { data, error } = await supabase
      .from('presupuestos_categoria')
      .select('*');
    
    if (error) {
      throw new Error(`Error al obtener presupuestos: ${error.message}`);
    }
    return (data as CategoryConfig[]) || [];
  },

  async guardarPresupuesto(categoria: CategoryConfig | CategoryInput): Promise<void> {
    const { error } = await supabase
      .from('presupuestos_categoria')
      .upsert(categoria);
    
    if (error) {
      throw new Error(`Error al guardar presupuesto: ${error.message}`);
    }
  }
};
