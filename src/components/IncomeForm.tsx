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
  incomes?: Income[]; // Para sugerir mails ya usados
}

const METODOS_PAGO = ['Transferencia', 'Efectivo', 'Tarjeta', 'Depósito', 'Otro'];

export const IncomeForm: React.FC<IncomeFormProps> = ({ isOpen, onClose, onSubmit, incomeToEdit, incomes = [] }) => {
  const [formData, setFormData] = useState<IncomeInput>({
    cliente: '',
    telefono_cliente: '',
    descripcion_servicio: '',
    supabase_url: '',
    supabase_email: '',
    cloudinary_url: '',
    cloudinary_email: '',
    github_url: '',
    github_email: '',
    ai_studio_url: '',
    ai_studio_email: '',
    vscode_url: '',
    vscode_email: '',
    vscode_info: '',
    monto_mensual: 0,
    moneda: 'ARS',
    monto_mensual_ars: 0,
    dia_vencimiento: 10,
    // Fields for backward compatibility or internal logic
    concepto: '',
    monto_total: 0,
    monto_cobrado: 0,
    fecha_vencimiento: format(new Date(), 'yyyy-MM-dd'),
    estado_pago: 'Pendiente',
    metodo_pago: 'Transferencia',
    observaciones: '',
  });

  // Tarea 3: Obtener mails únicos cargados
  const existingEmails = React.useMemo(() => {
    const emails = new Set<string>();
    incomes.forEach(i => {
      if (i.supabase_email) emails.add(i.supabase_email);
      if (i.cloudinary_email) emails.add(i.cloudinary_email);
      if (i.github_email) emails.add(i.github_email);
      if (i.ai_studio_email) emails.add(i.ai_studio_email);
      if (i.vscode_email) emails.add(i.vscode_email);
    });
    return Array.from(emails).sort();
  }, [incomes]);

  useEffect(() => {
    if (incomeToEdit) {
      setFormData({
        ...formData,
        ...incomeToEdit,
        cliente: incomeToEdit.cliente || '',
        telefono_cliente: incomeToEdit.telefono_cliente || incomeToEdit.cliente_contacto || '',
        descripcion_servicio: incomeToEdit.descripcion_servicio || incomeToEdit.concepto || '',
        // Compatibilidad VS Code
        vscode_url: incomeToEdit.vscode_url || (incomeToEdit.vscode_info?.startsWith('http') ? incomeToEdit.vscode_info : ''),
        vscode_info: incomeToEdit.vscode_info || '',
        monto_mensual: incomeToEdit.monto_mensual || incomeToEdit.monto_total || 0,
        moneda: incomeToEdit.moneda || 'ARS',
        monto_mensual_ars: incomeToEdit.monto_mensual_ars || incomeToEdit.monto_total || 0,
        dia_vencimiento: incomeToEdit.dia_vencimiento || 10,
      });
    } else {
      setFormData({
        cliente: '',
        telefono_cliente: '',
        descripcion_servicio: '',
        supabase_url: '',
        supabase_email: '',
        cloudinary_url: '',
        cloudinary_email: '',
        github_url: '',
        github_email: '',
        ai_studio_url: '',
        ai_studio_email: '',
        vscode_url: '',
        vscode_email: '',
        vscode_info: '',
        monto_mensual: 0,
        moneda: 'ARS',
        monto_mensual_ars: 0,
        dia_vencimiento: 10,
        concepto: '',
        monto_total: 0,
        monto_cobrado: 0,
        fecha_vencimiento: format(new Date(), 'yyyy-MM-dd'),
        estado_pago: 'Pendiente',
        metodo_pago: 'Transferencia',
        observaciones: '',
      });
    }
  }, [incomeToEdit, isOpen]);

  const handleMontoMensualChange = (value: number) => {
    const newData = { ...formData, monto_mensual: value };
    if (newData.moneda === 'ARS') {
      newData.monto_mensual_ars = value;
    }
    setFormData(newData);
  };

  const handleMonedaChange = (moneda: 'ARS' | 'USD') => {
    const newData = { ...formData, moneda };
    if (moneda === 'ARS') {
      newData.monto_mensual_ars = newData.monto_mensual;
    }
    setFormData(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedData = {
      ...formData,
      // Tarea 3: Mapeo de compatibilidad
      cliente_contacto: formData.telefono_cliente,
      concepto: formData.descripcion_servicio,
      monto_total: formData.monto_mensual_ars,
      monto: formData.monto_mensual_ars,
      dia_vencimiento: 10,
      monto_cobrado: incomeToEdit?.monto_cobrado || 0,
      estado_pago: incomeToEdit?.estado_pago || 'Pendiente',
      fecha_vencimiento: format(new Date().setDate(10), 'yyyy-MM-dd'),
    };

    onSubmit({ ...normalizedData, id: incomeToEdit?.id });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {incomeToEdit ? 'Editar Cliente' : 'Nuevo Cliente / Aplicación'}
          </DialogTitle>
          <DialogDescription>
            Información técnica y comercial del servicio administrado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          
          {/* SECCIÓN 1: DATOS DEL CLIENTE */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-1">1. Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente" className="text-xs font-bold text-slate-500 uppercase">Nombre / Empresa</Label>
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
                <Label htmlFor="telefono_cliente" className="text-xs font-bold text-slate-500 uppercase">Teléfono de Contacto</Label>
                <Input 
                  id="telefono_cliente" 
                  value={formData.telefono_cliente}
                  onChange={(e) => setFormData({ ...formData, telefono_cliente: e.target.value })}
                  placeholder="+54 9..."
                  className="bg-slate-50 border-none px-4 py-2 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS DEL SERVICIO */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-1">2. Servicio Administrado</h3>
            <div className="space-y-2">
              <Label htmlFor="descripcion_servicio" className="text-xs font-bold text-slate-500 uppercase">Descripción / Mantenimiento</Label>
              <Input 
                id="descripcion_servicio" 
                value={formData.descripcion_servicio}
                onChange={(e) => setFormData({ ...formData, descripcion_servicio: e.target.value })}
                required
                placeholder="Ej: Administración de App de Gastos, Mantenimiento CRM..."
                className="bg-slate-50 border-none px-4 py-2 rounded-xl"
              />
              <p className="text-[10px] text-slate-400 italic">Describí qué aplicación o servicio se administra para este cliente</p>
            </div>
          </div>

          {/* SECCIÓN 3: LINKS Y ACCESOS */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-1">3. Credenciales y Links</h3>
            
            {/* Datalist para emails reutilizables */}
            <datalist id="existing-emails">
              {existingEmails.map(email => <option key={email} value={email} />)}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {/* Supabase */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Supabase URL / Email</Label>
                <div className="flex flex-col gap-1">
                  <Input 
                    value={formData.supabase_url}
                    onChange={(e) => setFormData({ ...formData, supabase_url: e.target.value })}
                    placeholder="URL del proyecto..."
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                  <Input 
                    value={formData.supabase_email}
                    onChange={(e) => setFormData({ ...formData, supabase_email: e.target.value })}
                    placeholder="Email de acceso..."
                    list="existing-emails"
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Cloudinary */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Cloudinary URL / Email</Label>
                <div className="flex flex-col gap-1">
                  <Input 
                    value={formData.cloudinary_url}
                    onChange={(e) => setFormData({ ...formData, cloudinary_url: e.target.value })}
                    placeholder="URL Dashboard..."
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                  <Input 
                    value={formData.cloudinary_email}
                    onChange={(e) => setFormData({ ...formData, cloudinary_email: e.target.value })}
                    placeholder="Email de acceso..."
                    list="existing-emails"
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* GitHub */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">GitHub Repo / Email</Label>
                <div className="flex flex-col gap-1">
                  <Input 
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                    placeholder="Repositorio..."
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                  <Input 
                    value={formData.github_email}
                    onChange={(e) => setFormData({ ...formData, github_email: e.target.value })}
                    placeholder="Cuenta GitHub asociada..."
                    list="existing-emails"
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* AI Studio */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">AI Studio / Email</Label>
                <div className="flex flex-col gap-1">
                  <Input 
                    value={formData.ai_studio_url}
                    onChange={(e) => setFormData({ ...formData, ai_studio_url: e.target.value })}
                    placeholder="URL Directa..."
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                  <Input 
                    value={formData.ai_studio_email}
                    onChange={(e) => setFormData({ ...formData, ai_studio_email: e.target.value })}
                    placeholder="Google account..."
                    list="existing-emails"
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* VS Code */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase">Link VS Code / Email</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  <Input 
                    value={formData.vscode_url}
                    onChange={(e) => setFormData({ ...formData, vscode_url: e.target.value })}
                    placeholder="Link VS Code (vscode://...)"
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                  <Input 
                    value={formData.vscode_email}
                    onChange={(e) => setFormData({ ...formData, vscode_email: e.target.value })}
                    placeholder="Email asociado..."
                    list="existing-emails"
                    className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vscode_info" className="text-xs font-bold text-slate-500 uppercase">Información Adicional (Comandos / Notas)</Label>
              <Input 
                id="vscode_info" 
                value={formData.vscode_info}
                onChange={(e) => setFormData({ ...formData, vscode_info: e.target.value })}
                placeholder="Ruta local, comandos de inicio, notas..."
                className="bg-slate-50 border-none px-4 py-2 rounded-xl"
              />
            </div>
          </div>

          {/* SECCIÓN 4: COBRO Y VENCIMIENTO */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-1">4. Modelo de Cobro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Cuota Mensual</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.moneda} 
                    onValueChange={(v: 'ARS' | 'USD') => handleMonedaChange(v)}
                  >
                    <SelectTrigger className="w-24 bg-slate-100 border-none rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    value={formData.monto_mensual}
                    onChange={(e) => handleMontoMensualChange(parseFloat(e.target.value) || 0)}
                    required
                    placeholder="0.00"
                    className="bg-slate-50 border-none font-bold text-slate-900 rounded-xl"
                  />
                </div>
              </div>

              {formData.moneda === 'USD' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-blue-600 uppercase">Equivalente en ARS</Label>
                  <Input 
                    type="number" 
                    value={formData.monto_mensual_ars}
                    onChange={(e) => setFormData({ ...formData, monto_mensual_ars: parseFloat(e.target.value) || 0 })}
                    required
                    placeholder="Monto en ARS..."
                    className="bg-blue-50 border-blue-100 font-bold text-blue-900 rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-amber-700">Vence automáticamente el día 10</span>
              </div>
              <span className="text-[10px] font-black text-amber-400 uppercase">Sistema automático</span>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-12 font-bold uppercase tracking-tight">
              {incomeToEdit ? 'Guardar Cambios' : 'Registrar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
