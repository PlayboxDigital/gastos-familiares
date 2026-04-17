import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

  const handleMontoChange = (value: string) => {
    if (value === '') {
      setFormData({ ...formData, monto_pagado: 0 });
      return;
    }

    const parsed = parseFloat(value);
    setFormData({
      ...formData,
      monto_pagado: Number.isFinite(parsed) ? parsed : 0,
    });
  };

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

    setErrorMsg(null);
    setIsUploading(true);

    try {
      let cloudinaryData = {};

      if (selectedFile) {
        const uploadRes = await cloudinaryService.uploadFile(selectedFile);
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
          comprobante_transformado_url: cloudinaryService.getOptimizedUrl(
            uploadRes.secure_url
          ),
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
      <DialogContent className="overflow-hidden rounded-2xl border-none p-0 sm:max-w-[500px]">
        <div className="bg-emerald-600 p-6 text-white">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold">
                Registrar Pago Realizado
              </DialogTitle>
            </div>

            <div
              className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${vencimientoUI.className}`}
            >
              {vencimientoUI.icon}
              <span>{vencimientoUI.label}</span>
            </div>

            <DialogDescription className="mt-1 flex flex-col gap-2 text-emerald-50 opacity-90">
              <span className="flex items-center justify-between text-sm">
                <span>Monto base:</span>
                <span className="font-bold">${montoBase.toLocaleString()}</span>
              </span>

              {saldoAFavorAplicado > 0 && (
                <span className="flex items-center justify-between rounded-lg bg-white/10 px-2 py-1 text-xs">
                  <span className="flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    Saldo a favor aplicado
                  </span>
                  <span className="font-bold">
                    -${saldoAFavorAplicado.toLocaleString()}
                  </span>
                </span>
              )}

              <span className="flex items-center justify-between text-sm">
                <span>Monto a pagar este mes:</span>
                <span className="font-black text-base">
                  ${montoExigible.toLocaleString()}
                </span>
              </span>

              {totalAbonado > 0 && (
                <>
                  <span className="flex items-center justify-between text-[11px]">
                    <span>Total abonado:</span>
                    <span className="font-bold">
                      ${totalAbonado.toLocaleString()}
                    </span>
                  </span>

                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${porcentajePagado}%` }}
                    />
                  </div>
                </>
              )}

              <span className="mt-1 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                <span>Restante real:</span>
                <span className="text-sm font-black">
                  ${restanteReal.toLocaleString()}
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6">
          {errorMsg && (
            <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-[10px] font-bold text-red-600">
              <span className="flex-1 uppercase">{errorMsg}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full hover:bg-red-200"
                onClick={() => setErrorMsg(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {(saldoAFavorAplicado > 0 || nuevoSaldoAFavorPreview > 0 || saldoPendientePostPago > 0) && (
            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Crédito aplicado
                </p>
                <p className="mt-1 text-sm font-black text-emerald-700">
                  ${saldoAFavorAplicado.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Restante luego del pago
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  ${saldoPendientePostPago.toLocaleString()}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Nuevo saldo a favor
                </p>
                <p className="mt-1 text-sm font-black text-amber-600">
                  ${nuevoSaldoAFavorPreview.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Calendar className="h-3 w-3" /> Fecha de Pago
              </Label>
              <Input
                type="date"
                value={formData.fecha_pago}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_pago: e.target.value })
                }
                required
                className="border-none bg-slate-50 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Monto Pagado
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto_pagado}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  required
                  className="border-none bg-slate-50 pl-7 font-black text-emerald-700 focus-visible:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {nuevoSaldoAFavorPreview > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Estás pagando de más. Si confirmás así, se generará un saldo a favor de{' '}
                <span className="font-bold">
                  ${nuevoSaldoAFavorPreview.toLocaleString()}
                </span>{' '}
                para el próximo período.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Mes del Período
              </Label>
              <Select
                value={formData.periodo_mes.toString()}
                onValueChange={(v) => setFormData({ ...formData, periodo_mes: parseInt(v) })}
              >
                <SelectTrigger className="border-none bg-slate-50 focus-visible:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Año del Período
              </Label>
              <Select
                value={formData.periodo_anio.toString()}
                onValueChange={(v) => setFormData({ ...formData, periodo_anio: parseInt(v) })}
              >
                <SelectTrigger className="border-none bg-slate-50 focus-visible:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <CreditCard className="h-3 w-3" /> Medio de Pago
            </Label>
            <Select
              value={formData.forma_pago}
              onValueChange={(v) => setFormData({ ...formData, forma_pago: v })}
            >
              <SelectTrigger className="h-11 border-none bg-slate-50 focus:ring-emerald-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Landmark className="h-3 w-3" /> Entidad / Banco
              </Label>
              <Input
                value={formData.entidad_pago}
                onChange={(e) =>
                  setFormData({ ...formData, entidad_pago: e.target.value })
                }
                placeholder="Ej: Santander, MP..."
                className="border-none bg-slate-50 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Referencia #
              </Label>
              <Input
                value={formData.referencia_pago}
                onChange={(e) =>
                  setFormData({ ...formData, referencia_pago: e.target.value })
                }
                placeholder="Nro operación"
                className="border-none bg-slate-50 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Info className="h-3 w-3" /> Observaciones
            </Label>
            <Input
              value={formData.observaciones}
              onChange={(e) =>
                setFormData({ ...formData, observaciones: e.target.value })
              }
              placeholder="Alguna nota sobre el pago..."
              className="border-none bg-slate-50 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <FileUp className="h-3 w-3" /> Comprobante
            </Label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50/30"
              >
                <div className="rounded-full bg-white p-3 shadow-sm transition-transform group-hover:scale-110">
                  <FileUp className="h-8 w-8 text-slate-400 transition-colors group-hover:text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-emerald-700">
                    Subir Comprobante
                  </p>
                  <p className="mt-1 text-[9px] font-medium text-slate-400">
                    Arrastra aquí o haz clic para buscar
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-xs font-bold text-emerald-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] font-medium text-emerald-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  className="h-8 w-8 rounded-lg text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 rounded-xl border border-slate-100"
            >
              CANCELAR
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl bg-emerald-600 px-8 font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  SUBIENDO...
                </>
              ) : (
                'CONFIRMAR PAGO'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};