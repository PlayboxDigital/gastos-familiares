import { supabase } from '../lib/supabase';
import { Auto, AutoInput, AutoMovimiento, AutoMovimientoInput } from '../types';

export const autosService = {
  async obtenerAutos(): Promise<Auto[]> {
    const { data, error } = await supabase
      .from('autos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`Error al obtener autos: ${error.message}`);
    }

    return (data as Auto[]) || [];
  },

  async crearAuto(auto: AutoInput): Promise<Auto> {
    const { data, error } = await supabase
      .from('autos')
      .insert(auto)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear auto: ${error.message}`);
    }

    return data as Auto;
  },

  async eliminarAuto(id: string): Promise<void> {
    const { error } = await supabase
      .from('autos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar auto: ${error.message}`);
    }
  },

  async obtenerMovimientos(auto_id: string): Promise<AutoMovimiento[]> {
    const { data, error } = await supabase
      .from('auto_movimientos')
      .select('*')
      .eq('auto_id', auto_id)
      .order('fecha', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener movimientos del auto: ${error.message}`);
    }

    return (data as AutoMovimiento[]) || [];
  },

  async crearMovimiento(movimiento: AutoMovimientoInput): Promise<AutoMovimiento> {
    const { data, error } = await supabase
      .from('auto_movimientos')
      .insert(movimiento)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear movimiento del auto: ${error.message}`);
    }

    return data as AutoMovimiento;
  },
};
