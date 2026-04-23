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
        tipo: 'Fijo',
      });
    }
  }, [expenseToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Normalizar datos antes de enviar: fecha_pago nunca debe ser ""
    const normalizedData = {
      ...formData,
      fecha_pago: formData.estado_pago === 'Pendiente' ? null : (formData.fecha_pago || null)
    };
    
    console.log("ITEM_ENVIADO_DIA_VENCIMIENTO:", normalizedData.dia_vencimiento);
    
    onSubmit({ ...normalizedData, id: expenseToEdit?.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {expenseToEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
          </DialogTitle>
          <DialogDescription>
            Completa los detalles del gasto para mantener tus finanzas al día.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha" className="text-xs font-bold text-slate-500 uppercase">Fecha de inicio</Label>
              <Input 
                id="fecha" 
                type="date" 
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
                className="bg-slate-50 border-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto" className="text-xs font-bold text-slate-500 uppercase">Monto ($)</Label>
              <Input 
                id="monto" 
                type="number" 
                step="0.01"
                value={formData.monto || ''}
                onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) })}
                required
                placeholder="0.00"
                className="bg-slate-50 border-none font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategoria" className="text-xs font-bold text-slate-500 uppercase">Subcategoría / Concepto</Label>
            <Input 
              id="subcategoria" 
              value={formData.subcategoria}
              onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
              required
              placeholder="Ej: Supermercado, Alquiler..."
              className="bg-slate-50 border-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Categoría</Label>
              <Select 
                value={formData.categoria} 
                onValueChange={(v) => setFormData({ ...formData, categoria: v })}
              >
                <SelectTrigger className="bg-slate-50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.categoria} value={c.categoria}>{c.categoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Responsable</Label>
              <Select 
                value={formData.responsable} 
                onValueChange={(v) => setFormData({ ...formData, responsable: v })}
              >
                <SelectTrigger className="bg-slate-50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSIBLES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Prioridad</Label>
              <Select 
                value={formData.prioridad} 
                onValueChange={(v) => setFormData({ ...formData, prioridad: v as Priority })}
              >
                <SelectTrigger className="bg-slate-50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.prioridad === 'Esencial' && (
                <p className="text-[10px] text-blue-600 font-bold animate-pulse">
                  ⚠️ Pagar antes del día 10
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Tipo</Label>
              <Select 
                value={formData.tipo || 'Fijo'} 
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger className="bg-slate-50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fijo">Fijo</SelectItem>
                  <SelectItem value="Variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dia_vencimiento" className="text-xs font-bold text-slate-500 uppercase">Día Vencimiento (1-31)</Label>
              <Input 
                id="dia_vencimiento" 
                type="number" 
                min="1"
                max="31"
                value={formData.dia_vencimiento || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setFormData({ ...formData, dia_vencimiento: isNaN(val) ? 0 : val });
                }}
                className="bg-slate-50 border-none font-bold"
                placeholder={new Date().getDate().toString()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento_picker" className="text-xs font-bold text-slate-500 uppercase">Calcular día desde fecha</Label>
              <Input 
                id="fecha_vencimiento_picker" 
                type="date" 
                onChange={(e) => {
                  if (e.target.value) {
                    const date = new Date(e.target.value + 'T12:00:00');
                    setFormData({ ...formData, dia_vencimiento: date.getDate() });
                  }
                }}
                className="bg-slate-50 border-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Estado de Pago</Label>
              <Select 
                value={formData.estado_pago} 
                onValueChange={(v) => {
                  const newStatus = v as PaymentStatus;
                  setFormData({ 
                    ...formData, 
                    estado_pago: newStatus,
                    fecha_pago: newStatus === 'Pagado' ? format(new Date(), 'yyyy-MM-dd') : null
                  });
                }}
              >
                <SelectTrigger className="bg-slate-50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.estado_pago === 'Pagado' && (
              <div className="space-y-2">
                <Label htmlFor="fecha_pago" className="text-xs font-bold text-slate-500 uppercase">Fecha de Pago</Label>
                <Input 
                  id="fecha_pago" 
                  type="date" 
                  value={formData.fecha_pago || ''}
                  onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                  className="bg-slate-50 border-none"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="concepto" className="text-xs font-bold text-slate-500 uppercase">Descripción (Opcional)</Label>
            <Input 
              id="concepto" 
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              placeholder="Nota adicional..."
              className="bg-slate-50 border-none"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8">
              {expenseToEdit ? 'Guardar Cambios' : 'Registrar Gasto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
