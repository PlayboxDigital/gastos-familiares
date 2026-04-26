import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Expense, GastoPagoHistorialInput } from '../types';
import { PAYMENT_METHODS, DB_PAYMENT_METHOD_MAP } from '../constants';
import { format, parseISO } from 'date-fns';
import {
  Receipt,
  CreditCard,
  Calendar,
  Landmark,
  Info,
  FileUp,
  X,
  Check,
  Loader2,
  Wallet,
  ArrowRightLeft,
  AlertCircle,
  Clock3,
  CheckCircle2,
} from 'lucide-react';
import { cloudinaryService } from '../services/cloudinary';
import { getEstadoVencimiento } from '../estadoVencimiento';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pago: GastoPagoHistorialInput) => void;
  expense: Expense | null;
}

type ExpenseWithCredit = Expense & {
  saldo_a_favor_aplicado?: number;
  monto_final_a_pagar?: number;
  saldo_a_favor_generado?: number;
};

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  expense,
}) => {
  const expenseData = expense as ExpenseWithCredit | null;

  const montoBase = expenseData?.monto ?? 0;
  const totalAbonado = expenseData?.total_abonado ?? 0;
  const saldoAFavorAplicado = expenseData?.saldo_a_favor_aplicado ?? 0;

  const estadoVencimiento = useMemo(() => {
    if (!expenseData) return 'en_plazo';
    return getEstadoVencimiento(expenseData);
  }, [expenseData]);

  const vencimientoUI = useMemo(() => {
    switch (estadoVencimiento) {
      case 'vencido':
        return {
          label: 'Vencido',
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          className: 'border border-rose-200 bg-rose-50 text-rose-700',
        };
      case 'por_vencer':
        return {
          label: 'Por vencer',
          icon: <Clock3 className="h-3.5 w-3.5" />,
          className: 'border border-amber-200 bg-amber-50 text-amber-700',
        };
      case 'pagado':
        return {
          label: 'Pagado',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        };
      default:
        return {
          label: 'En plazo',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          className: 'border border-slate-200 bg-slate-50 text-slate-700',
        };
    }
  }, [estadoVencimiento]);

  const montoExigible = useMemo(() => {
    if (!expenseData) return 0;

    if (typeof expenseData.monto_final_a_pagar === 'number') {
      return Math.max(0, expenseData.monto_final_a_pagar);
    }

    return Math.max(0, montoBase - saldoAFavorAplicado);
  }, [expenseData, montoBase, saldoAFavorAplicado]);

  const restanteReal = useMemo(() => {
    return Math.max(0, montoExigible - totalAbonado);
  }, [montoExigible, totalAbonado]);

  const [formData, setFormData] = useState({
    fecha_pago: format(new Date(), 'yyyy-MM-dd'),
    monto_pagado: 0,
    forma_pago: PAYMENT_METHODS[0],
    entidad_pago: '',
    referencia_pago: '',
    observaciones: '',
    periodo_mes: new Date().getMonth() + 1,
    periodo_anio: new Date().getFullYear(),
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (expenseData && isOpen) {
      setFormData({
        fecha_pago: format(new Date(), 'yyyy-MM-dd'),
        monto_pagado: restanteReal > 0 ? restanteReal : 0,
        forma_pago: PAYMENT_METHODS[0],
        entidad_pago: '',
        referencia_pago: '',
        observaciones: '',
        periodo_mes: new Date().getMonth() + 1,
        periodo_anio: new Date().getFullYear(),
      });
      setSelectedFile(null);
      setErrorMsg(null);
    }
  }, [expenseData, isOpen, restanteReal]);

  const montoPagadoSeguro = useMemo(() => {
    const parsed = Number(formData.monto_pagado);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [formData.monto_pagado]);

  const nuevoSaldoAFavorPreview = useMemo(() => {
    return Math.max(0, montoPagadoSeguro - restanteReal);
  }, [montoPagadoSeguro, restanteReal]);

  const saldoPendientePostPago = useMemo(() => {
    return Math.max(0, restanteReal - montoPagadoSeguro);
  }, [restanteReal, montoPagadoSeguro]);

  const porcentajePagado = useMemo(() => {
    if (montoExigible <= 0) return 100;
    return Math.min(
      100,
      ((totalAbonado + Math.min(montoPagadoSeguro, restanteReal)) / montoExigible) * 100
    );
  }, [montoExigible, totalAbonado, montoPagadoSeguro, restanteReal]);

  const canSubmit = useMemo(() => {
    return !!expenseData && !!formData.fecha_pago && montoPagadoSeguro > 0 && !isUploading;
  }, [expenseData, formData.fecha_pago, montoPagadoSeguro, isUploading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleMontoChange = React.useCallback((value: string) => {
    if (value === '') {
      setFormData(prev => ({ ...prev, monto_pagado: 0 }));
      return;
    }

    const parsed = value === '' ? 0 : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      monto_pagado: Number.isFinite(parsed) ? parsed : 0,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseData) return;

    if (!formData.fecha_pago) {
      setErrorMsg('Debes ingresar una fecha de pago válida.');
      return;
    }

    if (!Number.isFinite(montoPagadoSeguro) || montoPagadoSeguro <= 0) {
      setErrorMsg('El monto pagado debe ser mayor a 0.');
      return;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) { // 10MB
      setErrorMsg('El archivo es demasiado grande (máximo 10MB).');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      let cloudinaryData = {};

      if (selectedFile) {
        const uploadRes = await cloudinaryService.uploadFile(selectedFile);

// generar URL optimizada liviana (clave)
const optimizedUrl = cloudinaryService.getOptimizedUrl(uploadRes.secure_url, {
  quality: 'auto:low',
  fetch_format: 'auto',
  width: 1200
});
        cloudinaryData = {
          comprobante_nombre_original: selectedFile.name,
          comprobante_cloudinary_public_id: uploadRes.public_id,
          comprobante_cloudinary_url: uploadRes.url,
          comprobante_cloudinary_secure_url: uploadRes.secure_url,
          comprobante_cloudinary_resource_type: uploadRes.resource_type,
          comprobante_cloudinary_format: uploadRes.format,
          comprobante_cloudinary_bytes: uploadRes.bytes,
          comprobante_cloudinary_width: uploadRes.width,
          comprobante_cloudinary_height: uploadRes.height,
          comprobante_transformado_url: optimizedUrl,
        };
      }

      const pago: GastoPagoHistorialInput = {
        gasto_id: expenseData.id,
        servicio_clave: expenseData.servicio_clave || expenseData.concepto || '',
        periodo_anio: formData.periodo_anio,
        periodo_mes: formData.periodo_mes,
        fecha_pago: formData.fecha_pago,
        monto_pagado: montoPagadoSeguro,
        moneda: 'ARS',
        forma_pago:
          DB_PAYMENT_METHOD_MAP[formData.forma_pago] || formData.forma_pago,
        entidad_pago: formData.entidad_pago,
        referencia_pago: formData.referencia_pago,
        observaciones: formData.observaciones,
        ...cloudinaryData,
        gasto_concepto_snapshot: expenseData.concepto,
        categoria_snapshot: expenseData.categoria,
        subcategoria_snapshot: expenseData.subcategoria,
        responsable_snapshot: expenseData.responsable,
        prioridad_snapshot: expenseData.prioridad,
        tipo_snapshot: expenseData.tipo,
      };

      await onConfirm(pago);
      onClose();
    } catch (error) {
      console.error('Error al subir comprobante o procesar pago:', error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Error desconocido al procesar el pago'
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (!expenseData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100vw-16px)] sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl max-h-[70dvh] sm:max-h-[90dvh] h-auto flex flex-col">
        <DialogHeader className="p-4 md:p-6 bg-emerald-600 text-white relative shrink-0">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Receipt className="w-24 h-24" />
          </div>
          <DialogClose onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-white/70 hover:text-white hover:bg-white/15 transition-all z-50">
            <X className="w-5 h-5" />
          </DialogClose>
          
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-lg bg-white/20 p-1.5">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <DialogTitle className="text-xl md:text-2xl font-black tracking-tighter">
              Registrar Pago
            </DialogTitle>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${vencimientoUI.className}`}
          >
            {vencimientoUI.icon}
            <span>{vencimientoUI.label}</span>
          </div>

          <DialogDescription asChild className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-emerald-50 opacity-90">
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Monto base:</span>
                <span className="font-bold">${montoBase.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span>Monto a pagar:</span>
                <span className="font-black text-xs">
                  ${montoExigible.toLocaleString()}
                </span>
              </div>

              {saldoAFavorAplicado > 0 && (
                <div className="col-span-2 flex items-center justify-between rounded-lg bg-white/10 px-2 py-0.5 text-[10px]">
                  <span className="flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    Saldo aplicado: <span className="font-bold">-${saldoAFavorAplicado.toLocaleString()}</span>
                  </span>
                </div>
              )}

              {totalAbonado > 0 && (
                <div className="col-span-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Total abonado: <span className="font-bold">${totalAbonado.toLocaleString()}</span></span>
                    <span>Restante: <span className="font-black">${restanteReal.toLocaleString()}</span></span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${porcentajePagado}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 md:px-8 custom-scrollbar">
          <form id="payment-form" onSubmit={handleSubmit} className="space-y-4 pb-20 sm:pb-4">
            {errorMsg && (
              <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-2 text-[10px] font-bold text-red-600">
                <span className="flex-1 uppercase">{errorMsg}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => setErrorMsg(null)} />
              </div>
            )}

            {(saldoAFavorAplicado > 0 || nuevoSaldoAFavorPreview > 0 || saldoPendientePostPago > 0) && (
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Crédito</p>
                  <p className="text-[11px] font-black text-emerald-700">${saldoAFavorAplicado.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Restante</p>
                  <p className="text-[11px] font-black text-slate-900">${saldoPendientePostPago.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">A Favor</p>
                  <p className="text-[11px] font-black text-amber-600">${nuevoSaldoAFavorPreview.toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <Calendar className="h-3 w-3" /> Fecha
                </Label>
                <Input
                  type="date"
                  value={formData.fecha_pago}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_pago: e.target.value })
                  }
                  required
                  className="h-10 text-xs border-none bg-slate-50 focus-visible:ring-emerald-500 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Monto Pago
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.monto_pagado}
                    onChange={(e) => handleMontoChange(e.target.value)}
                    required
                    className="h-10 border-none bg-slate-50 pl-7 font-black text-emerald-700 focus-visible:ring-emerald-500 rounded-xl text-base"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Período</Label>
                <div className="flex gap-1">
                  <Select
                    value={formData.periodo_mes.toString()}
                    onValueChange={(v) => setFormData({ ...formData, periodo_mes: parseInt(v) })}
                  >
                    <SelectTrigger className="h-10 text-[11px] border-none bg-slate-50 focus-visible:ring-emerald-500 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {MONTHS.map((m, i) => (
                        <SelectItem key={m} value={(i + 1).toString()} className="text-xs">{m.slice(0,3)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={formData.periodo_anio.toString()}
                    onValueChange={(v) => setFormData({ ...formData, periodo_anio: parseInt(v) })}
                  >
                    <SelectTrigger className="h-10 text-[11px] border-none bg-slate-50 focus-visible:ring-emerald-500 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                        <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <CreditCard className="h-3 w-3" /> Medio
                </Label>
                <Select
                  value={formData.forma_pago}
                  onValueChange={(v) => setFormData({ ...formData, forma_pago: v })}
                >
                  <SelectTrigger className="h-10 text-[11px] border-none bg-slate-50 focus:ring-emerald-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <Landmark className="h-3 w-3" /> Entidad
                </Label>
                <Input
                  value={formData.entidad_pago}
                  onChange={(e) => setFormData({ ...formData, entidad_pago: e.target.value })}
                  placeholder="Ej: Santander, MP..."
                  className="h-10 text-xs border-none bg-slate-50 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Referencia</Label>
                <Input
                  value={formData.referencia_pago}
                  onChange={(e) => setFormData({ ...formData, referencia_pago: e.target.value })}
                  placeholder="Nro operación"
                  className="h-10 text-xs border-none bg-slate-50 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <Info className="h-3 w-3" /> Observaciones
              </Label>
              <Input
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas sobre el pago..."
                className="h-10 text-xs border-none bg-slate-50 rounded-xl"
              />
            </div>

            <div className="pb-2 space-y-1">
              <Label className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <FileUp className="h-3 w-3" /> Comprobante
              </Label>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
              {!selectedFile ? (
                <div onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-100 bg-slate-50 p-3 transition-all hover:border-emerald-400 hover:bg-emerald-50/20">
                  <FileUp className="h-4 w-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Subir Archivo</p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Check className="h-3 w-3 text-emerald-600" />
                    <p className="truncate text-[10px] font-bold text-emerald-900">{selectedFile.name}</p>
                  </div>
                  <X className="h-3 w-3 cursor-pointer text-emerald-400" onClick={() => setSelectedFile(null)} />
                </div>
              )}
            </div>
          </form>
        </div>

        <DialogFooter className="p-4 bg-slate-50 flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest border-slate-200 text-slate-500 h-10 active:scale-95 transition-transform"
          >
            CANCELAR
          </Button>
          <Button
            form="payment-form"
            type="submit"
            disabled={!canSubmit || isUploading}
            className="flex-[2] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 h-10 active:scale-95 transition-transform"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'CONFIRMAR PAGO'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};