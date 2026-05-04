import React, { useState, useEffect } from 'react';
import { Auto, AutoMovimiento, AutoMovimientoInput, AutoTarea, AutoTareaInput } from '../types';
import { autosService } from '../services/autos';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Calendar,
  Tag,
  CreditCard,
  FileText,
  ArrowUpRight,
  Activity,
  AlertCircle,
  Zap,
  CheckCircle2,
  Wrench,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AutoDetailProps {
  auto: Auto;
  onUpdate?: () => void;
}

type ToyotaCoronaGasto = {
  concepto: string;
  monto: number;
  pagadoPor: string;
};

type ToyotaCoronaPendiente = {
  rubro: string;
  detalle: string;
  costo_estimado?: number;
};

const TOYOTA_CORONA_GASTOS: ToyotaCoronaGasto[] = [
  { concepto: 'Tachito agua completo', monto: 13760, pagadoPor: 'Papá' },
  { concepto: 'Cubiertas', monto: 145000, pagadoPor: 'Brisa' },
  { concepto: 'Radiador mano de obra', monto: 60000, pagadoPor: 'Brisa' },
  { concepto: 'Radiador reparación', monto: 60000, pagadoPor: 'Brisa' },
  { concepto: 'Plásticos repuestos', monto: 80000, pagadoPor: 'Brisa' },
  { concepto: 'Kit distribución + correa', monto: 120333, pagadoPor: 'Mitad y mitad' },
  { concepto: 'Mano de obra mecánico', monto: 350000, pagadoPor: 'Brisa' },
  { concepto: 'Correa hidráulica', monto: 41040, pagadoPor: 'Papá' },
  { concepto: 'Tren delantero', monto: 345500, pagadoPor: 'Papá' },
  { concepto: 'Frenos', monto: 170000, pagadoPor: 'Papá' },
  { concepto: 'Mano de obra gomero', monto: 150000, pagadoPor: 'Papá' },
  { concepto: 'Electricista', monto: 80000, pagadoPor: 'Papá' },
  { concepto: 'Alternador reparación', monto: 60000, pagadoPor: 'Papá' },
  { concepto: 'Tapa radiador', monto: 36147, pagadoPor: 'Brisa' },
  { concepto: 'Aceite caja cambio', monto: 59178, pagadoPor: 'Brisa' },
  { concepto: 'Batería', monto: 140000, pagadoPor: 'Brisa' },
];

const TOYOTA_CORONA_PENDIENTES: ToyotaCoronaPendiente[] = [
  { rubro: 'Repuesto', detalle: 'Parrilla', costo_estimado: 100000 },
  { rubro: 'Cerrajero', detalle: 'Baúl' },
  { rubro: 'Cerrajero', detalle: 'Ventanas' },
  { rubro: 'Chapa / pintura', detalle: 'Paragolpe' },
  { rubro: 'Lubricentro', detalle: 'Luces' },
  { rubro: 'Lubricentro', detalle: 'Lubricantes' },
  { rubro: 'Alerón', detalle: 'Revisar / colocar' },
  { rubro: 'Parabrisas', detalle: 'Cambio de parabrisas', costo_estimado: 300000 },
  { rubro: 'Pulir / encerar', detalle: 'Tratamiento exterior', costo_estimado: 150000 },
  { rubro: 'Volante funda', detalle: 'Comprar / colocar funda', costo_estimado: 30000 },
];

const isToyotaCorona = (auto: Auto) => {
  const text = `${auto.nombre || ''} ${auto.marca || ''} ${auto.modelo || ''}`.toLowerCase();
  return text.includes('toyota') && text.includes('corona');
};

export const AutoDetail: React.FC<AutoDetailProps> = ({ auto, onUpdate }) => {
  const [movimientos, setMovimientos] = useState<AutoMovimiento[]>([]);
  const [tareas, setTareas] = useState<AutoTarea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTareaFormOpen, setIsTareaFormOpen] = useState(false);
  const [newMov, setNewMov] = useState<AutoMovimientoInput>({
    auto_id: auto.id,
    fecha: format(new Date(), 'yyyy-MM-dd'),
    concepto: '',
    categoria: '',
    monto: 0,
    observaciones: '',
  });
  const [newTarea, setNewTarea] = useState<AutoTareaInput>({
    auto_id: auto.id,
    rubro: '',
    detalle: '',
    costo_estimado: undefined,
    estado: 'pendiente',
    urgencia: 'media',
    observaciones: '',
  });

  const fetchMovimientos = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [movsData, tareasData] = await Promise.all([
        autosService.obtenerMovimientos(auto.id),
        autosService.obtenerTareas(auto.id)
      ]);
      setMovimientos(movsData);
      setTareas(tareasData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [auto.id]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  const handleCreateMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await autosService.crearMovimiento(newMov);
      setIsFormOpen(false);
      setNewMov({
        auto_id: auto.id,
        fecha: format(new Date(), 'yyyy-MM-dd'),
        concepto: '',
        categoria: '',
        monto: 0,
        observaciones: '',
      });
      fetchMovimientos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating movimiento:', error);
    }
  };

  const handleCreateTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await autosService.crearTarea(newTarea);
      setIsTareaFormOpen(false);
      setNewTarea({
        auto_id: auto.id,
        rubro: '',
        detalle: '',
        costo_estimado: undefined,
        estado: 'pendiente',
        urgencia: 'media',
        observaciones: '',
      });
      fetchMovimientos();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error creating tarea:', error);
    }
  };

  const handleToggleTareaEstado = async (tarea: AutoTarea) => {
    try {
      const nuevoEstado = tarea.estado === 'completada' ? 'pendiente' : 'completada';
      await autosService.actualizarTarea(tarea.id, { estado: nuevoEstado });
      fetchMovimientos();
    } catch (error) {
      console.error('Error updating tarea:', error);
    }
  };

  const handleDeleteTarea = async (id: string) => {
    try {
      await autosService.eliminarTarea(id);
      fetchMovimientos();
    } catch (error) {
      console.error('Error deleting tarea:', error);
    }
  };

  const handleInputChange = React.useCallback((field: keyof AutoMovimientoInput, value: any) => {
    setNewMov(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleTareaInputChange = React.useCallback((field: keyof AutoTareaInput, value: any) => {
    setNewTarea(prev => ({ ...prev, [field]: value }));
  }, []);

  const showToyotaCoronaLegacy = isToyotaCorona(auto);
  const legacyGastos = showToyotaCoronaLegacy ? TOYOTA_CORONA_GASTOS : [];
  const legacyPendientes = showToyotaCoronaLegacy ? TOYOTA_CORONA_PENDIENTES : [];

  const totalSistema = movimientos.reduce((sum, m) => sum + m.monto, 0);
  const totalToyotaInicial = legacyGastos.reduce((sum, g) => sum + g.monto, 0);
  const total = totalSistema + totalToyotaInicial;

  const ultimoGastoSistema = movimientos.length > 0 ? movimientos[0].monto : 0;
  const ultimoGastoInicial = legacyGastos.length > 0 ? legacyGastos[legacyGastos.length - 1].monto : 0;
  const ultimoGasto = ultimoGastoSistema || ultimoGastoInicial;

  const cantidadMovimientos = movimientos.length + legacyGastos.length;

  const totalTareasPendientesSistema = tareas.filter(t => t.estado === 'pendiente').length;
  const costoEstimadoTareasSistema = tareas
    .filter(t => t.estado === 'pendiente')
    .reduce((sum, t) => sum + (t.costo_estimado || 0), 0);

  const totalTareasPendientes = totalTareasPendientesSistema + legacyPendientes.length;
  const costoEstimadoTareas = costoEstimadoTareasSistema + legacyPendientes.reduce((sum, t) => sum + (t.costo_estimado || 0), 0);

  const categorias = ['Seguro', 'Service', 'Reparación', 'Combustible', 'Patente', 'Otros'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{auto.nombre}</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
            {auto.marca} {auto.modelo} • {auto.patente}
          </p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gasto Histórico</p>
            <p className="text-2xl font-black text-blue-600 leading-tight">${total.toLocaleString()}</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6 h-12 active:scale-95 transition-transform">
            <Plus className="w-5 h-5 mr-2" />
            Agregar gasto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-blue-50/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-blue-600/60 tracking-widest leading-none mb-1">Total Gastado</p>
              <p className="text-xl font-black text-blue-900 leading-none">${total.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-emerald-50/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-600/60 tracking-widest leading-none mb-1">Último Gasto</p>
              <p className="text-xl font-black text-emerald-900 leading-none">
                {ultimoGasto > 0 ? `$${ultimoGasto.toLocaleString()}` : '-'}
              </p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200 rounded-xl text-slate-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500/60 tracking-widest leading-none mb-1">Movimientos</p>
              <p className="text-xl font-black text-slate-900 leading-none">{cantidadMovimientos}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-amber-50/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest leading-none mb-1">Por reparar</p>
              <p className="text-xl font-black text-amber-900 leading-none">{totalTareasPendientes}</p>
            </div>
          </div>
        </Card>
      </div>

      {showToyotaCoronaLegacy && (
        <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50 p-6">
            <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Toyota Corona — gastos iniciales cargados
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Carga visual basada en la planilla original. Luego se puede migrar a base de datos.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {legacyGastos.map((gasto, index) => (
                <div key={`${gasto.concepto}-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-900 truncate">{gasto.concepto}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-1">
                      Pagó: {gasto.pagadoPor}
                    </p>
                  </div>
                  <p className="font-black text-sm text-emerald-700 shrink-0">${gasto.monto.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalTareasPendientes > 0 && (
        <Card className="rounded-2xl border-none shadow-sm bg-amber-50/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest leading-none mb-1">Reparaciones Pendientes</p>
                <p className="text-xl font-black text-amber-900 leading-none">{totalTareasPendientes} tareas</p>
                {costoEstimadoTareas > 0 && <p className="text-xs font-bold text-amber-700 mt-1">Costo estimado: ${costoEstimadoTareas.toLocaleString()}</p>}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-50 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Movimientos y Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5 px-6">Fecha</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5">Concepto / Categoría</TableHead>
                  <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-5 text-right pr-6">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : movimientos.length > 0 ? (
                  movimientos.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                      <TableCell className="py-5 px-6">
                        <div className="text-sm font-bold text-slate-700">
                          {format(parseISO(m.fecha), "dd 'de' MMM", { locale: es })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase">{format(parseISO(m.fecha), "yyyy")}</div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="text-sm font-black text-slate-900">{m.concepto}</div>
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">{m.categoria}</div>
                        {m.observaciones && <div className="text-[10px] text-slate-400 mt-1 italic">"{m.observaciones}"</div>}
                      </TableCell>
                      <TableCell className="py-5 text-right pr-6 font-black text-slate-900 text-base">
                        ${m.monto.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-slate-400 italic">
                      No hay movimientos registrados en la base para este auto.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-50 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            Cosas a Reparar
          </CardTitle>
          <Button onClick={() => setIsTareaFormOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-10 px-4">
            <Plus className="w-4 h-4 mr-1" />
            Nueva tarea
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {legacyPendientes.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Pendientes iniciales Toyota Corona
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {legacyPendientes.map((tarea, index) => (
                  <div key={`${tarea.rubro}-${tarea.detalle}-${index}`} className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <p className="font-black text-sm leading-tight text-amber-900">{tarea.rubro}</p>
                        <p className="text-xs mt-1 text-amber-700">{tarea.detalle}</p>
                      </div>
                    </div>
                    {tarea.costo_estimado ? (
                      <p className="text-sm font-bold text-amber-800">Estimado: ${tarea.costo_estimado.toLocaleString()}</p>
                    ) : (
                      <p className="text-sm font-bold text-amber-500 italic">Sin presupuesto</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tareas.length > 0 ? (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Tareas registradas en el sistema
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tareas.map((tarea) => {
                  const urgencyColors = {
                    baja: 'bg-blue-50 border-blue-100 text-blue-700',
                    media: 'bg-amber-50 border-amber-100 text-amber-700',
                    alta: 'bg-red-50 border-red-100 text-red-700'
                  };

                  const urgencyBadge = {
                    baja: { text: 'Baja', icon: Activity },
                    media: { text: 'Media', icon: Zap },
                    alta: { text: 'Urgente', icon: AlertCircle }
                  };

                  const Icon = urgencyBadge[tarea.urgencia || 'media'].icon;

                  return (
                    <div key={tarea.id} className={`rounded-2xl border-2 p-4 transition-all ${urgencyColors[tarea.urgencia || 'media']} ${tarea.estado === 'completada' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <p className="font-black text-sm leading-tight">{tarea.rubro}</p>
                          <p className="text-xs mt-1 opacity-75">{tarea.detalle}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteTarea(tarea.id)}
                          className="text-current/50 hover:text-current transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {tarea.costo_estimado && (
                        <p className="text-sm font-bold mb-2">Costo: ${tarea.costo_estimado.toLocaleString()}</p>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                          <Icon className="w-3 h-3" />
                          {urgencyBadge[tarea.urgencia || 'media'].text}
                        </div>
                        {tarea.estado === 'completada' && (
                          <span className="text-[10px] font-bold uppercase text-green-600">✓ Completa</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleTareaEstado(tarea)}
                        className="w-full mt-3 px-3 py-2 rounded-xl font-bold text-sm transition-all"
                        style={{
                          backgroundColor: tarea.estado === 'completada' ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.05)',
                          color: tarea.estado === 'completada' ? '#10b981' : 'inherit'
                        }}
                      >
                        {tarea.estado === 'completada' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            Marcar como pendiente
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 inline mr-1" />
                            Marcar como completa
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : legacyPendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Wrench className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm italic">No hay tareas pendientes. ¡Bien!</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-md:h-auto max-md:max-h-[85dvh] max-md:p-0 max-md:gap-0 sm:max-w-[425px] overflow-hidden flex flex-col">
          <div className="p-6 border-b shrink-0 pt-10 md:pt-6 bg-slate-50/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Agregar Gasto</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">Registra un nuevo gasto o mantenimiento para tu vehículo.</DialogDescription>
            </DialogHeader>
          </div>
          <form id="auto-mov-form" onSubmit={handleCreateMovimiento} className="flex-1 overflow-y-auto p-6 space-y-6 modal-scroll">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Fecha
                </Label>
                <Input
                  id="fecha"
                  type="date"
                  value={newMov.fecha}
                  onChange={e => handleInputChange('fecha', e.target.value)}
                  required
                  className="bg-slate-50 border-none rounded-xl h-12 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monto" className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Monto
                </Label>
                <Input
                  id="monto"
                  type="number"
                  value={newMov.monto}
                  onChange={e => handleInputChange('monto', Number(e.target.value))}
                  required
                  className="bg-slate-50 border-none rounded-xl h-12 font-bold text-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="concepto" className="text-xs font-black uppercase text-slate-500 tracking-widest">Concepto</Label>
              <Input
                id="concepto"
                value={newMov.concepto}
                onChange={e => handleInputChange('concepto', e.target.value)}
                required
                placeholder="Ej: Service 50k, Seguro, Cubiertas"
                className="bg-slate-50 border-none rounded-xl h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria" className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                <Tag className="w-3 h-3" /> Categoría
              </Label>
              <Select
                value={newMov.categoria}
                onValueChange={(val) => handleInputChange('categoria', val)}
              >
                <SelectTrigger className="bg-slate-50 border-none rounded-xl h-12 font-bold">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100">
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat} className="font-bold">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs" className="text-xs font-black uppercase text-slate-500 tracking-widest">Observaciones</Label>
              <Input
                id="obs"
                value={newMov.observaciones || ''}
                onChange={e => handleInputChange('observaciones', e.target.value)}
                placeholder="Detalle adicional..."
                className="bg-slate-50 border-none rounded-xl h-12 font-medium"
              />
            </div>
          </form>
          <div className="p-4 md:p-6 border-t shrink-0 bg-white">
            <Button form="auto-mov-form" type="submit" className="w-full bg-slate-900 hover:bg-black text-white h-14 rounded-2xl font-black transition-all shadow-lg uppercase tracking-widest text-xs active:scale-95">
              Registrar Gasto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTareaFormOpen} onOpenChange={setIsTareaFormOpen}>
        <DialogContent className="max-md:h-auto max-md:max-h-[85dvh] max-md:p-0 max-md:gap-0 sm:max-w-[425px] overflow-hidden flex flex-col">
          <div className="p-6 border-b shrink-0 pt-10 md:pt-6 bg-orange-50/50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Agregar Tarea</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">Registra algo que necesite reparación o mantenimiento.</DialogDescription>
            </DialogHeader>
          </div>
          <form id="auto-tarea-form" onSubmit={handleCreateTarea} className="flex-1 overflow-y-auto p-6 space-y-6 modal-scroll">
            <div className="space-y-2">
              <Label htmlFor="rubro" className="text-xs font-black uppercase text-slate-500 tracking-widest">Rubro</Label>
              <Input
                id="rubro"
                value={newTarea.rubro}
                onChange={e => handleTareaInputChange('rubro', e.target.value)}
                required
                placeholder="Ej: Motor, Frenos, Suspensión"
                className="bg-slate-50 border-none rounded-xl h-12 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detalle" className="text-xs font-black uppercase text-slate-500 tracking-widest">Detalle</Label>
              <Input
                id="detalle"
                value={newTarea.detalle}
                onChange={e => handleTareaInputChange('detalle', e.target.value)}
                required
                placeholder="Ej: Revisar presión de aceite"
                className="bg-slate-50 border-none rounded-xl h-12 font-bold"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="costo_estimado" className="text-xs font-black uppercase text-slate-500 tracking-widest">Costo Estimado</Label>
                <Input
                  id="costo_estimado"
                  type="number"
                  value={newTarea.costo_estimado || ''}
                  onChange={e => handleTareaInputChange('costo_estimado', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="0"
                  className="bg-slate-50 border-none rounded-xl h-12 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgencia" className="text-xs font-black uppercase text-slate-500 tracking-widest">Urgencia</Label>
                <Select
                  value={newTarea.urgencia || 'media'}
                  onValueChange={(val) => handleTareaInputChange('urgencia', val)}
                >
                  <SelectTrigger className="bg-slate-50 border-none rounded-xl h-12 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsTareaFormOpen(false)} className="rounded-lg">Cancelar</Button>
            <Button form="auto-tarea-form" type="submit" className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg">Agregar Tarea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
