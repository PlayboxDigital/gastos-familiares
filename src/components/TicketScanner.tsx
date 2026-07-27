import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingBasket,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIES, DB_PAYMENT_METHOD_MAP, PAYMENT_METHODS, PRIORITIES, RESPONSIBLES } from '../constants';
import { cloudinaryService } from '../services/cloudinary';
import { ticketsService } from '../services/tickets';
import { Priority, TicketCompraInput, TicketConfirmacionResultado } from '../types';

type Step = 'capture' | 'products' | 'review' | 'success';

interface EditableProduct {
  localId: string;
  descripcion_original: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
  descuento: number;
  categoria: string;
  subcategoria: string;
  orden: number;
}

interface TicketScannerProps {
  onBackToDashboard: () => void;
  onConfirmed: () => Promise<void>;
}

const createEmptyProduct = (order: number): EditableProduct => ({
  localId: crypto.randomUUID(),
  descripcion_original: '',
  cantidad: 1,
  unidad: 'unidad',
  precio_unitario: 0,
  subtotal: 0,
  descuento: 0,
  categoria: CATEGORIES[0]?.categoria || '',
  subcategoria: '',
  orden: order,
});

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
});

const numericValue = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const TicketScanner: React.FC<TicketScannerProps> = ({
  onBackToDashboard,
  onConfirmed,
}) => {
  const [step, setStep] = useState<Step>('capture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState('');
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [editingProduct, setEditingProduct] = useState<EditableProduct>(createEmptyProduct(1));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<TicketConfirmacionResultado | null>(null);
  const [error, setError] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    comercio: '',
    fecha_compra: format(new Date(), 'yyyy-MM-dd'),
    numero_ticket: '',
    responsable: RESPONSIBLES[0] || '',
    categoria: CATEGORIES[0]?.categoria || '',
    subcategoria: '',
    prioridad: PRIORITIES[1] || ('Importante' as Priority),
    forma_pago: PAYMENT_METHODS[0] || '',
    subtotal: 0,
    descuento_total: 0,
    total: 0,
    observaciones: '',
  });

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const productSum = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.subtotal || 0), 0),
    [products]
  );
  const calculatedTotal = Math.max(0, productSum - Number(form.descuento_total || 0));
  const difference = Number(form.total || 0) - calculatedTotal;

  const setField = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Seleccioná una imagen válida.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar los 10 MB.');
      return;
    }
    setSelectedFile(file);
  };

  const validateTicket = () => {
    if (!selectedFile && !savedImageUrl) return 'Seleccioná o tomá una foto del ticket.';
    if (!form.fecha_compra) return 'La fecha de compra es obligatoria.';
    if (!form.responsable) return 'El responsable es obligatorio.';
    if (!form.categoria) return 'La categoría es obligatoria.';
    if (!form.forma_pago) return 'La forma de pago es obligatoria.';
    if (!Number.isFinite(Number(form.total)) || Number(form.total) <= 0) {
      return 'El total debe ser mayor que cero.';
    }
    if (Number(form.subtotal) < 0 || Number(form.descuento_total) < 0) {
      return 'El subtotal y el descuento no pueden ser negativos.';
    }
    return '';
  };

  const ticketPayload = (
    image?: {
      publicId: string;
      url: string;
      secureUrl: string;
      originalName: string;
    }
  ): TicketCompraInput => ({
    comercio: form.comercio.trim() || undefined,
    fecha_compra: form.fecha_compra,
    numero_ticket: form.numero_ticket.trim() || undefined,
    responsable: form.responsable,
    categoria: form.categoria,
    subcategoria: form.subcategoria.trim() || undefined,
    prioridad: form.prioridad,
    forma_pago: DB_PAYMENT_METHOD_MAP[form.forma_pago] || form.forma_pago,
    subtotal: Number(form.subtotal),
    descuento_total: Number(form.descuento_total),
    total: Number(form.total),
    observaciones: form.observaciones.trim() || undefined,
    ...(image
      ? {
          imagen_nombre_original: image.originalName,
          imagen_cloudinary_public_id: image.publicId,
          imagen_cloudinary_url: image.url,
          imagen_cloudinary_secure_url: image.secureUrl,
        }
      : {}),
  });

  const createDraft = async () => {
    const validationError = validateTicket();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    setError('');
    try {
      if (ticketId) {
        await ticketsService.actualizarTicket(ticketId, ticketPayload());
        setStep('products');
        return;
      }
      if (!selectedFile) return;
      const uploaded = await cloudinaryService.uploadFile(selectedFile);
      const image = {
        publicId: uploaded.public_id,
        url: uploaded.url,
        secureUrl: uploaded.secure_url,
        originalName: selectedFile.name,
      };
      const created = await ticketsService.crearTicket(ticketPayload(image));
      setTicketId(created.id);
      setSavedImageUrl(
        cloudinaryService.getOptimizedUrl(uploaded.secure_url, {
          quality: 'auto:low',
          fetch_format: 'auto',
          width: 1200,
        })
      );
      setStep('products');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el borrador del ticket.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateProductField = (
    field: keyof Omit<EditableProduct, 'localId'>,
    value: string | number
  ) => {
    setEditingProduct((current) => {
      const updated = { ...current, [field]: value };
      if (field === 'cantidad' || field === 'precio_unitario' || field === 'descuento') {
        updated.subtotal = Math.max(
          0,
          Number(updated.cantidad) * Number(updated.precio_unitario) - Number(updated.descuento)
        );
      }
      return updated;
    });
  };

  const saveProduct = () => {
    if (!editingProduct.descripcion_original.trim()) {
      setError('Ingresá la descripción del producto.');
      return;
    }
    if (!Number.isFinite(editingProduct.cantidad) || editingProduct.cantidad <= 0) {
      setError('La cantidad del producto debe ser mayor que cero.');
      return;
    }
    if (
      editingProduct.precio_unitario < 0 ||
      editingProduct.subtotal < 0 ||
      editingProduct.descuento < 0
    ) {
      setError('Los importes del producto no pueden ser negativos.');
      return;
    }
    if (!editingProduct.categoria) {
      setError('Seleccioná una categoría para el producto.');
      return;
    }

    setError('');
    if (editingIndex === null) {
      setProducts((current) => [...current, { ...editingProduct, orden: current.length + 1 }]);
    } else {
      setProducts((current) =>
        current.map((product, index) =>
          index === editingIndex ? { ...editingProduct, orden: index + 1 } : product
        )
      );
    }
    setEditingIndex(null);
    setEditingProduct(createEmptyProduct(products.length + 2));
  };

  const editProduct = (index: number) => {
    setEditingIndex(index);
    setEditingProduct({ ...products[index] });
    setError('');
  };

  const deleteProduct = (index: number) => {
    setProducts((current) =>
      current
        .filter((_, productIndex) => productIndex !== index)
        .map((product, productIndex) => ({ ...product, orden: productIndex + 1 }))
    );
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingProduct(createEmptyProduct(products.length));
    }
  };

  const saveForReview = async () => {
    const validationError = validateTicket();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!ticketId) {
      setError('No se encontró el borrador del ticket.');
      return;
    }
    if (products.length === 0) {
      setError('Agregá al menos un producto antes de revisar.');
      return;
    }
    if (isSaving) return;

    setIsSaving(true);
    setError('');
    try {
      await ticketsService.actualizarTicket(ticketId, ticketPayload());
      await ticketsService.reemplazarProductos(
        ticketId,
        products.map(({ localId: _localId, ...product }) => product)
      );
      await ticketsService.verificarProductosTicket(ticketId, products.length);
      setStep('review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el ticket.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmTicket = async () => {
    if (!ticketId || isConfirming || step === 'success') return;
    if (products.length === 0) {
      setError('El ticket debe tener al menos un producto.');
      return;
    }
    if (Number(form.total) <= 0) {
      setError('El total debe ser mayor que cero.');
      return;
    }

    setIsConfirming(true);
    setError('');
    try {
      const currentTicket = await ticketsService.obtenerTicket(ticketId);
      const isAlreadyConfirmed =
        currentTicket.estado_revision?.trim().toLowerCase() === 'confirmado';

      if (isAlreadyConfirmed) {
        const verifiedTicket = await ticketsService.verificarTicketConfirmado(ticketId);
        await onConfirmed();
        setConfirmationResult({
          ticket_id: verifiedTicket.id,
          gasto_id: verifiedTicket.gasto_id!,
          pago_id: verifiedTicket.pago_id!,
          total: Number(verifiedTicket.total),
          diferencia: difference,
        });
        setStep('success');
        return;
      }

      await ticketsService.verificarProductosTicket(ticketId, products.length);
      const result = await ticketsService.confirmarTicket(ticketId);
      await ticketsService.verificarTicketConfirmado(ticketId, result);
      await onConfirmed();
      setConfirmationResult(result);
      setStep('success');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'El ticket quedó guardado, pero no pudo contabilizarse como gasto. Revisá los datos e intentá nuevamente.'
      );
    } finally {
      setIsConfirming(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
        <Card className="w-full rounded-3xl border-emerald-100 text-center shadow-xl shadow-emerald-100/40">
          <CardContent className="space-y-5 p-8 sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Ticket confirmado</h2>
              <p className="mt-2 text-sm text-slate-500">
                La compra de {form.comercio || 'este comercio'} por{' '}
                {currency.format(Number(form.total))} quedó contabilizada correctamente.
              </p>
            </div>
            <div className="grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Gasto creado
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-900">
                  {confirmationResult?.gasto_id ? 'Vinculado correctamente' : 'Confirmado'}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Pago registrado
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-900">
                  {confirmationResult?.pago_id ? 'Vinculado correctamente' : 'Confirmado'}
                </p>
              </div>
            </div>
            <Button onClick={onBackToDashboard} className="w-full rounded-xl bg-blue-600">
              Volver al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            Carga manual · sin OCR
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Escanear ticket
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cargá la imagen, detallá los productos y revisá todo antes de confirmar.
          </p>
        </div>
        <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {[
            ['capture', '1. Ticket'],
            ['products', '2. Productos'],
            ['review', '3. Revisión'],
          ].map(([value, label]) => (
            <span
              key={value}
              className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide ${
                step === value ? 'bg-blue-600 text-white' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm font-semibold">{error}</p>
          <button type="button" onClick={() => setError('')} aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      {step === 'capture' && (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="overflow-hidden rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Camera className="h-5 w-5 text-blue-600" /> Imagen del ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
              {previewUrl ? (
                <div className="overflow-hidden rounded-2xl bg-slate-100">
                  <img
                    src={previewUrl}
                    alt="Vista previa del ticket"
                    className="max-h-[430px] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <Receipt className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="font-bold text-slate-700">Todavía no seleccionaste una imagen</p>
                  <p className="mt-1 text-xs text-slate-400">JPG, PNG o imagen compatible · máximo 10 MB</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" /> Cámara
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  {selectedFile ? <RotateCcw className="mr-2 h-4 w-4" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                  {selectedFile ? 'Reemplazar' : 'Galería'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Datos generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Comercio">
                  <Input value={form.comercio} onChange={(e) => setField('comercio', e.target.value)} placeholder="Nombre del comercio" />
                </Field>
                <Field label="Fecha *">
                  <Input type="date" value={form.fecha_compra} onChange={(e) => setField('fecha_compra', e.target.value)} />
                </Field>
                <Field label="Número de ticket">
                  <Input value={form.numero_ticket} onChange={(e) => setField('numero_ticket', e.target.value)} placeholder="Opcional" />
                </Field>
                <Field label="Responsable *">
                  <Select value={form.responsable} onValueChange={(value) => setField('responsable', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESPONSIBLES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Categoría *">
                  <Select value={form.categoria} onValueChange={(value) => setField('categoria', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item.categoria} value={item.categoria}>{item.categoria}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Subcategoría">
                  <Input value={form.subcategoria} onChange={(e) => setField('subcategoria', e.target.value)} />
                </Field>
                <Field label="Prioridad">
                  <Select value={form.prioridad} onValueChange={(value) => setField('prioridad', value as Priority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Forma de pago *">
                  <Select value={form.forma_pago} onValueChange={(value) => setField('forma_pago', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <MoneyField label="Subtotal" value={form.subtotal} onChange={(value) => setField('subtotal', value)} />
                <MoneyField label="Descuento total" value={form.descuento_total} onChange={(value) => setField('descuento_total', value)} />
                <div className="sm:col-span-2">
                  <MoneyField label="Total *" value={form.total} onChange={(value) => setField('total', value)} />
                </div>
              </div>
              <Field label="Observaciones">
                <Textarea value={form.observaciones} onChange={(e) => setField('observaciones', e.target.value)} placeholder="Información adicional del ticket" />
              </Field>
              <Button
                type="button"
                onClick={createDraft}
                disabled={isSaving}
                className="h-12 w-full rounded-xl bg-blue-600 font-black"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBasket className="mr-2 h-4 w-4" />}
                {isSaving ? 'Subiendo y guardando...' : 'Guardar borrador y cargar productos'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'products' && (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">{editingIndex === null ? 'Agregar producto' : 'Editar producto'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Descripción *">
                <Input value={editingProduct.descripcion_original} onChange={(e) => updateProductField('descripcion_original', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <MoneyField label="Cantidad *" value={editingProduct.cantidad} onChange={(value) => updateProductField('cantidad', value)} minExclusive />
                <Field label="Unidad">
                  <Input value={editingProduct.unidad} onChange={(e) => updateProductField('unidad', e.target.value)} placeholder="unidad, kg..." />
                </Field>
                <MoneyField label="Precio unitario" value={editingProduct.precio_unitario} onChange={(value) => updateProductField('precio_unitario', value)} />
                <MoneyField label="Descuento" value={editingProduct.descuento} onChange={(value) => updateProductField('descuento', value)} />
                <div className="col-span-2">
                  <MoneyField label="Subtotal *" value={editingProduct.subtotal} onChange={(value) => updateProductField('subtotal', value)} />
                </div>
                <Field label="Categoría *">
                  <Select value={editingProduct.categoria} onValueChange={(value) => updateProductField('categoria', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item.categoria} value={item.categoria}>{item.categoria}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Subcategoría">
                  <Input value={editingProduct.subcategoria} onChange={(e) => updateProductField('subcategoria', e.target.value)} />
                </Field>
              </div>
              <div className="flex gap-2">
                {editingIndex !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setEditingIndex(null);
                      setEditingProduct(createEmptyProduct(products.length + 1));
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="button" onClick={saveProduct} className="flex-1 rounded-xl bg-blue-600">
                  <Plus className="mr-2 h-4 w-4" />
                  {editingIndex === null ? 'Agregar producto' : 'Guardar cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Productos ({products.length})</CardTitle>
              <span className="text-sm font-black text-slate-900">{currency.format(productSum)}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              {products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                  Agregá el primer producto del ticket.
                </div>
              ) : products.map((product, index) => (
                <div key={product.localId} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">{product.descripcion_original}</p>
                    <p className="text-xs text-slate-500">{product.cantidad} {product.unidad} · {product.categoria}</p>
                  </div>
                  <span className="text-sm font-black">{currency.format(product.subtotal)}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => editProduct(index)} aria-label="Editar producto">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => deleteProduct(index)} aria-label="Eliminar producto" className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-col gap-2 pt-3 sm:flex-row">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep('capture')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Revisar datos
                </Button>
                <Button type="button" className="flex-1 rounded-xl bg-blue-600" onClick={saveForReview} disabled={isSaving || products.length === 0}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar y revisar ticket
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'review' && (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="overflow-hidden rounded-3xl border-slate-200">
            <CardHeader><CardTitle className="text-lg">Comprobante</CardTitle></CardHeader>
            <CardContent>
              <img src={savedImageUrl || previewUrl} alt="Ticket cargado" className="max-h-[520px] w-full rounded-2xl bg-slate-100 object-contain" />
            </CardContent>
          </Card>
          <div className="space-y-5">
            <Card className="rounded-3xl border-slate-200">
              <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                <ReviewValue label="Comercio" value={form.comercio || 'Sin informar'} />
                <ReviewValue label="Fecha" value={form.fecha_compra} />
                <ReviewValue label="Responsable" value={form.responsable} />
                <ReviewValue label="Forma de pago" value={form.forma_pago} />
                <ReviewValue label="Categoría" value={`${form.categoria}${form.subcategoria ? ` · ${form.subcategoria}` : ''}`} />
                <ReviewValue label="Ticket" value={form.numero_ticket || 'Sin número'} />
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-slate-200">
              <CardHeader><CardTitle className="text-lg">Productos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {products.map((product) => (
                  <div key={product.localId} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{product.descripcion_original}</p>
                      <p className="text-xs text-slate-400">{product.cantidad} {product.unidad} × {currency.format(product.precio_unitario)}</p>
                    </div>
                    <span className="font-black">{currency.format(product.subtotal)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-slate-200">
              <CardContent className="space-y-3 p-6">
                <TotalRow label="Suma de productos" value={productSum} />
                <TotalRow label="Descuento general" value={-Number(form.descuento_total)} />
                <TotalRow label="Total calculado" value={calculatedTotal} />
                <TotalRow label="Total declarado" value={Number(form.total)} strong />
                <div className={`flex items-center justify-between rounded-xl p-3 ${Math.abs(difference) < 0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  <span className="text-xs font-black uppercase tracking-wide">Diferencia</span>
                  <span className="font-black">{currency.format(difference)}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep('products')} disabled={isConfirming}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Corregir
              </Button>
              <Button type="button" className="h-12 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={confirmTicket} disabled={isConfirming}>
                {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {isConfirming ? 'Confirmando...' : 'Confirmar ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</Label>
    {children}
  </div>
);

const MoneyField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  minExclusive?: boolean;
}> = ({ label, value, onChange, minExclusive }) => (
  <Field label={label}>
    <Input
      type="number"
      inputMode="decimal"
      step="0.01"
      min={minExclusive ? '0.01' : '0'}
      value={value || ''}
      onChange={(event) => onChange(numericValue(event.target.value))}
    />
  </Field>
);

const ReviewValue: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
  </div>
);

const TotalRow: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <div className={`flex items-center justify-between ${strong ? 'border-t border-slate-200 pt-3 text-lg' : 'text-sm'}`}>
    <span className={strong ? 'font-black text-slate-900' : 'font-semibold text-slate-500'}>{label}</span>
    <span className="font-black text-slate-900">{currency.format(value)}</span>
  </div>
);
