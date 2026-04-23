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
import { Income, IncomeInput, PaymentStatus } from '../types';
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
    cliente_contacto: '',
    cliente_enlace: '',
    concepto: '',
    monto_total: 0,
    monto_cobrado: 0,
    fecha_vencimiento: format(new Date(), 'yyyy-MM-dd'),
    fecha_cobro: '',
    estado_pago: 'Pendiente',
    metodo_pago: 'Transferencia',
    observaciones: '',
  });

  useEffect(() => {
    if (incomeToEdit) {
      setFormData({
        cliente: incomeToEdit.cliente || '',
        cliente_contacto: incomeToEdit.cliente_contacto || '',
        cliente_enlace: incomeToEdit.cliente_enlace || '',
        concepto: incomeToEdit.concepto || '',
        monto_total: incomeToEdit.monto_total ?? incomeToEdit.monto ?? 0,
        monto_cobrado: incomeToEdit.monto_cobrado ?? (incomeToEdit.estado_pago === 'Pagado' ? (incomeToEdit.monto_total ?? incomeToEdit.monto ?? 0) : 0),
        fecha_vencimiento: incomeToEdit.fecha_vencimiento ?? incomeToEdit.fecha ?? format(new Date(), 'yyyy-MM-dd'),
        fecha_cobro: incomeToEdit.fecha_cobro || '',
        estado_pago: incomeToEdit.estado_pago || 'Pendiente',
        metodo_pago: incomeToEdit.metodo_pago || 'Transferencia',
        observaciones: incomeToEdit.observaciones || '',
      });
    } else {
      setFormData({
        cliente: '',
        cliente_contacto: '',
        cliente_enlace: '',
        concepto: '',
        monto_total: 0,
        monto_cobrado: 0,
        fecha_vencimiento: format(new Date(), 'yyyy-MM-dd'),
        fecha_cobro: '',
        estado_pago: 'Pendiente',
        metodo_pago: 'Transferencia',
        observaciones: '',
      });
    }
  }, [incomeToEdit, isOpen]);

  // Lógica de estado automática
  const calculateStatus = (total: number, cobrado: number): PaymentStatus => {
    if (cobrado >= total && total > 0) return 'Pagado';
    if (cobrado > 0) return 'Parcial';
    return 'Pendiente';
  };

  const handleMontoChange = (field: 'monto_total' | 'monto_cobrado', value: number) => {
    const newData = { ...formData, [field]: value };
    newData.estado_pago = calculateStatus(newData.monto_total, newData.monto_cobrado);
    
    // Si se marca como pagado o parcial y no hay fecha de cobro, sugerir hoy
    if ((newData.estado_pago === 'Pagado' || newData.estado_pago === 'Parcial') && !newData.fecha_cobro) {
      newData.fecha_cobro = format(new Date(), 'yyyy-MM-dd');
    }
    
    setFormData(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const status = calculateStatus(formData.monto_total, formData.monto_cobrado);
    const normalizedData = {
      ...formData,
      monto_total: Number(formData.monto_total) || 0,
      monto_cobrado: Number(formData.monto_cobrado) || 0,
      estado_pago: status,
      // Compatibilidad con tabla vieja si fuera necesario
      monto: Number(formData.monto_total) || 0,
      fecha: formData.fecha_cobro || formData.fecha_vencimiento
    };

    onSubmit({ ...normalizedData, id: incomeToEdit?.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {incomeToEdit ? 'Editar Cliente / Cobro' : 'Nuevo Cliente / Cobro'}
          </DialogTitle>
          <DialogDescription>
            Gestiona la información de tus clientes y el estado de sus pagos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="cliente_contacto" className="text-xs font-bold text-slate-500 uppercase">Teléfono / Contacto</Label>
              <Input 
                id="cliente_contacto" 
                value={formData.cliente_contacto}
                onChange={(e) => setFormData({ ...formData, cliente_contacto: e.target.value })}
                placeholder="+54 9..."
                className="bg-slate-50 border-none px-4 py-2 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente_enlace" className="text-xs font-bold text-slate-500 uppercase">Web / Red Social / Enlace</Label>
            <Input 
              id="cliente_enlace" 
              value={formData.cliente_enlace}
              onChange={(e) => setFormData({ ...formData, cliente_enlace: e.target.value })}
              placeholder="https://instagram.com/..."
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
              <Label htmlFor="monto_total" className="text-xs font-bold text-slate-500 uppercase">Monto Total ($)</Label>
              <Input 
                id="monto_total" 
                type="number" 
                step="0.01"
                value={formData.monto_total}
                onChange={(e) => handleMontoChange('monto_total', parseFloat(e.target.value) || 0)}
                required
                placeholder="0.00"
                className="bg-slate-50 border-none font-bold text-slate-900 px-4 py-2 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto_cobrado" className="text-xs font-bold text-slate-500 uppercase">Monto Cobrado ($)</Label>
              <Input 
                id="monto_cobrado" 
                type="number" 
                step="0.01"
                value={formData.monto_cobrado}
                onChange={(e) => handleMontoChange('monto_cobrado', parseFloat(e.target.value) || 0)}
                required
                placeholder="0.00"
                className={`bg-slate-50 border-none font-bold px-4 py-2 rounded-xl ${
                  formData.estado_pago === 'Pagado' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento" className="text-xs font-bold text-slate-500 uppercase">Vencimiento Cobro</Label>
              <Input 
                id="fecha_vencimiento" 
                type="date" 
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                required
                className="bg-slate-50 border-none px-4 py-2 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_cobro" className="text-xs font-bold text-slate-500 uppercase">Fecha de Cobro</Label>
              <Input 
                id="fecha_cobro" 
                type="date" 
                value={formData.fecha_cobro}
                onChange={(e) => setFormData({ ...formData, fecha_cobro: e.target.value })}
                className="bg-slate-50 border-none px-4 py-2 rounded-xl text-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2 text-right">
              <Label className="text-xs font-bold text-slate-500 uppercase">Estado Detectado</Label>
              <div className={`text-sm font-black py-2 pr-2 ${
                formData.estado_pago === 'Pagado' ? 'text-emerald-600' : 
                formData.estado_pago === 'Parcial' ? 'text-amber-600' : 'text-red-500'
              }`}>
                {formData.estado_pago}
              </div>
            </div>
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
              {incomeToEdit ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
