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
import { Globe, Users, Phone, DollarSign, Database, Github, Code, TrendingUp, Info } from 'lucide-react';
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
    logo_url: '',
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

  // Tarea: Obtener mails únicos cargados para sugerencias
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

  const handleInputChange = (field: keyof IncomeInput, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Predictibilidad: Si se pega un repo de github y el mail está vacío,
      // podríamos sugerir o autocompletar con el último mail de github usado
      if (field === 'github_url' && value && !prev.github_email) {
        const lastGithubEmail = incomes.find(i => i.github_email)?.github_email;
        if (lastGithubEmail) newData.github_email = lastGithubEmail;
      }
      
      return newData;
    });
  };

  useEffect(() => {
    if (incomeToEdit) {
      setFormData({
        ...formData,
        ...incomeToEdit,
        cliente: incomeToEdit.cliente || '',
        telefono_cliente: incomeToEdit.telefono_cliente || incomeToEdit.cliente_contacto || '',
        descripcion_servicio: incomeToEdit.descripcion_servicio || incomeToEdit.concepto || '',
        logo_url: incomeToEdit.logo_url || (incomeToEdit.cloudinary_url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? incomeToEdit.cloudinary_url : ''),
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
        logo_url: '',
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
        <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-0">
          <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto px-1 pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-200">
            
            {/* BLOQUE A: DATOS DEL CLIENTE */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A. Datos del Cliente</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cliente" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre / Empresa</Label>
                  <Input 
                    id="cliente" 
                    value={formData.cliente}
                    onChange={(e) => handleInputChange('cliente', e.target.value)}
                    required
                    placeholder="Ej: PlayBook Inc..."
                    className="bg-white border-slate-200 px-4 h-10 rounded-xl shadow-sm text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefono_cliente" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                    <Input 
                      id="telefono_cliente" 
                      value={formData.telefono_cliente}
                      onChange={(e) => handleInputChange('telefono_cliente', e.target.value)}
                      placeholder="+54 9..."
                      className="bg-white border-slate-200 pl-9 h-10 rounded-xl shadow-sm text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUE B: SERVICIO Y COBRO */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">B. Servicio y Cuota</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="descripcion_servicio" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descripción / Mantenimiento</Label>
                  <Input 
                    id="descripcion_servicio" 
                    value={formData.descripcion_servicio}
                    onChange={(e) => handleInputChange('descripcion_servicio', e.target.value)}
                    required
                    placeholder="Ej: Administración de App de Gastos..."
                    className="bg-white border-slate-200 px-4 h-10 rounded-xl shadow-sm text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Monto Mensual</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={formData.moneda} 
                        onValueChange={(v: 'ARS' | 'USD') => handleMonedaChange(v)}
                      >
                        <SelectTrigger className="w-24 bg-white border-slate-200 rounded-xl font-bold h-10 shadow-sm text-sm">
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
                        placeholder="0"
                        className="bg-white border-slate-200 font-black text-slate-900 rounded-xl h-10 shadow-sm text-sm"
                      />
                    </div>
                  </div>

                  {formData.moneda === 'USD' ? (
                    <div className="space-y-1.5 animation-fade-in">
                      <Label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Equivalente ARS</Label>
                      <Input 
                        type="number" 
                        value={formData.monto_mensual_ars}
                        onChange={(e) => handleInputChange('monto_mensual_ars', parseFloat(e.target.value) || 0)}
                        required
                        placeholder="Monto en ARS..."
                        className="bg-blue-50/50 border-blue-100 font-black text-blue-900 rounded-xl h-10 shadow-sm text-sm"
                      />
                    </div>
                  ) : (
                    <div className="flex items-end pb-1 ml-1">
                      <p className="text-[10px] text-slate-400 italic">Vence día 10</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BLOQUE C: IDENTIDAD */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">C. Identidad Visual</h3>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group hover:border-blue-400 transition-all">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo Preview" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                  ) : (
                    <Users className="w-6 h-6 text-slate-200 group-hover:text-blue-200" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Logo URL (Cloudinary preferred)</Label>
                  <Input 
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    placeholder="https://cloudinary.com/..."
                    className="bg-slate-50 border-none px-4 h-10 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* BLOQUE D: ACCESOS TÉCNICOS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1 pl-1">
                <Code className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">D. Accesos Técnicos</h3>
              </div>
              
              <datalist id="existing-emails">
                {existingEmails.map(email => <option key={email} value={email} />)}
              </datalist>

              <div className="space-y-2">
                {/* Supabase Row */}
                <div className="flex flex-col md:flex-row gap-2 items-center bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 w-full md:w-32 px-2">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Supabase</span>
                  </div>
                  <Input 
                    value={formData.supabase_url}
                    onChange={(e) => handleInputChange('supabase_url', e.target.value)}
                    placeholder="URL Proyecto"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                  <Input 
                    value={formData.supabase_email}
                    onChange={(e) => handleInputChange('supabase_email', e.target.value)}
                    placeholder="Email Acceso"
                    list="existing-emails"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                </div>

                {/* GitHub Row */}
                <div className="flex flex-col md:flex-row gap-2 items-center bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 w-full md:w-32 px-2">
                    <Github className="w-3.5 h-3.5 text-slate-900" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">GitHub</span>
                  </div>
                  <Input 
                    value={formData.github_url}
                    onChange={(e) => handleInputChange('github_url', e.target.value)}
                    placeholder="URL Repo"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                  <Input 
                    value={formData.github_email}
                    onChange={(e) => handleInputChange('github_email', e.target.value)}
                    placeholder="Email/User"
                    list="existing-emails"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                </div>

                {/* AI Studio Row */}
                <div className="flex flex-col md:flex-row gap-2 items-center bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 w-full md:w-32 px-2">
                    <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">AI Studio</span>
                  </div>
                  <Input 
                    value={formData.ai_studio_url}
                    onChange={(e) => handleInputChange('ai_studio_url', e.target.value)}
                    placeholder="Prompt URL"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                  <Input 
                    value={formData.ai_studio_email}
                    onChange={(e) => handleInputChange('ai_studio_email', e.target.value)}
                    placeholder="Email Google"
                    list="existing-emails"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                </div>

                {/* Cloudinary Row */}
                <div className="flex flex-col md:flex-row gap-2 items-center bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 w-full md:w-32 px-2">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Cloudinary</span>
                  </div>
                  <Input 
                    value={formData.cloudinary_url}
                    onChange={(e) => handleInputChange('cloudinary_url', e.target.value)}
                    placeholder="Dashboard URL"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                  <Input 
                    value={formData.cloudinary_email}
                    onChange={(e) => handleInputChange('cloudinary_email', e.target.value)}
                    placeholder="Email Acceso"
                    list="existing-emails"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                </div>

                {/* VS Code Row */}
                <div className="flex flex-col md:flex-row gap-2 items-center bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 w-full md:w-32 px-2">
                    <Code className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase">VS Code</span>
                  </div>
                  <Input 
                    value={formData.vscode_url}
                    onChange={(e) => handleInputChange('vscode_url', e.target.value)}
                    placeholder="vscode://..."
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                  <Input 
                    value={formData.vscode_email}
                    onChange={(e) => handleInputChange('vscode_email', e.target.value)}
                    placeholder="Email Asociado"
                    list="existing-emails"
                    className="flex-1 bg-white border-slate-200 h-8 text-[11px] rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* BLOQUE E: NOTAS INTERNAS */}
            <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E. Notas e Información Local</h3>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vscode_info" className="text-[10px] font-bold text-slate-500 uppercase ml-1">Comandos / Notas</Label>
                <Input 
                  id="vscode_info" 
                  value={formData.vscode_info}
                  onChange={(e) => handleInputChange('vscode_info', e.target.value)}
                  placeholder="Ruta local, comandos de inicio, notas..."
                  className="bg-white border-slate-200 px-4 h-10 rounded-xl text-sm italic"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold text-slate-400">
              Cancelar
            </Button>
            <Button type="submit" className="bg-slate-900 hover:bg-black text-white rounded-xl px-12 font-black uppercase tracking-tight shadow-xl shadow-slate-200">
              {incomeToEdit ? 'Guardar Cambios' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
