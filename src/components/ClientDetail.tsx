import React, { useState, useEffect } from 'react';
import { Income, PaymentStatus, IngresoPago, IngresoPagoInput } from '../types';
import { 
  X, Phone, Globe, Database, Github, Code, TrendingUp, Mail, 
  ExternalLink, Edit2, Calendar, DollarSign, Info, Shield, Server, Users,
  Plus, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { incomesService } from '../services/Clientes';

interface ClientDetailProps {
  income: Income;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (income: Income) => void;
}

export const ClientDetail: React.FC<ClientDetailProps> = ({ income, isOpen, onClose, onEdit }) => {
  const [pagos, setPagos] = useState<IngresoPago[]>([]);
  const [isLoadingPagos, setIsLoadingPagos] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [montoPagado, setMontoPagado] = useState<number>(income.monto_mensual || 0);
  const [periodo, setPeriodo] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (isOpen && income.id) {
      cargarPagos();
    }
  }, [isOpen, income.id]);

  const cargarPagos = async () => {
    setIsLoadingPagos(true);
    try {
      const data = await incomesService.obtenerPagosPorIngreso(income.id);
      setPagos(data);
    } catch (error) {
      console.error("Error al cargar pagos:", error);
    } finally {
      setIsLoadingPagos(false);
    }
  };

  const handleRegistrarPago = async () => {
    if (montoPagado < 0) return;
    
    setIsRegistering(true);
    const montoEsperado = income.monto_mensual || 0;
    
    let estado: PaymentStatus = 'Pendiente';
    if (montoPagado >= montoEsperado) {
      estado = 'Pagado';
    } else if (montoPagado > 0) {
      estado = 'Parcial';
    }

    const nuevoPago: IngresoPagoInput = {
      ingreso_id: income.id,
      cliente: income.cliente,
      periodo,
      monto: montoEsperado,
      monto_pagado: montoPagado,
      fecha_pago: fechaPago,
      estado,
      observacion
    };

    try {
      await incomesService.registrarPago(nuevoPago);
      await cargarPagos();
      setShowForm(false);
      setObservacion('');
    } catch (error) {
      console.error("Error al registrar pago:", error);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactivo': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'finalizado': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'Pagado': return 'bg-emerald-50 text-emerald-600';
      case 'Parcial': return 'bg-amber-50 text-amber-600';
      default: return 'bg-red-50 text-red-600';
    }
  };

  const getDbSystem = (income: Income) => {
    const dbType = income.db_type?.toLowerCase();
    const dbLink = (income.link_db || income.supabase_url || '').toLowerCase();
    const appLink = (income.link_app || income.project_url || '').toLowerCase();

    if (dbType === 'google_sheets' || dbLink.includes('docs.google.com')) {
      return { label: 'Google Sheets', className: 'bg-amber-100 text-amber-700 border-amber-200', iconColor: 'bg-amber-500', type: 'google_sheets' };
    } else if (dbType === 'appsheet' || appLink.includes('appsheet.com')) {
      return { label: 'AppSheet', className: 'bg-blue-100 text-blue-700 border-blue-200', iconColor: 'bg-blue-500', type: 'appsheet' };
    } else if (dbType === 'supabase' || dbLink.includes('supabase.com')) {
      return { label: 'Supabase', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', iconColor: 'bg-emerald-500', type: 'supabase' };
    } else {
      return { label: 'Sin sistema', className: 'bg-slate-100 text-slate-700 border-slate-200', iconColor: 'bg-slate-500', type: 'none' };
    }
  };

  const getDbTypeBadge = (income: Income) => {
    return getDbSystem(income);
  };

  const TechCard = ({ icon: Icon, label, url, email, colorClass }: any) => {
    if (!url && !email) return null;
    return (
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
        <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`} />
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</span>
        </div>
        <div className="space-y-1">
          {email && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Mail className="w-3 h-3 opacity-50" />
              <span className="text-[11px] font-mono truncate">{email}</span>
            </div>
          )}
          {url && (
            <div 
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 cursor-pointer overflow-hidden"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
              <span className="text-[10px] truncate underline decoration-blue-200 underline-offset-2">{url}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full h-full sm:h-auto sm:max-w-4xl sm:rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col sm:max-h-[90vh]"
      >
        {/* Header Section */}
        <div className="p-4 md:p-8 bg-slate-50/50 border-b border-slate-100 shrink-0 mt-[env(safe-area-inset-top)] sm:mt-0">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 md:gap-6 items-center flex-1 min-w-0">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-white shadow-xl shadow-slate-100 flex items-center justify-center p-2 md:p-3 relative group shrink-0">
                {income.logo_url ? (
                  <img src={income.logo_url} alt={income.cliente} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-slate-200" />
                )}
                <Badge className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-lg border shadow-sm ${getStatusBadge(income.estado || 'activo')}`}>
                  {income.estado || 'activo'}
                </Badge>
              </div>
              <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <h2 className="text-xl md:text-3xl font-black text-slate-900 leading-tight truncate">
                    {income.cliente}
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const dbBadge = getDbTypeBadge(income);
                      return (
                        <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[9px] md:text-[10px] font-black uppercase tracking-tighter border shadow-none ${dbBadge.className}`}>
                          {dbBadge.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-lg bg-white border-slate-200 text-slate-400 font-bold px-1.5 py-0 text-[10px]">ID: {income.id.substring(0, 8)}</Badge>
                  <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{income.descripcion_servicio || income.concepto}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1 md:gap-2 ml-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-slate-200 font-bold flex h-9 md:h-10 px-2 md:px-4 hover:bg-slate-50 transition-all sm:flex hidden"
                onClick={() => onEdit(income)}
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Editar</span>
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-xl h-9 w-9 md:h-10 md:w-10 text-slate-400"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex sm:hidden gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-slate-200 font-bold flex-1 h-9 px-4 hover:bg-slate-50 transition-all"
              onClick={() => onEdit(income)}
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-600 mr-2" />
              <span>Editar</span>
            </Button>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 modal-scroll mb-[env(safe-area-inset-bottom)] sm:mb-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Core Financials & Contact */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Financial Box */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-5 rounded-[2rem] text-white space-y-1 shadow-lg shadow-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monto Mensual</p>
                  <p className="text-2xl font-black">
                    {income.moneda === 'USD' ? `U$D ${income.monto_mensual}` : `$${(income.monto_mensual || income.monto_total || 0).toLocaleString()}`}
                  </p>
                  {income.moneda === 'USD' && (
                    <p className="text-[10px] text-blue-300 font-bold italic">${(income.monto_mensual_ars || 0).toLocaleString()} ARS</p>
                  )}
                </div>
                
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deuda Actual</p>
                  <p className={`text-2xl font-black ${(income.deuda_actual || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    ${(income.deuda_actual || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-300 italic">Corte al {new Date().toLocaleDateString()}</p>
                </div>

                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vencimiento</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <p className="text-2xl font-black text-slate-800">Día {income.dia_vencimiento || 10}</p>
                  </div>
                  <p className="text-[10px] text-slate-300 italic">Ciclo mensual</p>
                </div>
              </div>

              {/* Technical / Access Grid */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Accesos y Stack Técnico</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Base / Sistema (Priority) */}
                  {(() => {
                    const dbSystem = getDbSystem(income);
                    const dbEmail = income.email_db || income.supabase_email;
                    const dbLink = income.link_db || income.supabase_url;
                    
                    return (
                      <TechCard 
                        icon={Database} 
                        label={`Sistema: ${dbSystem.label}`} 
                        url={dbLink} 
                        email={dbEmail || 'Sin email DB'} 
                        colorClass={dbSystem.iconColor} 
                      />
                    );
                  })()}

                  <TechCard icon={Server} label="Servidor / Imagen" url={income.cloudinary_url || income.server_image} email={income.cloudinary_email || income.correo_image} colorClass="bg-indigo-500" />
                  <TechCard icon={Github} label="Github" url={income.github_url} email={income.github_email} colorClass="bg-slate-900" />
                  <TechCard icon={TrendingUp} label="AI Studio" url={income.ai_studio_url || income.link_editor} email={income.ai_studio_email || income.email_editor} colorClass="bg-orange-500" />
                  <TechCard icon={Code} label="VS Code" url={income.vscode_url} email={income.vscode_email} colorClass="bg-blue-400" />
                  <TechCard icon={Globe} label="Deploy / App" url={income.link_app || income.project_url} email={null} colorClass="bg-emerald-500" />
                </div>
              </div>

              {/* Monthly Payments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Historial de Pagos Mensuales</h3>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 rounded-xl border-blue-100 bg-blue-50 text-blue-600 font-bold text-[10px] hover:bg-blue-100 transition-all gap-1.5"
                    onClick={() => setShowForm(!showForm)}
                  >
                    <Plus className="w-3 h-3" />
                    {showForm ? 'Cancelar' : 'Registrar Pago'}
                  </Button>
                </div>

                <AnimatePresence>
                  {showForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Periodo (Mes/Año)</label>
                          <Input 
                            type="month" 
                            value={periodo}
                            onChange={(e) => setPeriodo(e.target.value)}
                            className="h-10 bg-white border-blue-100 rounded-xl font-bold text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Monto Pagado</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                            <Input 
                              type="number" 
                              value={montoPagado}
                              onChange={(e) => setMontoPagado(parseFloat(e.target.value) || 0)}
                              className="h-10 bg-white border-blue-100 rounded-xl pl-9 font-bold text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Fecha de Pago</label>
                          <Input 
                            type="date" 
                            value={fechaPago}
                            onChange={(e) => setFechaPago(e.target.value)}
                            className="h-10 bg-white border-blue-100 rounded-xl font-bold text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Observación / Nota</label>
                        <Input 
                          placeholder="Ej: Transferencia Banco Galicia..."
                          value={observacion}
                          onChange={(e) => setObservacion(e.target.value)}
                          className="h-10 bg-white border-blue-100 rounded-xl text-sm"
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button 
                          disabled={isRegistering}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-6 font-black uppercase text-xs tracking-wider shadow-lg shadow-blue-200 gap-2"
                          onClick={handleRegistrarPago}
                        >
                          {isRegistering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Confirmar Registro
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 p-2 overflow-hidden">
                  {isLoadingPagos ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando pagos...</p>
                    </div>
                  ) : pagos.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto px-1 py-1 scrollbar-thin scrollbar-thumb-slate-200">
                      {pagos.map((pago) => (
                        <div key={pago.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs uppercase">
                              {pago.periodo.split('-')[1]}/{pago.periodo.split('-')[0].substring(2)}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black text-slate-700">Periodo {pago.periodo}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" /> {pago.fecha_pago}
                                </p>
                                {pago.observacion && (
                                  <p className="text-[10px] text-slate-300 italic truncate max-w-[150px]">• {pago.observacion}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-sm font-black text-slate-900">${pago.monto_pagado.toLocaleString()}</p>
                            <Badge className={`text-[8px] font-black uppercase px-2 py-0 border-none rounded-lg ${getPaymentStatusBadge(pago.estado)}`}>
                              {pago.estado}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center space-y-4">
                      <div className="inline-flex p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <AlertTriangle className="w-6 h-6 text-slate-200" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">Sin pagos registrados</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Aún no se han registrado cobros mensuales para este cliente.
                        </p>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-xl h-8 px-4 font-bold text-[10px] uppercase bg-white border border-slate-100"
                        onClick={() => setShowForm(true)}
                      >
                        Registrar primer pago
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Observations & Secondary Contact */}
            <div className="space-y-8">
              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contacto Primario</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono</span>
                        <span className="text-xs font-bold text-slate-700">{income.telefono_cliente || income.cliente_contacto || 'No registrado'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsable</span>
                        <span className="text-xs font-bold text-slate-700">{income.nombre_contacto || income.cliente_contacto || income.cliente}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-200" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Observaciones e Info Local</h3>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm min-h-[120px]">
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      {income.observaciones || income.vscode_info || 'Sin observaciones internas registradas para este cliente.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & Method */}
              <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Última Operación</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Método de Cobro:</span>
                    <span className="font-bold text-blue-400">{income.metodo_pago || 'Transferencia'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Estado de Cuenta:</span>
                    <Badge className={`rounded-xl px-2 py-0.5 text-[9px] border-none ${getPaymentStatusBadge(income.estado_pago)}`}>
                      {income.estado_pago}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Registrado el:</span>
                    <span className="font-mono text-slate-300 opacity-60">
                      {income.created_at ? new Date(income.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer/Actions */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PlayBox Administración © 2024</p>
          <Button 
            className="bg-slate-900 hover:bg-black text-white rounded-2xl px-8 font-black uppercase tracking-tight shadow-xl shadow-slate-200"
            onClick={onClose}
          >
            Cerrar Ficha
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
