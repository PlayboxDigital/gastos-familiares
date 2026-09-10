import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Expense, PaymentStatus, Priority } from '../types';
import { RESPONSIBLES, PRIORITIES } from '../constants';
import { format } from 'date-fns';

const CATEGORY_OPTIONS = [
  'Vivienda',
  'Comida',
  'Servicios',
  'Vehículos',
  'Hijos',
  'Suscripciones',
  'Salud',
  'Transporte',
  'Mascotas',
  'Viajes',
  'Familia',
  'Ocio / Regalos',
  'Gastos varios',
] as const;

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    expense: Omit<Expense, 'id'> & {
      id?: string;
      tipo_gasto?: 'fijo' | 'variable';
      pagado?: boolean;
    }
  ) => void;
  expenseToEdit?: Expense | null;
  defaultTipoGasto?: 'fijo' | 'variable';
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  expenseToEdit,
  defaultTipoGasto = 'variable',
}) => {
  const montoRef = useRef<HTMLInputElement | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    monto: 0,
    categoria: CATEGORY_OPTIONS[0],
    subcategoria: '',
    responsable: RESPONSIBLES[0],
    prioridad: 'Importante',
    concepto: '',
    estado_pago: 'Pendiente',
    fecha_pago: null,
    dia_vencimiento: new Date().getDate(),
    tipo_gasto: 'variable',
    monto_variable: false,
    tipo: 'Variable',
  });

  useEffect(() => {
    setShowAdvanced(false);

    if (expenseToEdit) {
      setFormData({
        fecha: expenseToEdit.fecha,
        monto: expenseToEdit.monto,
        categoria: expenseToEdit.categoria,
        subcategoria: expenseToEdit.subcategoria,
        responsable: expenseToEdit.responsable,
        prioridad: expenseToEdit.prioridad,
        concepto: expenseToEdit.concepto || '',
        estado_pago: expenseToEdit.estado_pago || 'Pendiente',
        fecha_pago: expenseToEdit.fecha_pago || null,
        dia_vencimiento:
          expenseToEdit.dia_vencimiento ||
          (expenseToEdit.fecha
            ? new Date(`${expenseToEdit.fecha}T12:00:00`).getDate()
            : new Date().getDate()),
        tipo_gasto:
          expenseToEdit.tipo_gasto ||
          (expenseToEdit.tipo?.toLowerCase() === 'variable'
            ? 'variable'
            : 'fijo'),
          monto_variable: expenseToEdit.monto_variable ?? false,
        tipo: expenseToEdit.tipo || 'Fijo',
        monto_final_a_pagar: expenseToEdit.monto_final_a_pagar,
        saldo_a_favor_aplicado: expenseToEdit.saldo_a_favor_aplicado,
        descuento: expenseToEdit.descuento,
        credito: expenseToEdit.credito,
        monto_neto: expenseToEdit.monto_neto,
        cantidad_cuotas: expenseToEdit.cantidad_cuotas,
        cuota_actual: expenseToEdit.cuota_actual,
        fecha_inicio_cuotas: expenseToEdit.fecha_inicio_cuotas,
        monto_cuota: expenseToEdit.monto_cuota,
        ...((expenseToEdit as any).id_pago_original
          ? { id_pago_original: (expenseToEdit as any).id_pago_original }
          : {}),
      });
      return;
    }

    setFormData({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      monto: 0,
      categoria: CATEGORY_OPTIONS[0],
      subcategoria: '',
      responsable: RESPONSIBLES[0],
      prioridad: 'Importante',
      concepto: '',
      estado_pago: 'Pendiente',
      fecha_pago: null,
      dia_vencimiento: new Date().getDate(),
      tipo_gasto: defaultTipoGasto,
      monto_variable: false,
      tipo: defaultTipoGasto === 'variable' ? 'Variable' : 'Fijo',
    });
  }, [expenseToEdit, isOpen, defaultTipoGasto]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => montoRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const handleChange = React.useCallback(
    (field: keyof Omit<Expense, 'id'>, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handlePaidChange = (paid: boolean) => {
    const status: PaymentStatus = paid ? 'Pagado' : 'Pendiente';

    setFormData((prev) => ({
      ...prev,
      estado_pago: status,
      fecha_pago: paid
        ? prev.fecha_pago || format(new Date(), 'yyyy-MM-dd')
        : null,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subcategoria.trim()) return;
    if (!formData.monto_variable && (!formData.monto || formData.monto <= 0)) return;

    const normalizedData = {
      ...formData,
      monto: formData.monto_variable ? 0 : formData.monto,
      subcategoria: formData.subcategoria.trim(),
      concepto: formData.concepto?.trim() || '',
      fecha_pago:
        formData.estado_pago === 'Pendiente'
          ? null
          : formData.fecha_pago || formData.fecha,
      dia_vencimiento:
        formData.tipo_gasto === 'variable'
          ? undefined
          : formData.dia_vencimiento,
      pagado: formData.estado_pago === 'Pagado',
    };

    onSubmit({ ...normalizedData, id: expenseToEdit?.id });
    onClose();
  };

  const isPaid = formData.estado_pago === 'Pagado';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="
          !w-[94vw]
          !max-w-[760px]
          sm:!max-w-[760px]
          max-h-[92vh]
          p-0
          overflow-hidden
          rounded-3xl
        "
      >
        <div className="flex max-h-[92vh] min-w-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 md:px-7 md:py-6">
            <DialogHeader className="mb-6 text-left">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                {expenseToEdit ? 'Editar gasto' : 'Nuevo gasto'}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                Cargá lo esencial. El resto queda en “Más opciones”.
              </DialogDescription>
            </DialogHeader>

            <form id="expense-form" onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="subcategoria"
                      className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500"
                    >
                      ¿Qué pagaste?
                    </Label>
                    <Input
                      id="subcategoria"
                      value={formData.subcategoria}
                      onChange={(e) =>
                        handleChange('subcategoria', e.target.value)
                      }
                      required
                      autoComplete="off"
                      placeholder="Ej: Farmacia, Carrefour, Netflix..."
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 text-base font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="monto"
                      className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500"
                    >
                      {formData.monto_variable ? 'Importe' : 'Monto'}
                    </Label>
                    {formData.monto_variable ? (
                      <div className="flex h-14 items-center rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-800">
                        El monto se carga al momento de pagar
                      </div>
                    ) : <Input
                      id="monto"
                      ref={montoRef}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={formData.monto || ''}
                      onChange={(e) =>
                        handleChange(
                          'monto',
                          e.target.value === ''
                            ? 0
                            : Number(e.target.value)
                        )
                      }
                      required
                      placeholder="$ 0"
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50 text-xl font-black"
                    />}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500">
                      Categoría
                    </Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) =>
                        handleChange('categoria', value)
                      }
                    >
                      <SelectTrigger className="h-13 rounded-2xl border-slate-200 bg-slate-50">
                        <SelectValue placeholder="Elegir categoría" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {CATEGORY_OPTIONS.map((category) => (
                          <SelectItem
                            key={category}
                            value={category}
                            className="rounded-lg"
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500">
                      Responsable
                    </Label>
                    <Select
                      value={formData.responsable}
                      onValueChange={(value) =>
                        handleChange('responsable', value)
                      }
                    >
                      <SelectTrigger className="h-13 rounded-2xl border-slate-200 bg-slate-50">
                        <SelectValue placeholder="Elegir responsable" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {RESPONSIBLES.map((responsible) => (
                          <SelectItem
                            key={responsible}
                            value={responsible}
                            className="rounded-lg"
                          >
                            {responsible}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="fecha"
                      className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500"
                    >
                      Fecha
                    </Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) =>
                        handleChange('fecha', e.target.value)
                      }
                      required
                      className="h-13 rounded-2xl border-slate-200 bg-slate-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500">
                      Estado
                    </Label>

                    <button
                      type="button"
                      onClick={() => handlePaidChange(!isPaid)}
                      className={`
                        flex h-[52px] w-full items-center justify-between
                        rounded-2xl border px-4 text-left transition
                        ${
                          isPaid
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50'
                        }
                      `}
                    >
                      <div>
                        <div className="text-sm font-black text-slate-800">
                          {isPaid ? 'Ya está pagado' : 'Queda pendiente'}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          Tocá para cambiar
                        </div>
                      </div>

                      <div
                        className={`
                          relative h-7 w-12 shrink-0 rounded-full transition
                          ${isPaid ? 'bg-emerald-500' : 'bg-slate-300'}
                        `}
                      >
                        <div
                          className={`
                            absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all
                            ${isPaid ? 'left-6' : 'left-1'}
                          `}
                        />
                      </div>
                    </button>
                  </div>
                </div>

                {isPaid && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="fecha_pago"
                      className="ml-1 text-xs font-black uppercase tracking-widest text-slate-500"
                    >
                      Fecha de pago
                    </Label>
                    <Input
                      id="fecha_pago"
                      type="date"
                      value={formData.fecha_pago || ''}
                      onChange={(e) =>
                        handleChange('fecha_pago', e.target.value)
                      }
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  {showAdvanced ? 'Ocultar opciones' : 'Más opciones'}
                </button>

                {showAdvanced && (
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                          Frecuencia
                        </Label>
                        <Select
                          value={formData.tipo_gasto || 'variable'}
                          onValueChange={(value: 'fijo' | 'variable') => {
                            handleChange('tipo_gasto', value);
                            handleChange(
                              'tipo',
                              value === 'variable' ? 'Variable' : 'Fijo'
                            );
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="variable">
                              Solo este mes
                            </SelectItem>
                            <SelectItem value="fijo">
                              Todos los meses
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                          Monto
                        </Label>
                        <Select
                          value={formData.monto_variable ? 'variable' : 'known'}
                          onValueChange={(value) =>
                            handleChange('monto_variable', value === 'variable')
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="known">Fijo</SelectItem>
                            <SelectItem value="variable">Variable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                          Prioridad
                        </Label>
                        <Select
                          value={formData.prioridad}
                          onValueChange={(value) =>
                            handleChange(
                              'prioridad',
                              value as Priority
                            )
                          }
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((priority) => (
                              <SelectItem
                                key={priority}
                                value={priority}
                              >
                                {priority}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.tipo_gasto === 'fijo' && (
                      <div className="space-y-2">
                        <Label
                          htmlFor="dia_vencimiento"
                          className="text-xs font-black uppercase tracking-widest text-slate-500"
                        >
                          Día de vencimiento
                        </Label>
                        <Input
                          id="dia_vencimiento"
                          type="number"
                          min={1}
                          max={31}
                          value={formData.dia_vencimiento || ''}
                          onChange={(e) =>
                            handleChange(
                              'dia_vencimiento',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="h-11 rounded-xl bg-white"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label
                        htmlFor="concepto"
                        className="text-xs font-black uppercase tracking-widest text-slate-500"
                      >
                        Nota / descripción
                      </Label>
                      <Input
                        id="concepto"
                        value={formData.concepto || ''}
                        onChange={(e) =>
                          handleChange('concepto', e.target.value)
                        }
                        placeholder="Opcional"
                        className="h-11 rounded-xl bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 md:px-7">
            <div className="flex w-full gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-12 flex-1 rounded-2xl font-bold text-slate-500"
              >
                Cancelar
              </Button>

              <Button
                form="expense-form"
                type="submit"
                className="h-12 flex-[2] rounded-2xl bg-slate-900 font-black text-white hover:bg-black"
              >
                {expenseToEdit ? 'Guardar cambios' : 'Guardar gasto'}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};