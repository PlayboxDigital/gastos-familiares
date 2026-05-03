import { supabase } from '../lib/supabase';
import { CLMProspecto, CLMProspectoInput, CLMProspectoUpdate } from '../types';

export const clmProspectosService = {
  async obtenerProspectos(): Promise<CLMProspecto[]> {
    const { data, error } = await supabase
      .from('clm_prospectos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener prospectos: ${error.message}`);
    }

    return (data as CLMProspecto[]) || [];
  },

  async crearProspecto(prospecto: CLMProspectoInput): Promise<CLMProspecto> {
    const { data, error } = await supabase
      .from('clm_prospectos')
      .insert(prospecto)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear prospecto: ${error.message}`);
    }

    return data as CLMProspecto;
  },

  async actualizarProspecto(
    id: string,
    actualizar: CLMProspectoUpdate
  ): Promise<CLMProspecto> {
    const { data, error } = await supabase
      .from('clm_prospectos')
      .update(actualizar)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar prospecto: ${error.message}`);
    }

    return data as CLMProspecto;
  },

  async eliminarProspecto(id: string): Promise<void> {
    const { error } = await supabase
      .from('clm_prospectos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar prospecto: ${error.message}`);
    }
  },

  async marcarContactado(
    id: string,
    contactadoPor: string,
    fechaContacto: string
  ): Promise<CLMProspecto> {
    return this.actualizarProspecto(id, {
      estado: 'contactado',
      contactado_por: contactadoPor,
      fecha_contacto: fechaContacto,
    });
  },
};
