import { supabase } from '../lib/supabase';
import type { ConsumoBase, ConsumoBaseFormValues, ConsumoBaseItem, Producto, ProductoInput, ConsumoBaseInput, ConsumoBasePriority, ConsumoBasePriorityLabel } from '../types';

const PRIORITY_LABELS: Record<ConsumoBasePriority, ConsumoBasePriorityLabel> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const PRIORITY_VALUES: Record<ConsumoBasePriorityLabel, ConsumoBasePriority> = {
  Alta: 'alta',
  Media: 'media',
  Baja: 'baja',
};

const normalizePriorityToLabel = (value: string): ConsumoBasePriorityLabel => {
  const normalizedValue = value?.toString().trim().toLowerCase();

  if (normalizedValue === 'alta') return 'Alta';
  if (normalizedValue === 'media') return 'Media';
  if (normalizedValue === 'baja') return 'Baja';
  if (normalizedValue === 'esencial') return 'Alta';
  if (normalizedValue === 'importante') return 'Media';
  if (normalizedValue === 'prescindible') return 'Baja';

  return 'Media';
};

const normalizePriorityToValue = (value: string): ConsumoBasePriority => {
  const normalizedValue = value?.toString().trim();
  return PRIORITY_VALUES[normalizedValue as ConsumoBasePriorityLabel] ??
    (normalizedValue.toLowerCase() === 'alta' ? 'alta' : normalizedValue.toLowerCase() === 'media' ? 'media' : 'baja');
};

const mapToItem = (
  producto: { id: string; nombre: string; categoria: string; unidad_base: string },
  consumoBase: { id: string; producto_id: string; cantidad_base: number; duracion_meses: number; prioridad: string; lugar_recomendado?: string }
) => ({
  producto_id: producto.id,
  consumo_base_id: consumoBase.id,
  producto: producto.nombre,
  categoria: producto.categoria,
  unidad: producto.unidad_base,
  // El lugar recomendado viene de consumo_base.lugar_recomendado
  lugarCompra: consumoBase.lugar_recomendado ?? '',
  cantidadBase: consumoBase.cantidad_base,
  duracionMeses: consumoBase.duracion_meses,
  prioridad: normalizePriorityToLabel(consumoBase.prioridad),
});

export const consumoInteligenteService = {
  async obtenerProductos(includeInactive = false): Promise<Producto[]> {
    const query = supabase.from<Producto>('productos').select('*').order('nombre', { ascending: true });
    const finalQuery = includeInactive ? query : query.eq('activo', true);

    const { data, error } = await finalQuery;
    if (error) {
      throw new Error(`Error al obtener productos: ${error.message}`);
    }

    return data || [];
  },

  async crearProducto(values: ProductoInput): Promise<Producto> {
    const payload: ProductoInput = {
      ...values,
      activo: values.activo ?? true,
    };

    const { data, error } = await supabase
      .from<ProductoInput>('productos')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al crear producto: ${error?.message || 'Sin datos recibidos.'}`);
    }

    return data;
  },

  async actualizarProducto(productoId: string, values: Partial<ProductoInput>): Promise<Producto> {
    const { data, error } = await supabase
      .from<ProductoInput>('productos')
      .update(values)
      .eq('id', productoId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Error al actualizar producto: ${error?.message || 'Sin datos recibidos.'}`);
    }

    return data;
  },

  async obtenerConsumoBase(): Promise<ConsumoBaseItem[]> {
    const [productosResult, consumoResult] = await Promise.all([
      supabase.from<Producto>('productos').select('*'),
      supabase.from<ConsumoBase>('consumo_base').select('*'),
    ]);

    if (productosResult.error) {
      throw new Error(`Error al obtener productos: ${productosResult.error.message}`);
    }

    if (consumoResult.error) {
      throw new Error(`Error al obtener consumo base: ${consumoResult.error.message}`);
    }

    const productos = productosResult.data || [];
    const consumos = consumoResult.data || [];
    const productoMap = new Map(productos.map((producto) => [producto.id, producto]));

    return consumos
      .map((consumo) => {
        const producto = productoMap.get(consumo.producto_id);
        if (!producto) {
          return null;
        }

        return mapToItem(producto, consumo as any);
      })
      .filter((item): item is ConsumoBaseItem => item !== null)
      .sort((a, b) => a.producto.localeCompare(b.producto));
  },

  async crearProductoYConsumoBase(values: ConsumoBaseFormValues): Promise<ConsumoBaseItem> {
    const productoPayload: ProductoInput = {
      nombre: values.producto,
      categoria: values.categoria,
      unidad_base: values.unidad,
    };

    const { data: producto, error: productoError } = await supabase
      .from<ProductoInput>('productos')
      .insert(productoPayload)
      .select()
      .single();

    if (productoError || !producto) {
      throw new Error(`Error al crear producto: ${productoError?.message || 'Sin datos recibidos.'}`);
    }

    const consumoPayload: ConsumoBaseInput = {
      producto_id: producto.id,
      cantidad_base: values.cantidadBase,
      duracion_meses: values.duracionMeses,
      prioridad: normalizePriorityToValue(values.prioridad),
      lugar_recomendado: values.lugarCompra,
    };

    const { data: consumoBase, error: consumoError } = await supabase
      .from<ConsumoBaseInput>('consumo_base')
      .insert(consumoPayload)
      .select()
      .single();

    if (consumoError || !consumoBase) {
      throw new Error(`Error al crear consumo base: ${consumoError?.message || 'Sin datos recibidos.'}`);
    }

    return mapToItem(producto, consumoBase as any);
  },

  async actualizarProductoYConsumoBase(productoId: string, consumoBaseId: string, values: ConsumoBaseFormValues): Promise<ConsumoBaseItem> {
    const productoPayload: Partial<ProductoInput> = {
      nombre: values.producto,
      categoria: values.categoria,
      unidad_base: values.unidad,
    };

    const { data: producto, error: productoError } = await supabase
      .from<ProductoInput>('productos')
      .update(productoPayload)
      .eq('id', productoId)
      .select()
      .single();

    if (productoError || !producto) {
      throw new Error(`Error al actualizar producto: ${productoError?.message || 'Sin datos recibidos.'}`);
    }

    const consumoPayload: Partial<ConsumoBaseInput> = {
      cantidad_base: values.cantidadBase,
      duracion_meses: values.duracionMeses,
      prioridad: normalizePriorityToValue(values.prioridad),
      lugar_recomendado: values.lugarCompra,
    };

    const { data: consumoBase, error: consumoError } = await supabase
      .from<ConsumoBaseInput>('consumo_base')
      .update(consumoPayload)
      .eq('id', consumoBaseId)
      .select()
      .single();

    if (consumoError || !consumoBase) {
      throw new Error(`Error al actualizar consumo base: ${consumoError?.message || 'Sin datos recibidos.'}`);
    }

    return mapToItem(producto, consumoBase as any);
  },

  async eliminarProducto(productoId: string): Promise<void> {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', productoId);

    if (error) {
      throw new Error(`Error al eliminar producto: ${error.message}`);
    }
  },
};
