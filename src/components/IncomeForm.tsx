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
import { Income, IncomeInput } from '../types';
import { format } from 'date-fns';

interface IncomeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (income: IncomeInput & { id?: string }) => void;
  incomeToEdit?: Income | null;
}

const METODOS_PAGO = ['Transferencia', 'Efectivo', 'Tarjeta', 'Depósito', 'Otro'];

export const IncomeForm: React.FC<IncomeFormProps> = ({ isOpen, onClose, onSubmit, incomeToEdit }) => {
  const [formData, setFormData] = useState<IncomeInput>({
    cliente: '',
    concepto: '',
    monto: 0,
    fecha: format(new Date(), 'yyyy-MM-dd'),
    metodo_pago: 'Transferencia',
    observaciones: '',
  });

  useEffect(() => {
    if (incomeToEdit) {
      setFormData({
        cliente: incomeToEdit.cliente,
        concepto: incomeToEdit.concepto,
        monto: incomeToEdit.monto,
        fecha: incomeToEdit.fecha,
        metodo_pago: incomeToEdit.metodo_pago,
        observaciones: incomeToEdit.observaciones || '',
      });
    } else {
      setFormData({
        cliente: '',
        concepto: '',
        monto: 0,
        fecha: format(new Date(), 'yyyy-MM-dd'),
        metodo_pago: 'Transferencia',
        observaciones: '',
      });
    }
  }, [incomeToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedData = {
      ...formData,
      monto: Number(formData.monto) || 0,
    };

    onSubmit({ ...normalizedData, id: incomeToEdit?.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {incomeToEdit ? 'Editar Ingreso' : 'Nuevo Ingreso'}
          </DialogTitle>
          <DialogDescription>
            Registra los ingresos recibidos de clientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cliente" className="text-xs font-bold text-slate-500 uppercase">Cliente</Label>
            <Input 
              id="cliente" 
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              required
              placeholder="Nombre del cliente..."
              className="bg-slate-50 border-none px-4 py-2 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concepto_ingreso" className="text-xs font-bold text-slate-500 uppercase">Concepto / Servicio</Label>
            <Input 
              id="concepto_ingreso" 
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              required
              placeholder="Ej: Desarrollo web, Consultoría..."
              className="bg-slate-50 border-none px-4 py-2 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto_ingreso" className="text-xs font-bold text-slate-500 uppercase">Monto ($)</Label>
              <Input 
                id="monto_ingreso" 
                type="number" 
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                required
                placeholder="0.00"
                className="bg-slate-50 border-none font-bold text-emerald-600 px-4 py-2 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_ingreso" className="text-xs font-bold text-slate-500 uppercase">Fecha</Label>
              <Input 
                id="fecha_ingreso" 
                type="date" 
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
                className="bg-slate-50 border-none px-4 py-2 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Método de Pago</Label>
            <Select 
              value={formData.metodo_pago} 
              onValueChange={(v) => setFormData({ ...formData, metodo_pago: v })}
            >
              <SelectTrigger className="bg-slate-50 border-none px-4 py-2 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-xs font-bold text-slate-500 uppercase">Observaciones (Opcional)</Label>
            <Input 
              id="observaciones" 
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Nota adicional..."
              className="bg-slate-50 border-none px-4 py-2 rounded-xl"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8">
              {incomeToEdit ? 'Guardar Cambios' : 'Registrar Ingreso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
