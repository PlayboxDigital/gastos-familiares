import { supabase } from '../lib/supabase';
import type { ConsumoBaseFormValues, ConsumoBaseItem, ProductoInput, ConsumoBaseInput } from '../types';

const mapToItem = (producto: { id: string; nombre: string; categoria: string; unidad: string; lugar_compra?: string }, consumoBase: { id: string; producto_id: string; cantidad_base: number; duracion_meses: number; prioridad: string }) => ({
  producto_id: producto.id,
  consumo_base_id: consumoBase.id,
  producto: producto.nombre,
  categoria: producto.categoria,
  unidad: producto.unidad,
  lugarCompra: producto.lugar_compra ?? '',
  cantidadBase: consumoBase.cantidad_base,
  duracionMeses: consumoBase.duracion_meses,
  prioridad: consumoBase.prioridad as any,
});

export const consumoInteligenteService = {
  async obtenerConsumoBase(): Promise<ConsumoBaseItem[]> {
    const [productosResult, consumoResult] = await Promise.all([
      supabase.from<ProductoInput>('productos').select('*'),
      supabase.from<ConsumoBaseInput>('consumo_base').select('*'),
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
      unidad: values.unidad,
      lugar_compra: values.lugarCompra,
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
      prioridad: values.prioridad,
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
      unidad: values.unidad,
      lugar_compra: values.lugarCompra,
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
      prioridad: values.prioridad,
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
