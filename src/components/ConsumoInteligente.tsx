import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Package, ShoppingCart, Plus, Edit2, Trash2 } from 'lucide-react';
import { consumoInteligenteService } from '@/services/consumoInteligente';
import { ConsumoBaseFormValues, ConsumoBaseItem, Producto, ProductoInput } from '@/types';

const tabDefinitions = [
  {
    value: 'consumo-base',
    title: 'Consumo base',
    description: 'Visualiza el consumo habitual del hogar y detecta patrones de gasto.',
    icon: <Activity className="h-4 w-4" />,
  },
  {
    value: 'productos',
    title: 'Productos',
    description: 'Gestiona tus productos y servicios recurrentes de manera inteligente.',
    icon: <Package className="h-4 w-4" />,
  },
  {
    value: 'compra-inteligente',
    title: 'Compra inteligente',
    description: 'Planifica compras con recomendaciones y ahorro en tus gastos del hogar.',
    icon: <ShoppingCart className="h-4 w-4" />,
  },
];

const CATEGORY_OPTIONS = ['Alimentos', 'Limpieza', 'Hogar', 'Mascotas', 'Tecnología'];
const UNIT_OPTIONS = ['unidad', 'kg', 'litro', 'pack', 'paquete'];
const PRIORITY_OPTIONS = ['Alta', 'Media', 'Baja'] as const;

type PriorityOption = (typeof PRIORITY_OPTIONS)[number];

type ProductFormValues = ProductoInput;

const emptyFormValues: ConsumoBaseFormValues = {
  producto: '',
  categoria: CATEGORY_OPTIONS[0],
  cantidadBase: 1,
  unidad: UNIT_OPTIONS[0],
  duracionMeses: 1,
  prioridad: 'Alta',
  lugarCompra: '',
};

const emptyProductFormValues: ProductFormValues = {
  nombre: '',
  categoria: CATEGORY_OPTIONS[0],
  unidad_base: UNIT_OPTIONS[0],
  marca: '',
  codigo_barras: '',
  observaciones: '',
  activo: true,
};

export const ConsumoInteligente: React.FC = () => {
  const [activeTab, setActiveTab] = useState('consumo-base');
  const [items, setItems] = useState<ConsumoBaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumoBaseItem | null>(null);
  const [formValues, setFormValues] = useState<ConsumoBaseFormValues>({ ...emptyFormValues });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [products, setProducts] = useState<Producto[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState('');
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [productFormValues, setProductFormValues] = useState<ProductFormValues>({ ...emptyProductFormValues });
  const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({});

  const loadItems = async () => {
    setError('');
    setIsLoading(true);

    try {
      const data = await consumoInteligenteService.obtenerConsumoBase();
      setItems(data);
    } catch (err) {
      setError((err as Error)?.message || 'Error al cargar consumo base.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductError('');
    setProductLoading(true);

    try {
      const data = await consumoInteligenteService.obtenerProductos(showInactiveProducts);
      setProducts(data);
    } catch (err) {
      setProductError((err as Error)?.message || 'Error al cargar productos.');
    } finally {
      setProductLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [showInactiveProducts]);

  const openAddProduct = () => {
    setEditingItem(null);
    setFormValues({ ...emptyFormValues });
    setFormErrors({});
    setError('');
    setIsDialogOpen(true);
  };

  const openEditProduct = (item: ConsumoBaseItem) => {
    setEditingItem(item);
    setFormValues({
      producto: item.producto,
      categoria: item.categoria,
      cantidadBase: item.cantidadBase,
      unidad: item.unidad,
      duracionMeses: item.duracionMeses,
      prioridad: item.prioridad,
      lugarCompra: item.lugarCompra,
    });
    setFormErrors({});
    setError('');
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = async (productoId: string) => {
    const confirmed = window.confirm('¿Estás seguro de eliminar este producto base? Se eliminará también su consumo asociado.');
    if (!confirmed) return;

    setError('');
    setIsSaving(true);

    try {
      await consumoInteligenteService.eliminarProducto(productoId);
      setItems((prev) => prev.filter((item) => item.producto_id !== productoId));
    } catch (err) {
      setError((err as Error)?.message || 'Error al eliminar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (field: keyof ConsumoBaseFormValues, value: string | number) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const openAddCatalogProduct = () => {
    setEditingProduct(null);
    setProductFormValues({ ...emptyProductFormValues });
    setProductFormErrors({});
    setProductError('');
    setIsProductDialogOpen(true);
  };

  const openEditCatalogProduct = (product: Producto) => {
    setEditingProduct(product);
    setProductFormValues({
      nombre: product.nombre,
      categoria: product.categoria,
      unidad_base: product.unidad_base,
      marca: product.marca ?? '',
      codigo_barras: product.codigo_barras ?? '',
      observaciones: product.observaciones ?? '',
      activo: product.activo ?? true,
    });
    setProductFormErrors({});
    setProductError('');
    setIsProductDialogOpen(true);
  };

  const handleProductFormChange = (field: keyof ProductFormValues, value: string | boolean) => {
    setProductFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const validateProductForm = () => {
    const errors: Record<string, string> = {};

    if (!productFormValues.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio.';
    }

    if (!productFormValues.categoria.trim()) {
      errors.categoria = 'La categoría es obligatoria.';
    }

    if (!productFormValues.unidad_base.trim()) {
      errors.unidad_base = 'La unidad base es obligatoria.';
    }

    setProductFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCatalogProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateProductForm()) return;

    setProductError('');
    setIsSaving(true);

    try {
      if (editingProduct) {
        const updated = await consumoInteligenteService.actualizarProducto(editingProduct.id, productFormValues);
        setProducts((prev) => prev
          .map((product) => (product.id === updated.id ? updated : product))
          .filter((product) => showInactiveProducts || product.activo));
      } else {
        const created = await consumoInteligenteService.crearProducto(productFormValues);
        setProducts((prev) => [created, ...prev]);
      }

      setIsProductDialogOpen(false);
    } catch (err) {
      setProductError((err as Error)?.message || 'Error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleProductActive = async (product: Producto) => {
    setProductError('');
    setIsSaving(true);

    try {
      const currentActive = product.activo !== false;
      const updated = await consumoInteligenteService.actualizarProducto(product.id, { activo: !currentActive });
      setProducts((prev) => prev
        .map((item) => (item.id === updated.id ? updated : item))
        .filter((item) => showInactiveProducts || item.activo));
    } catch (err) {
      setProductError((err as Error)?.message || 'Error al actualizar estado del producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearch(value);
  };

  const filteredProducts = products.filter((product) => {
    const term = productSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      product.nombre.toLowerCase().includes(term) ||
      product.categoria.toLowerCase().includes(term) ||
      (product.marca ?? '').toLowerCase().includes(term) ||
      (product.codigo_barras ?? '').toLowerCase().includes(term)
    );
  });

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formValues.producto.trim()) {
      errors.producto = 'El producto es obligatorio.';
    }

    if (formValues.cantidadBase <= 0) {
      errors.cantidadBase = 'La cantidad debe ser mayor que 0.';
    }

    if (formValues.duracionMeses < 1) {
      errors.duracionMeses = 'La duración mínima es de 1 mes.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setError('');
    setIsSaving(true);

    try {
      if (editingItem) {
        const updated = await consumoInteligenteService.actualizarProductoYConsumoBase(
          editingItem.producto_id,
          editingItem.consumo_base_id,
          formValues
        );
        setItems((prev) => prev.map((item) =>
          item.producto_id === updated.producto_id ? updated : item
        ));
      } else {
        const created = await consumoInteligenteService.crearProductoYConsumoBase(formValues);
        setItems((prev) => [created, ...prev]);
      }

      setIsDialogOpen(false);
      loadProducts();
    } catch (err) {
      setError((err as Error)?.message || 'Error al guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Consumo Inteligente
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Un espacio para analizar el consumo del hogar, priorizar productos clave y planificar compras inteligentes.
          </p>
        </div>

        <Button className="w-full sm:w-auto" onClick={activeTab === 'productos' ? openAddCatalogProduct : openAddProduct}>
          <Plus className="mr-2 h-4 w-4" /> {activeTab === 'productos' ? 'Agregar producto' : 'Agregar producto'}
        </Button>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-base font-black text-slate-900">Consumo base</CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Define los productos básicos del hogar que utilizás de forma recurrente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
              {tabDefinitions.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-2xl py-3 text-xs font-black uppercase tracking-[0.18em]">
                  {tab.title}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="consumo-base" className="mt-4 p-0">
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">
                      Aquí podés gestionar los productos base del hogar y mantener un catálogo preparado para tus próximas compras.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400 font-black">
                      Total de productos</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{items.length}</p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                {isLoading ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                    Cargando consumo base...
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <Table className="min-w-full">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Producto</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</TableHead>
                          <TableHead className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cantidad</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Unidad</TableHead>
                          <TableHead className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Duración (meses)</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Prioridad</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Lugar</TableHead>
                          <TableHead className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 pr-4">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.consumo_base_id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="px-4 py-4 font-bold text-slate-900">{item.producto}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{item.categoria}</TableCell>
                            <TableCell className="px-4 py-4 text-right text-slate-700">{item.cantidadBase}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{item.unidad}</TableCell>
                            <TableCell className="px-4 py-4 text-right text-slate-700">{item.duracionMeses} {item.duracionMeses === 1 ? 'mes' : 'meses'}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{item.prioridad}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{item.lugarCompra}</TableCell>
                            <TableCell className="px-4 py-4 pr-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  className="rounded-xl border-slate-200 text-slate-700"
                                  onClick={() => openEditProduct(item)}
                                  disabled={isSaving}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="rounded-xl"
                                  onClick={() => handleDeleteProduct(item.producto_id)}
                                  disabled={isSaving}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {items.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="py-12 text-center text-slate-400">
                              No hay productos base registrados.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="productos" className="mt-4 p-0">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500">
                      Gestiona el catálogo real de productos. Los productos creados desde Consumo base también aparecen aquí.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Input
                        placeholder="Buscar por nombre, categoría, marca o código"
                        value={productSearch}
                        onChange={(event) => handleProductSearchChange(event.target.value)}
                        className="min-w-[240px]"
                      />
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={showInactiveProducts}
                          onChange={(event) => setShowInactiveProducts(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                        Mostrar productos inactivos
                      </label>
                    </div>
                  </div>
                  <Button onClick={openAddCatalogProduct} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Agregar producto
                  </Button>
                </div>

                {productError && (
                  <div className="rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                    {productError}
                  </div>
                )}

                {productLoading ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                    Cargando productos...
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <Table className="min-w-full">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Unidad</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Marca</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Código de barras</TableHead>
                          <TableHead className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Activo</TableHead>
                          <TableHead className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 pr-4">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell className="px-4 py-4 font-bold text-slate-900">{product.nombre}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{product.categoria}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{product.unidad_base}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{product.marca || '-'}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{product.codigo_barras || '-'}</TableCell>
                            <TableCell className="px-4 py-4 text-slate-700">{product.activo ? 'Sí' : 'No'}</TableCell>
                            <TableCell className="px-4 py-4 pr-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  className="rounded-xl border-slate-200 text-slate-700"
                                  onClick={() => openEditCatalogProduct(product)}
                                  disabled={isSaving}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={product.activo ? 'secondary' : 'outline'}
                                  className="rounded-xl"
                                  onClick={() => handleToggleProductActive(product)}
                                  disabled={isSaving}
                                >
                                  {product.activo ? 'Desactivar' : 'Activar'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {filteredProducts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="py-12 text-center text-slate-400">
                              No se encontraron productos.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
            {tabDefinitions.filter((tab) => tab.value === 'compra-inteligente').map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4 p-0">
                <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                    {tab.icon}
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-xl font-black text-slate-900">{tab.title}</h2>
                    <p className="text-sm text-slate-500 max-w-xl mx-auto">{tab.description}</p>
                  </div>
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Módulo en preparación.</p>
                    <p className="text-sm text-slate-500 mb-6">En breve podrás aprovechar esta sección con datos reales y recomendaciones automáticas.</p>
                    <Button className="mx-auto">Ver más</Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-0">
          <div className="rounded-[2rem] bg-white shadow-2xl overflow-hidden">
            <DialogHeader className="p-6">
              <DialogTitle className="text-2xl font-black text-slate-900">
                {editingItem ? 'Editar producto' : 'Agregar producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveProduct} className="space-y-6 border-t border-slate-100 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Producto</label>
                  <Input
                    value={formValues.producto}
                    onChange={(event) => handleFormChange('producto', event.target.value)}
                    placeholder="Nombre del producto"
                  />
                  {formErrors.producto && <p className="text-xs text-rose-600">{formErrors.producto}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Categoría</label>
                  <Select value={formValues.categoria} onValueChange={(value) => handleFormChange('categoria', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Cantidad base</label>
                  <Input
                    type="number"
                    min={1}
                    value={formValues.cantidadBase}
                    onChange={(event) => handleFormChange('cantidadBase', Number(event.target.value))}
                  />
                  {formErrors.cantidadBase && <p className="text-xs text-rose-600">{formErrors.cantidadBase}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Unidad</label>
                  <Select value={formValues.unidad} onValueChange={(value) => handleFormChange('unidad', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Duración estimada</label>
                  <Input
                    type="number"
                    min={1}
                    value={formValues.duracionMeses}
                    onChange={(event) => handleFormChange('duracionMeses', Number(event.target.value))}
                  />
                  {formErrors.duracionMeses && <p className="text-xs text-rose-600">{formErrors.duracionMeses}</p>}
                  <p className="text-xs text-slate-500">{formValues.duracionMeses} {formValues.duracionMeses === 1 ? 'mes' : 'meses'}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Prioridad</label>
                  <Select value={formValues.prioridad} onValueChange={(value) => handleFormChange('prioridad', value as PriorityOption)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Lugar recomendado</label>
                  <Input
                    value={formValues.lugarCompra}
                    onChange={(event) => handleFormChange('lugarCompra', event.target.value)}
                    placeholder="Supermercado, comercio..."
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingItem ? 'Guardar cambios' : 'Agregar producto'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-0">
          <div className="rounded-[2rem] bg-white shadow-2xl overflow-hidden">
            <DialogHeader className="p-6">
              <DialogTitle className="text-2xl font-black text-slate-900">
                {editingProduct ? 'Editar producto' : 'Agregar producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveCatalogProduct} className="space-y-6 border-t border-slate-100 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nombre</label>
                  <Input
                    value={productFormValues.nombre}
                    onChange={(event) => handleProductFormChange('nombre', event.target.value)}
                    placeholder="Nombre del producto"
                  />
                  {productFormErrors.nombre && <p className="text-xs text-rose-600">{productFormErrors.nombre}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Categoría</label>
                  <Select value={productFormValues.categoria} onValueChange={(value) => handleProductFormChange('categoria', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {productFormErrors.categoria && <p className="text-xs text-rose-600">{productFormErrors.categoria}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Unidad base</label>
                  <Select value={productFormValues.unidad_base} onValueChange={(value) => handleProductFormChange('unidad_base', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {productFormErrors.unidad_base && <p className="text-xs text-rose-600">{productFormErrors.unidad_base}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Marca</label>
                  <Input
                    value={productFormValues.marca || ''}
                    onChange={(event) => handleProductFormChange('marca', event.target.value)}
                    placeholder="Marca"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Código de barras</label>
                  <Input
                    value={productFormValues.codigo_barras || ''}
                    onChange={(event) => handleProductFormChange('codigo_barras', event.target.value)}
                    placeholder="Código de barras"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Observaciones</label>
                <Textarea
                  value={productFormValues.observaciones || ''}
                  onChange={(event) => handleProductFormChange('observaciones', event.target.value)}
                  placeholder="Notas adicionales"
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="activo"
                  type="checkbox"
                  checked={productFormValues.activo ?? true}
                  onChange={(event) => handleProductFormChange('activo', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                />
                <label htmlFor="activo" className="text-sm font-semibold text-slate-700">
                  Producto activo
                </label>
              </div>

              <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center">
                <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Guardar cambios' : 'Agregar producto'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
