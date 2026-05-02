import { supabase } from '../lib/supabase';
import { Auto, AutoInput, AutoMovimiento, AutoMovimientoInput, AutoTarea, AutoTareaInput } from '../types';

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

  // Tareas (Cosas a reparar)
  async obtenerTareas(auto_id: string): Promise<AutoTarea[]> {
    const { data, error } = await supabase
      .from('auto_tareas')
      .select('*')
      .eq('auto_id', auto_id)
      .order('prioridad', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      // Si la tabla no existe aún, retornar array vacío
      console.warn(`Tabla auto_tareas no disponible: ${error.message}`);
      return [];
    }

    return (data as AutoTarea[]) || [];
  },

  async crearTarea(tarea: AutoTareaInput): Promise<AutoTarea> {
    const { data, error } = await supabase
      .from('auto_tareas')
      .insert(tarea)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear tarea del auto: ${error.message}`);
    }

    return data as AutoTarea;
  },

  async actualizarTarea(id: string, actualización: Partial<AutoTareaInput>): Promise<AutoTarea> {
    const { data, error } = await supabase
      .from('auto_tareas')
      .update(actualización)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar tarea: ${error.message}`);
    }

    return data as AutoTarea;
  },

  async eliminarTarea(id: string): Promise<void> {
    const { error } = await supabase
      .from('auto_tareas')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar tarea: ${error.message}`);
    }
  },
};
