import { supabase } from '../lib/supabase';
import { CategoryConfig, CategoryInput } from '../types';

export const presupuestosService = {
  async obtenerPresupuestos(): Promise<CategoryConfig[]> {
    const { data, error } = await supabase
      .from('presupuestos_categoria')
      .select('*');
    
    console.log("TABLA:", "presupuestos_categoria")
    console.log("ERROR:", error)
    console.log("ROWS:", Array.isArray(data) ? data.length : null)
    console.log("DATA:", data)
    
    if (error) {
      throw new Error(`Error al obtener presupuestos: ${error.message}`);
    }
    return (data as CategoryConfig[]) || [];
  },

  async guardarPresupuesto(categoria: CategoryConfig | CategoryInput): Promise<void> {
    const { error } = await supabase
      .from('presupuestos_categoria')
      .upsert(categoria, { onConflict: 'categoria' });
    
    if (error) {
      throw new Error(`Error al guardar presupuesto: ${error.message}`);
    }
  }
};
