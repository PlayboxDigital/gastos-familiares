import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Expense, Priority, PaymentStatus } from '../types';
import { CATEGORIES, RESPONSIBLES, PRIORITIES } from '../constants';
import { format } from 'date-fns';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: Omit<Expense, 'id'> & { id?: string }) => void;
  expenseToEdit?: Expense | null;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ isOpen, onClose, onSubmit, expenseToEdit }) => {
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    monto: 0,
    categoria: CATEGORIES[0].categoria,
    subcategoria: '',
    responsable: RESPONSIBLES[0],
    prioridad: 'Importante',
    concepto: '',
    estado_pago: 'Pendiente',
    fecha_pago: null,
    dia_vencimiento: new Date().getDate(),
    tipo_gasto: 'fijo',
  });

  useEffect(() => {
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
        dia_vencimiento: expenseToEdit.dia_vencimiento || (expenseToEdit.fecha ? new Date(expenseToEdit.fecha + 'T12:00:00').getDate() : new Date().getDate()),
        tipo_gasto: expenseToEdit.tipo_gasto || (expenseToEdit.tipo?.toLowerCase() === 'variable' ? 'variable' : 'fijo'),
        tipo: expenseToEdit.tipo || 'Fijo',
        // Preservar campos que no están en el formulario pero son parte del modelo
        ...((expenseToEdit as any).id_pago_original ? { id_pago_original: (expenseToEdit as any).id_pago_original } : {}),
      });
    } else {
      setFormData({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        monto: 0,
        categoria: CATEGORIES[0].categoria,
        subcategoria: '',
        responsable: RESPONSIBLES[0],
        prioridad: 'Importante',
        concepto: '',
        estado_pago: 'Pendiente',
        fecha_pago: null,
        dia_vencimiento: new Date().getDate(),
        tipo_gasto: 'fijo',
        tipo: 'Fijo',
      });
    }
  }, [expenseToEdit, isOpen]);

  const handleChange = React.useCallback((field: keyof Omit<Expense, 'id'>, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prevenir doble envío si fuera necesario (aunque aquí es síncrono para el padre)
    const normalizedData = {
      ...formData,
      fecha_pago: formData.estado_pago === 'Pendiente' ? null : (formData.fecha_pago || null),
      dia_vencimiento: formData.tipo_gasto === 'variable' ? undefined : formData.dia_vencimiento
    };
    
    onSubmit({ ...normalizedData, id: expenseToEdit?.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-md:p-0 max-md:gap-0 sm:max-w-[500px] max-md:max-h-[75dvh] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto modal-scroll px-6 md:px-8 py-6">
          <DialogHeader className="mb-6 pt-4 md:pt-0">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {expenseToEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Completa los detalles para mantener el control.
            </DialogDescription>
          </DialogHeader>

          <form id="expense-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de inicio</Label>
                <Input 
                  id="fecha" 
                  type="date" 
                  value={formData.fecha}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  required
                  className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monto" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Monto ($)</Label>
                <Input 
                  id="monto" 
                  type="number" 
                  inputMode="decimal"
                  step="0.01"
                  value={formData.monto || ''}
                  onChange={(e) => handleChange('monto', parseFloat(e.target.value))}
                  required
                  placeholder="0.00"
                  className="h-12 sm:h-10 bg-slate-50 border-none font-black text-lg sm:text-base rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategoria" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Subcategoría / Concepto</Label>
              <Input 
                id="subcategoria" 
                value={formData.subcategoria}
                onChange={(e) => handleChange('subcategoria', e.target.value)}
                required
                placeholder="Ej: Supermercado, Alquiler..."
                className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Categoría</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(v) => handleChange('categoria', v)}
                >
                  <SelectTrigger className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.categoria} value={c.categoria} className="rounded-lg">{c.categoria}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Responsable</Label>
                <Select 
                  value={formData.responsable} 
                  onValueChange={(v) => handleChange('responsable', v)}
                >
                  <SelectTrigger className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {RESPONSIBLES.map(r => (
                      <SelectItem key={r} value={r} className="rounded-lg">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Prioridad</Label>
                <Select 
                  value={formData.prioridad} 
                  onValueChange={(v) => handleChange('prioridad', v as Priority)}
                >
                  <SelectTrigger className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p} className="rounded-lg">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.prioridad === 'Esencial' && (
                  <p className="text-[10px] text-blue-600 font-bold animate-pulse ml-1">
                    ⚠️ Pagar antes del día 10
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Gasto</Label>
                <Select 
                  value={formData.tipo_gasto || 'fijo'} 
                  onValueChange={(v: 'fijo' | 'variable') => {
                    handleChange('tipo_gasto', v);
                    handleChange('tipo', v === 'variable' ? 'Variable' : 'Fijo');
                  }}
                >
                  <SelectTrigger className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="fijo" className="rounded-lg">Fijo</SelectItem>
                    <SelectItem value="variable" className="rounded-lg">Variable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.tipo_gasto !== 'variable' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dia_vencimiento" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Día Venc.</Label>
                  <Input 
                    id="dia_vencimiento" 
                    type="number" 
                    min="1"
                    max="31"
                    inputMode="numeric"
                    value={formData.dia_vencimiento || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      handleChange('dia_vencimiento', isNaN(val) ? 0 : val);
                    }}
                    className="h-12 sm:h-10 bg-slate-50 border-none font-bold rounded-xl"
                    placeholder={new Date().getDate().toString()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento_picker" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Calcular día</Label>
                  <Input 
                    id="fecha_vencimiento_picker" 
                    type="date" 
                    onChange={(e) => {
                      if (e.target.value) {
                        const date = new Date(e.target.value + 'T12:00:00');
                        setFormData({ ...formData, dia_vencimiento: date.getDate() });
                      }
                    }}
                    className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Estado de Pago</Label>
                <Select 
                  value={formData.estado_pago} 
                  onValueChange={(v) => {
                    const newStatus = v as PaymentStatus;
                    handleChange('estado_pago', newStatus);
                    handleChange('fecha_pago', newStatus === 'Pagado' ? format(new Date(), 'yyyy-MM-dd') : null);
                  }}
                >
                  <SelectTrigger className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Pendiente" className="rounded-lg">Pendiente</SelectItem>
                    <SelectItem value="Pagado" className="rounded-lg">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.estado_pago === 'Pagado' && (
                <div className="space-y-2">
                  <Label htmlFor="fecha_pago" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Pago</Label>
                  <Input 
                    id="fecha_pago" 
                    type="date" 
                    value={formData.fecha_pago || ''}
                    onChange={(e) => handleChange('fecha_pago', e.target.value)}
                    className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepto" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Descripción (Opcional)</Label>
              <Input 
                id="concepto" 
                value={formData.concepto}
                onChange={(e) => handleChange('concepto', e.target.value)}
                placeholder="Nota adicional..."
                className="h-12 sm:h-10 bg-slate-50 border-none rounded-xl"
              />
            </div>
          </form>
        </div>

        <DialogFooter className="bg-white px-6 py-4 flex flex-row gap-3">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-2xl h-12 font-bold text-slate-400 active:scale-95 transition-transform">
            Cancelar
          </Button>
          <Button 
            form="expense-form"
            type="submit" 
            className="flex-2 bg-slate-900 hover:bg-black text-white rounded-2xl h-12 font-black uppercase tracking-widest text-xs active:scale-95 transition-transform"
          >
            {expenseToEdit ? 'Guardar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
