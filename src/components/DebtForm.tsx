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

  const handleChange = React.useCallback((field: keyof DebtInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

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
      <DialogContent className="max-md:p-0 max-md:gap-0 sm:max-w-[425px] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto modal-scroll px-6 py-6 pt-10 md:pt-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {debtToEdit ? 'Editar Deuda' : 'Nueva Deuda'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Registra deudas con personas o entidades externas.
            </DialogDescription>
          </DialogHeader>

          <form id="debt-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
            <div className="space-y-2">
              <Label htmlFor="acreedor" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Acreedor (¿A quién se le debe?)</Label>
              <Input 
                id="acreedor" 
                value={formData.acreedor}
                onChange={(e) => handleChange('acreedor', e.target.value)}
                required
                placeholder="Ej: Banco, Amigo, Préstamo..."
                className="h-12 bg-slate-50 border-none rounded-xl focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepto_deuda" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Concepto</Label>
              <Input 
                id="concepto_deuda" 
                value={formData.concepto}
                onChange={(e) => handleChange('concepto', e.target.value)}
                required
                placeholder="Ej: Préstamo personal, Tarjeta de crédito..."
                className="h-12 bg-slate-50 border-none rounded-xl focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monto_total" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Monto Total</Label>
                <Input 
                  id="monto_total" 
                  type="number" 
                  step="0.01"
                  inputMode="decimal"
                  value={formData.monto_total}
                  onChange={(e) => handleChange('monto_total', parseFloat(e.target.value) || 0)}
                  required
                  placeholder="0.00"
                  className="h-12 bg-slate-50 border-none font-bold text-blue-600 rounded-xl focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monto_pagado" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Monto Pagado</Label>
                <Input 
                  id="monto_pagado" 
                  type="number" 
                  step="0.01"
                  inputMode="decimal"
                  value={formData.monto_pagado}
                  onChange={(e) => handleChange('monto_pagado', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-12 bg-slate-50 border-none font-bold text-emerald-600 rounded-xl focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_deuda" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Fecha Inicial</Label>
                <Input 
                  id="fecha_deuda" 
                  type="date" 
                  value={formData.fecha}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  required
                  className="h-12 bg-slate-50 border-none rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Estado</Label>
                <Select 
                  value={formData.estado} 
                  onValueChange={(v) => handleChange('estado', v as DebtStatus)}
                >
                  <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="pendiente" className="rounded-lg">Pendiente</SelectItem>
                    <SelectItem value="parcial" className="rounded-lg">Parcial</SelectItem>
                    <SelectItem value="pagada" className="rounded-lg">Pagada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones</Label>
              <Input 
                id="observaciones" 
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                placeholder="Nota adicional..."
                className="h-12 bg-slate-50 border-none rounded-xl"
              />
            </div>
          </form>
        </div>

        <DialogFooter className="bg-white px-6 py-4 flex flex-row gap-3">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-2xl h-12 font-bold text-slate-400 active:scale-95 transition-transform">
            CANCELAR
          </Button>
          <Button form="debt-form" type="submit" className="flex-2 bg-slate-900 hover:bg-black text-white rounded-2xl h-12 font-black uppercase tracking-widest text-xs active:scale-95 transition-transform">
            {debtToEdit ? 'GUARDAR' : 'REGISTRAR'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
