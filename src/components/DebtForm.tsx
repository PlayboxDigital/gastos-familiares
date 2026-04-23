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
import { Debt, DebtStatus, DebtInput } from '../types';
import { format } from 'date-fns';

interface DebtFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (debt: DebtInput & { id?: string }) => void;
  debtToEdit?: Debt | null;
}

export const DebtForm: React.FC<DebtFormProps> = ({ isOpen, onClose, onSubmit, debtToEdit }) => {
  const [formData, setFormData] = useState<DebtInput>({
    acreedor: '',
    concepto: '',
    monto_total: 0,
    monto_pagado: 0,
    fecha: format(new Date(), 'yyyy-MM-dd'),
    estado: 'pendiente',
    observaciones: '',
  });

  useEffect(() => {
    if (debtToEdit) {
      setFormData({
        acreedor: debtToEdit.acreedor,
        concepto: debtToEdit.concepto,
        monto_total: debtToEdit.monto_total,
        monto_pagado: debtToEdit.monto_pagado,
        fecha: debtToEdit.fecha,
        estado: debtToEdit.estado,
        observaciones: debtToEdit.observaciones || '',
      });
    } else {
      setFormData({
        acreedor: '',
        concepto: '',
        monto_total: 0,
        monto_pagado: 0,
        fecha: format(new Date(), 'yyyy-MM-dd'),
        estado: 'pendiente',
        observaciones: '',
      });
    }
  }, [debtToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalizar montos
    const normalizedData = {
      ...formData,
      monto_total: Number(formData.monto_total) || 0,
      monto_pagado: Number(formData.monto_pagado) || 0,
    };

    if (normalizedData.monto_pagado > normalizedData.monto_total) {
      alert("El monto pagado no puede ser mayor al monto total de la deuda.");
      return;
    }

    onSubmit({ ...normalizedData, id: debtToEdit?.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {debtToEdit ? 'Editar Deuda' : 'Nueva Deuda'}
          </DialogTitle>
          <DialogDescription>
            Registra deudas con personas o entidades externas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="acreedor" className="text-xs font-bold text-slate-500 uppercase">Acreedor (¿A quién se le debe?)</Label>
            <Input 
              id="acreedor" 
              value={formData.acreedor}
              onChange={(e) => setFormData({ ...formData, acreedor: e.target.value })}
              required
              placeholder="Ej: Banco, Amigo, Préstamo..."
              className="bg-slate-50 border-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concepto_deuda" className="text-xs font-bold text-slate-500 uppercase">Concepto</Label>
            <Input 
              id="concepto_deuda" 
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
              placeholder="Ej: Préstamo personal, Tarjeta de crédito..."
              className="bg-slate-50 border-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto_total" className="text-xs font-bold text-slate-500 uppercase">Monto Total ($)</Label>
              <Input 
                id="monto_total" 
                type="number" 
                step="0.01"
                value={formData.monto_total}
                onChange={(e) => setFormData({ ...formData, monto_total: parseFloat(e.target.value) || 0 })}
                required
                placeholder="0.00"
                className="bg-slate-50 border-none font-bold text-blue-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto_pagado" className="text-xs font-bold text-slate-500 uppercase">Monto Pagado ($)</Label>
              <Input 
                id="monto_pagado" 
                type="number" 
                step="0.01"
                value={formData.monto_pagado}
                onChange={(e) => setFormData({ ...formData, monto_pagado: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="bg-slate-50 border-none font-bold text-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_deuda" className="text-xs font-bold text-slate-500 uppercase">Fecha Inicial</Label>
              <Input 
                id="fecha_deuda" 
                type="date" 
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
                className="bg-slate-50 border-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Estado</Label>
              <Select 
                value={formData.estado} 
                onValueChange={(v) => setFormData({ ...formData, estado: v as DebtStatus })}
              >
                <SelectTrigger className="bg-slate-50 border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-xs font-bold text-slate-500 uppercase">Observaciones (Opcional)</Label>
            <Input 
              id="observaciones" 
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Nota adicional..."
              className="bg-slate-50 border-none"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8">
              {debtToEdit ? 'Guardar Cambios' : 'Registrar Deuda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
