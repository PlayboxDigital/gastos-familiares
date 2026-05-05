import React, { useState, useEffect } from 'react';
import { Income, PaymentStatus, IngresoPago, IngresoPagoInput } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  X, Phone, Globe, Database, Github, Code, TrendingUp, Mail, 
  ExternalLink, Edit2, Calendar, DollarSign, Info, Shield, Server, Users,
  Plus, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { incomesService } from '../services/Clientes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ClientDetailProps {
  income: Income;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (income: Income) => void;
  onRefresh?: () => void;
}

// Componente de ítem de pago memoizado para evitar re-renders masivos en la lista
const PaymentItem = React.memo(({ 
  pago, 
  onEdit, 
  onDelete, 
  getPaymentStatusBadge 
}: { 
  pago: IngresoPago, 
  onEdit: (pago: IngresoPago) => void, 
  onDelete: (id: string) => void, 
  getPaymentStatusBadge: (status: string) => string 
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs uppercase">
          {pago.periodo.split('-')[1]}/{pago.periodo.split('-')[0].substring(2)}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-slate-700">Periodo {pago.periodo}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(pago);
                }}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors active:scale-90"
                title="Editar pago"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(pago.id);
                }}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors active:scale-90"
                title="Eliminar pago"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> {pago.fecha_pago}
            </p>
            {pago.observacion && (
              pago.observacion.includes('Comp: http') ? (
                <a
                  href={pago.observacion.split('Comp: ')[1]?.split(' ')[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-500 font-bold underline truncate max-w-[150px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver comprobante
                </a>
              ) : (
                <p className="text-[10px] text-slate-300 italic truncate max-w-[150px]">• {pago.observacion}</p>
              )
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
  );
});

export const ClientDetail: React.FC<ClientDetailProps> = ({ income, isOpen, onClose, onEdit, onRefresh }) => {
  const [pagos, setPagos] = useState<IngresoPago[]>([]);
  const [isLoadingPagos, setIsLoadingPagos] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPago, setEditingPago] = useState<IngresoPago | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pagoAEliminar, setPagoAEliminar] = useState<string | null>(null);
  
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);
  
  // Form state
  const [montoPagado, setMontoPagado] = useState<number>(income.monto_mensual || 0);
  const [periodo, setPeriodo] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [observacion, setObservacion] = useState('');
  const [formaPago, setFormaPago] = useState<'Efectivo' | 'Transferencia'>('Transferencia');
  const [comprobanteUrl, setComprobanteUrl] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [isUploadingComprobante, setIsUploadingComprobante] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingPago) {
      setMontoPagado(editingPago.monto_pagado);
      setPeriodo(editingPago.periodo);
      setFechaPago(editingPago.fecha_pago);
      
      // Parse observation to extract formal payment info if present
      const obs = editingPago.observacion || '';
      if (obs.includes('[EFECTIVO]')) setFormaPago('Efectivo');
      else if (obs.includes('[TRANSFERENCIA]')) setFormaPago('Transferencia');
      
      const compMatch = obs.match(/Comp: (https?:\/\/[^\s]+)/);
      if (compMatch) setComprobanteUrl(compMatch[1]);
      
      // Extract the rest of the observation
      const cleanObs = obs.replace(/\[.*?\]/, '').replace(/Comp: https?:\/\/[^\s]+/, '').trim();
      setObservacion(cleanObs);
    } else {
      setMontoPagado(income.monto_mensual || 0);
      setPeriodo(new Date().toISOString().substring(0, 7));
      setFechaPago(new Date().toISOString().split('T')[0]);
      setFormaPago('Transferencia');
      setComprobanteUrl('');
      setObservacion('');
    }
  }, [editingPago, income.monto_mensual]);

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

  const handleEditPago = React.useCallback((pago: IngresoPago) => {
    setEditingPago(pago);
    setShowForm(true);
    setFormError(null);

    setTimeout(() => {
      document.querySelector('.modal-scroll')?.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  }, []);

  const handleDeletePagoPrompt = React.useCallback((id: string) => {
    setPagoAEliminar(id);
    setShowDeleteConfirm(true);
  }, []);

  const uploadComprobanteToCloudinary = async (): Promise<string> => {
    if (!comprobanteFile) return comprobanteUrl.trim();

    const cloudName =
      (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME ||
      (import.meta as any).env?.VITE_CLOUDINARY_NAME;

    const uploadPreset =
      (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET ||
      (import.meta as any).env?.VITE_CLOUDINARY_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Falta configurar Cloudinary: VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET');
    }

    const formData = new FormData();
    formData.append('file', comprobanteFile);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'comprobantes/clientes');
    formData.append('tags', 'clientes,cobranzas,comprobantes');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('No se pudo subir el comprobante a Cloudinary');
    }

    const data = await response.json();

    const secureUrl = data.secure_url || '';
    const publicId = data.public_id || '';

    if (!secureUrl) {
      throw new Error('Cloudinary no devolvió una URL válida');
    }

    // URL optimizada para comprobantes: calidad automática, formato automático y ancho limitado.
    if (publicId && cloudName) {
      return `https://res.cloudinary.com/${cloudName}/image/upload/q_auto:low,f_auto,w_1200/${publicId}`;
    }

    return secureUrl.replace('/upload/', '/upload/q_auto:low,f_auto,w_1200/');
  };

  const handleRegistrarPago = async () => {
    if (isRegistering || isUploadingComprobante || montoPagado < 0) return;

    if (formaPago === 'Transferencia' && !comprobanteFile && !comprobanteUrl.trim()) {
      setFormError("Debes subir comprobante para transferencia");
      return;
    }

    setFormError(null);
    setIsRegistering(true);
    setIsUploadingComprobante(true);

    try {
      const comprobanteOptimizadoUrl = await uploadComprobanteToCloudinary();

      const montoEsperado = income.monto_mensual || 0;

      let estado: PaymentStatus = 'Pendiente';
      if (montoPagado >= montoEsperado) {
        estado = 'Pagado';
      } else if (montoPagado > 0) {
        estado = 'Parcial';
      }

      const fullObservacion = `[${formaPago.toUpperCase()}]${comprobanteOptimizadoUrl ? ` - Comp: ${comprobanteOptimizadoUrl}` : ''} ${observacion}`.trim();

      const pagoData: IngresoPagoInput = {
        ingreso_id: income.id,
        cliente: income.cliente,
        periodo,
        monto: montoEsperado,
        monto_pagado: montoPagado,
        fecha_pago: fechaPago,
        estado,
        observacion: fullObservacion
      };

      if (editingPago) {
        await incomesService.actualizarPagoIngreso(editingPago.id, pagoData);
      } else {
        await incomesService.registrarPago(pagoData);
      }

      await cargarPagos();
      if (onRefresh) onRefresh();

      setEditingPago(null);
      setMontoPagado(0);
      setFormaPago('Efectivo');
      setComprobanteUrl('');
      setComprobanteFile(null);
      setObservacion('');
      setShowForm(false);
      setFormError(null);
    } catch (error) {
      console.error("Error al procesar pago:", error);
      setFormError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsUploadingComprobante(false);
      setIsRegistering(false);
    }
  };

  const eliminarPago = async (id: string) => {
    console.log("CLIENT_DETAIL_ELIMINAR_PAGO_START:", id);
    try {
      await incomesService.eliminarPagoIngreso(id);
      console.log("CLIENT_DETAIL_ELIMINAR_PAGO_SUCCESS:", id);
      await cargarPagos();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("CLIENT_DETAIL_ELIMINAR_PAGO_ERROR:", error);
      alert(error instanceof Error ? error.message : "Error al eliminar el pago");
    }
  };

  const handleClearHistory = async () => {
    console.log("CLIENT_DETAIL_CLEAR_HISTORY_START:", { client: income.cliente, count: pagos.length });
    if (isDeletingHistory) return;
    setIsDeletingHistory(true);
    try {
      // Optamos por eliminar los pagos uno a uno para evitar problemas con RLS masivos si los hay, 
      // aunque lo ideal sería un endpoint que borre todos los de un ingreso_id.
      // Basado en el servicio actual, no hay un "borrarTodoElHistorialDeUnCliente".
      for (const pago of pagos) {
        console.log("CLIENT_DETAIL_CLEAR_HISTORY_DELETING_PAGO:", pago.id);
        await incomesService.eliminarPagoIngreso(pago.id);
      }
      console.log("CLIENT_DETAIL_CLEAR_HISTORY_SUCCESS");
      await cargarPagos();
      if (onRefresh) onRefresh();
      setShowClearHistoryConfirm(false);
    } catch (error) {
      console.error("CLIENT_DETAIL_CLEAR_HISTORY_ERROR:", error);
      alert("Error al borrar el historial de pagos");
    } finally {
      setIsDeletingHistory(false);
    }
  };

  const toggleEstado = async () => {
    const nuevoEstado = income.estado === 'inactivo' ? 'activo' : 'inactivo';
    try {
      await incomesService.actualizarIngreso(income.id, { estado: nuevoEstado });
      if (onRefresh) onRefresh();
    } catch (error) {
      alert("Error al cambiar estado del cliente");
    }
  };

  const handleWhatsApp = (isReminder = false) => {
    if (!income.telefono_cliente) {
      alert("Este cliente no tiene un teléfono registrado.");
      return;
    }

    const phone = income.telefono_cliente.replace(/\D/g, '');
    if (!phone) {
      alert("El teléfono del cliente no es válido.");
      return;
    }

    let mensaje = '';
    
    if (isReminder) {
      const monthName = format(new Date(), 'MMMM', { locale: es });
      const day = new Date().getDate();
      mensaje = `Hola, estamos a ${day} de ${monthName} y todavía no me llegó el pago. ¿Podés confirmarme si ya lo realizaste? Gracias.`;
    } else {
      const monto = income.moneda === 'USD'
        ? `U$D ${income.monto_mensual || 0}`
        : `$${(income.monto_mensual || income.monto_mensual_ars || income.monto_total || 0).toLocaleString()}`;
      mensaje = `Hola ${income.cliente}, ¿cómo estás? Te recuerdo que el pago mensual del servicio está próximo a vencer. El importe es de ${monto}.`;
    }

    const encoded = encodeURIComponent(mensaje);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activo': return 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm';
      case 'inactivo': return 'bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-60';
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
    const dbType = (income.db_type || '').toLowerCase();
    const dbLink = (income.link_db || income.supabase_url || '').toLowerCase();
    const appLink = (income.link_app || income.project_url || '').toLowerCase();

    if (dbType.includes('sheets') || dbLink.includes('docs.google.com')) {
      return { label: 'Google Sheets', className: 'bg-amber-100 text-amber-700 border-amber-200', iconColor: 'bg-amber-500', type: 'google_sheets' };
    } else if (dbType.includes('appsheet') || appLink.includes('appsheet.com')) {
      return { label: 'AppSheet', className: 'bg-blue-100 text-blue-700 border-blue-200', iconColor: 'bg-blue-500', type: 'appsheet' };
    } else if (dbType.includes('ia') || dbType.includes('ai')) {
      return { label: 'App Inteligente', className: 'bg-purple-100 text-purple-700 border-purple-200', iconColor: 'bg-purple-500', type: 'ia' };
    } else if (dbType.includes('supabase') || dbLink.includes('supabase.com')) {
      return { label: 'Supabase', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', iconColor: 'bg-emerald-500', type: 'supabase' };
    } else {
      return { label: 'Servicio', className: 'bg-slate-100 text-slate-700 border-slate-200', iconColor: 'bg-slate-500', type: 'none' };
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
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-white w-full h-[95dvh] sm:h-auto sm:max-w-5xl sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col sm:max-h-[92vh] z-[111]"
      >
        {/* Header Section */}
        <div className="p-4 md:p-8 bg-slate-50/50 border-b border-slate-100 shrink-0 pt-10 sm:pt-8 relative">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 md:gap-6 items-center flex-1 min-w-0">
               {/* Close button for mobile inside the header if needed, but we have the X on the right */}
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
            <div className="flex gap-1 md:gap-3 ml-2 items-center">
              <Button 
                variant="outline" 
                size="icon" 
                className={`rounded-2xl h-10 w-10 md:h-12 md:w-12 transition-all ${income.estado === 'inactivo' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 bg-white'}`}
                onClick={toggleEstado}
                title={income.estado === 'inactivo' ? 'Habilitar Cliente' : 'Deshabilitar Cliente'}
              >
                {income.estado === 'inactivo' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </Button>

              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-2xl h-10 w-10 md:h-12 md:w-12 border-slate-200 text-blue-600 hover:bg-slate-50 transition-all sm:flex hidden"
                onClick={() => onEdit(income)}
              >
                <Edit2 className="w-5 h-5" />
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="rounded-2xl h-10 w-10 md:h-12 md:w-12 text-slate-400"
                onClick={onClose}
              >
                <X className="w-6 h-6" />
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 modal-scroll pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-8">
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
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado Cobro</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <p className="text-xl font-black text-slate-800">{income.estado_pago}</p>
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
                    onClick={() => {
                      if (editingPago) {
                        setEditingPago(null);
                        setShowForm(false);
                      } else {
                        setShowForm(!showForm);
                      }
                    }}
                  >
                    <Plus className={`w-3 h-3 transition-transform ${showForm ? 'rotate-45' : ''}`} />
                    {showForm ? 'Cancelar' : 'Registrar Pago'}
                  </Button>
                  {pagos.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 font-bold text-[10px] transition-all gap-1.5"
                      onClick={() => setShowClearHistoryConfirm(true)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Borrar Historial
                    </Button>
                  )}
                </div>

                <AnimatePresence>
                  {showForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Forma de Pago</label>
                          <select 
                            value={formaPago} 
                            onChange={(e) => setFormaPago(e.target.value as any)}
                            className="w-full h-10 px-3 bg-white border border-blue-100 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Transferencia">Transferencia</option>
                            <option value="Efectivo">Efectivo</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Periodo</label>
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
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Fecha Pago</label>
                          <Input 
                            type="date" 
                            value={fechaPago}
                            onChange={(e) => setFechaPago(e.target.value)}
                            className="h-10 bg-white border-blue-100 rounded-xl font-bold text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">
                            Comprobante {formaPago === 'Transferencia' ? '(obligatorio)' : '(opcional)'}
                          </label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setComprobanteFile(file);
                              setComprobanteUrl('');
                            }}
                            className="h-10 bg-white border-blue-100 rounded-xl text-sm file:mr-3 file:border-0 file:bg-blue-50 file:text-blue-600 file:font-bold file:text-xs"
                          />
                          {(comprobanteFile || comprobanteUrl) && (
                            <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-blue-100">
                              <p className="text-[10px] text-blue-500 font-bold truncate max-w-[150px]">
                                {comprobanteFile ? comprobanteFile.name : 'Comprobante actual'}
                              </p>
                              <button 
                                type="button"
                                onClick={() => {
                                  setComprobanteFile(null);
                                  setComprobanteUrl('');
                                }}
                                className="p-1.5 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider ml-1">Nota Interna</label>
                          <Input 
                            placeholder="Ej: Banco Galicia..."
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            className="h-10 bg-white border-blue-100 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        {formError && (
                          <div className="w-full mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {formError}
                          </div>
                        )}
                        <Button 
                          disabled={isRegistering || isUploadingComprobante}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-black uppercase text-xs tracking-wider shadow-lg shadow-blue-200 gap-2"
                          onClick={handleRegistrarPago}
                        >
                          {isRegistering || isUploadingComprobante ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {isUploadingComprobante ? 'Subiendo comprobante...' : editingPago ? 'Confirmar Edición' : 'Confirmar Registro'}
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
                        <PaymentItem 
                          key={pago.id}
                          pago={pago}
                          onEdit={handleEditPago}
                          onDelete={handleDeletePagoPrompt}
                          getPaymentStatusBadge={getPaymentStatusBadge}
                        />
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
                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono</span>
                          <span className="text-xs font-bold text-slate-700">{income.telefono_cliente || income.cliente_contacto || 'No registrado'}</span>
                        </div>
                      </div>
                      {income.telefono_cliente && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl text-emerald-500 hover:bg-emerald-50"
                            onClick={() => handleWhatsApp(true)}
                            title="Reclamar deuda"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-xl text-blue-500 hover:bg-blue-50"
                            onClick={() => handleWhatsApp(false)}
                            title="Recordatorio estándar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gastos Familiares © 2024</p>
          <Button 
            className="bg-slate-900 hover:bg-black text-white rounded-2xl px-8 font-black uppercase tracking-tight shadow-xl shadow-slate-200 active:scale-95 transition-transform"
            onClick={onClose}
          >
            Cerrar Ficha
          </Button>
        </div>

        {/* Modal de confirmación de eliminación */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm rounded-[2rem] z-[9999]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Eliminar pago</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm font-medium text-slate-600">¿Estás seguro de que querés eliminar este pago? Esta acción no se puede deshacer.</p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                className="rounded-xl font-bold border-slate-200"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-red-100"
                onClick={async () => {
                  console.log("ELIMINAR_PAGO_ID_CONFIRMED:", pagoAEliminar);
                  if (!pagoAEliminar) return;
                  await eliminarPago(pagoAEliminar);
                  setShowDeleteConfirm(false);
                  setPagoAEliminar(null);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmación de eliminación de historial */}
        <Dialog open={showClearHistoryConfirm} onOpenChange={setShowClearHistoryConfirm}>
          <DialogContent className="max-w-sm rounded-[2rem] z-[9999]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Borrar Historial</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm font-medium text-slate-600">¿Estás seguro de que querés borrar TODO el historial de pagos de {income.cliente}? Esta acción no se puede deshacer.</p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                className="rounded-xl font-bold border-slate-200"
                onClick={() => setShowClearHistoryConfirm(false)}
                disabled={isDeletingHistory}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-red-100 gap-2"
                onClick={handleClearHistory}
                disabled={isDeletingHistory}
              >
                {isDeletingHistory && <Loader2 className="w-3 h-3 animate-spin" />}
                Borrar Todo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};
