import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

const METODOS_PAGO = ['Transferencia', 'Efectivo'];

export const IncomeForm: React.FC<IncomeFormProps> = ({ isOpen, onClose, onSubmit, incomeToEdit, incomes = [] }) => {
  const [formData, setFormData] = useState<IncomeInput>({
    cliente: '',
    telefono_cliente: '',
    descripcion_servicio: 'AppSheet', // Default value
    logo_url: '',
    supabase_url: '',
    supabase_email: '',
    cloudinary_url: '',
    cloudinary_email: '',
    github_url: '',
    github_email: '',
    project_url: '',
    link_app: '',
    email_editor: '',
    ai_studio_url: '',
    ai_studio_email: '',
    vscode_url: '',
    vscode_email: '',
    vscode_info: '',
    monto_mensual: 0,
    moneda: 'ARS',
    monto_mensual_ars: 0,
    dia_vencimiento: 10,
    estado: 'activo',
    // Fields for backward compatibility or internal logic
    concepto: '',
    monto_total: 0,
    monto_cobrado: 0,
    fecha_vencimiento: format(new Date(), 'yyyy-MM-dd'),
    estado_pago: 'Pendiente',
    metodo_pago: 'Transferencia',
    observaciones: '',
  });

  const [techModality, setTechModality] = useState<'AI Studio' | 'VSCode'>('AI Studio');

  // Tarea: Obtener mails únicos cargados para sugerencias
  const existingEmails = React.useMemo(() => {
    const emails = new Set<string>();
    incomes.forEach(i => {
      if (i.supabase_email) emails.add(i.supabase_email);
      if (i.cloudinary_email) emails.add(i.cloudinary_email);
      if (i.github_email) emails.add(i.github_email);
      if (i.email_editor) emails.add(i.email_editor);
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
        descripcion_servicio: incomeToEdit.descripcion_servicio || 'AppSheet',
        logo_url: incomeToEdit.logo_url || (incomeToEdit.cloudinary_url?.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? incomeToEdit.cloudinary_url : ''),
        project_url: incomeToEdit.project_url || incomeToEdit.link_app || '',
        link_app: incomeToEdit.link_app || incomeToEdit.project_url || '',
        email_editor: incomeToEdit.email_editor || '',
        // Compatibilidad VS Code
        vscode_url: incomeToEdit.vscode_url || (incomeToEdit.vscode_info?.startsWith('http') ? incomeToEdit.vscode_info : ''),
        vscode_info: incomeToEdit.vscode_info || '',
        monto_mensual: incomeToEdit.monto_mensual || incomeToEdit.monto_total || 0,
        moneda: incomeToEdit.moneda || 'ARS',
        monto_mensual_ars: incomeToEdit.monto_mensual_ars || incomeToEdit.monto_total || 0,
        dia_vencimiento: incomeToEdit.dia_vencimiento || 10,
        estado: incomeToEdit.estado || 'activo',
      });
      if (incomeToEdit.ai_studio_url || incomeToEdit.ai_studio_email) {
        setTechModality('AI Studio');
      } else if (incomeToEdit.vscode_url || incomeToEdit.vscode_info) {
        setTechModality('VSCode');
      }
    } else {
      setFormData({
        cliente: '',
        telefono_cliente: '',
        descripcion_servicio: 'AppSheet',
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
        estado: 'activo',
        concepto: '',
        monto_total: 0,
        monto_cobrado: 0,
        fecha_vencimiento: format(new Date(), 'yyyy-MM-dd'),
        estado_pago: 'Pendiente',
        metodo_pago: 'Transferencia',
        observaciones: '',
      });
      setTechModality('AI Studio');
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
      <DialogContent className="max-md:h-auto max-md:max-h-[95dvh] max-md:p-0 max-md:gap-0 sm:max-w-5xl md:max-w-6xl lg:max-w-7xl sm:rounded-[2.5rem] overflow-hidden p-0 flex flex-col gap-0 border-none sm:border shadow-2xl w-[95vw] max-w-none">
        <div className="p-6 md:p-8 border-b bg-slate-50/50 shrink-0 pt-10 md:pt-8">
          <DialogHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {incomeToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                  Gestiona la información comercial y técnica del servicio.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 self-start md:self-center">
                <button
                  type="button"
                  onClick={() => handleInputChange('estado', 'activo')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.estado === 'activo' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('estado', 'inactivo')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.estado === 'inactivo' ? 'bg-slate-400 text-white shadow-lg shadow-slate-100' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Inactivo
                </button>
              </div>
            </div>
          </DialogHeader>
        </div>
        <form id="income-form" onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col overflow-x-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 modal-scroll overflow-x-hidden">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 overflow-x-hidden">
              {/* IZQUIERDA: COMERCIAL */}
              <div className="space-y-6">
                <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">A. Información Comercial</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Cliente / Empresa</Label>
                      <Input 
                        value={formData.cliente || ''}
                        onChange={(e) => handleInputChange('cliente', e.target.value)}
                        required
                        placeholder="Nombre de la empresa..."
                        className="h-12 bg-white border-slate-200 rounded-2xl px-4 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Teléfono (WhatsApp)</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input 
                          value={formData.telefono_cliente || ''}
                          onChange={(e) => handleInputChange('telefono_cliente', e.target.value)}
                          placeholder="+54 9..."
                          className="h-12 bg-white border-slate-200 pl-11 rounded-2xl font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Tipo de Servicio</Label>
                      <Select 
                        value={formData.descripcion_servicio || 'AppSheet'} 
                        onValueChange={(v) => handleInputChange('descripcion_servicio', v)}
                      >
                        <SelectTrigger className="h-12 bg-white border-slate-200 rounded-2xl px-4 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100">
                          <SelectItem value="AppSheet">AppSheet</SelectItem>
                          <SelectItem value="App IA">App IA</SelectItem>
                          <SelectItem value="Asesoría">Asesoría</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">B. Plan y Cobro</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-hidden">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Monto Mensual</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={formData.moneda || 'ARS'} 
                          onValueChange={(v: 'ARS' | 'USD') => handleMonedaChange(v)}
                        >
                          <SelectTrigger className="w-24 bg-slate-800 border-slate-700 rounded-xl font-bold h-10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="ARS">ARS</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input 
                          type="number"
                          value={formData.monto_mensual ?? 0}
                          onChange={(e) => handleMontoMensualChange(parseFloat(e.target.value) || 0)}
                          className="h-10 bg-slate-800 border-slate-700 rounded-xl px-4 font-black text-white"
                        />
                      </div>
                    </div>
                    {formData.moneda === 'USD' && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Eq. en ARS</Label>
                        <Input 
                          type="number"
                          value={formData.monto_mensual_ars ?? 0}
                          onChange={(e) => handleInputChange('monto_mensual_ars', parseFloat(e.target.value) || 0)}
                          className="h-10 bg-blue-900/50 border-blue-800 rounded-xl px-4 font-black text-blue-100"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DERECHA: TÉCNICO */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-slate-400" />
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">C. Configuración Técnica</h3>
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTechModality('AI Studio')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${techModality === 'AI Studio' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                      >
                        AI Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechModality('VSCode')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${techModality === 'VSCode' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                      >
                        VSCode
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {techModality === 'AI Studio' ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">URL Applet AI Studio</Label>
                          <div className="relative">
                            <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                            <Input 
                              value={formData.ai_studio_url || ''}
                              onChange={(e) => handleInputChange('ai_studio_url', e.target.value)}
                              placeholder="https://ai.studio/..."
                              className="h-10 bg-slate-50 border-none pl-11 rounded-xl font-medium text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Email Acceso</Label>
                          <Input 
                            value={formData.ai_studio_email || ''}
                            onChange={(e) => handleInputChange('ai_studio_email', e.target.value)}
                            placeholder="mail@acceso.com"
                            list="existing-emails"
                            className="h-10 bg-slate-50 border-none rounded-xl px-4 font-medium text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
                          <div className="p-2 bg-white rounded-xl text-blue-500 shadow-sm">
                            <Code className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-blue-900 uppercase tracking-tight">Trabajo Local / VSCode</p>
                            <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
                              Modalidad de desarrollo local. Los accesos se gestionan vía GitHub.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Info / Notas VSCode</Label>
                          <Input 
                            value={formData.vscode_info || ''}
                            onChange={(e) => handleInputChange('vscode_info', e.target.value)}
                            placeholder="Comandos, versión, requisitos..."
                            className="h-10 bg-slate-50 border-none rounded-xl px-4 font-medium text-xs italic"
                          />
                        </div>
                      </div>
                    )}

                    <Separator className="bg-slate-100" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-x-hidden">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">Supabase</span>
                        </div>
                        <Input 
                          value={formData.supabase_url || ''}
                          onChange={(e) => handleInputChange('supabase_url', e.target.value)}
                          placeholder="Link de Supabase"
                          className="h-8 bg-slate-50 border-none rounded-lg px-3 text-[10px]"
                        />
                        <Input 
                          value={formData.supabase_email || ''}
                          onChange={(e) => handleInputChange('supabase_email', e.target.value)}
                          placeholder="Mail usado en Supabase"
                          list="existing-emails"
                          className="h-8 bg-slate-50 border-none rounded-lg px-3 text-[10px]"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Github className="w-3 h-3 text-slate-900" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">GitHub</span>
                        </div>
                        <Input 
                          value={formData.github_url || ''}
                          onChange={(e) => handleInputChange('github_url', e.target.value)}
                          placeholder="Link del repositorio"
                          className="h-8 bg-slate-50 border-none rounded-lg px-3 text-[10px]"
                        />
                        <Input 
                          value={formData.github_email || ''}
                          onChange={(e) => handleInputChange('github_email', e.target.value)}
                          placeholder="Mail usado en GitHub"
                          list="existing-emails"
                          className="h-8 bg-slate-50 border-none rounded-lg px-3 text-[10px]"
                        />
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3 h-3 text-blue-500" />
                          <span className="text-[10px] font-black text-slate-400 uppercase">Vercel / App publicada</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input 
                            value={formData.project_url || formData.link_app || ''}
                            onChange={(e) => {
                              handleInputChange('project_url', e.target.value);
                              handleInputChange('link_app', e.target.value);
                            }}
                            placeholder="Link de Vercel / App"
                            className="h-8 bg-slate-50 border-none rounded-lg px-3 text-[10px]"
                          />
                          <Input 
                            value={formData.email_editor || ''}
                            onChange={(e) => handleInputChange('email_editor', e.target.value)}
                            placeholder="Mail usado en Vercel"
                            list="existing-emails"
                            className="h-8 bg-slate-50 border-none rounded-lg px-3 text-[10px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">D. Identidad</h3>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-sm p-3 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo URL</Label>
                      <Input 
                        value={formData.logo_url || ''}
                        onChange={(e) => handleInputChange('logo_url', e.target.value)}
                        placeholder="Link a imagen..."
                        className="h-10 bg-white border-slate-200 rounded-xl px-4 text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 md:p-8 border-t shrink-0 flex items-center justify-between bg-white gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1 rounded-2xl font-bold text-slate-400 h-12 px-6 border-none">
              Cancelar
            </Button>
            <Button form="income-form" type="submit" className="flex-2 bg-slate-900 hover:bg-black text-white rounded-2xl h-12 px-12 font-black uppercase tracking-tight shadow-xl shadow-slate-200 transition-all active:scale-95">
              {incomeToEdit ? 'GUARDAR' : 'REGISTRAR'}
            </Button>
          </DialogFooter>
        </form>
        <datalist id="existing-emails">
          {existingEmails.map(email => <option key={email} value={email} />)}
        </datalist>
      </DialogContent>
    </Dialog>
  );
};
