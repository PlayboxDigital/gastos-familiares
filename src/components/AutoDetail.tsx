import React, { useState, useEffect } from 'react';
import { Auto, AutoMovimiento, AutoMovimientoInput } from '../types';
import { autosService } from '../services/autos';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Tag, CreditCard, FileText, ArrowUpRight, Activity, TrendingDown } from 'lucide-react';
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

export const AutoDetail: React.FC<AutoDetailProps> = ({ auto, onUpdate }) => {
  const [movimientos, setMovimientos] = useState<AutoMovimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newMov, setNewMov] = useState<AutoMovimientoInput>({
    auto_id: auto.id,
    fecha: format(new Date(), 'yyyy-MM-dd'),
    concepto: '',
    categoria: '',
    monto: 0,
    observaciones: '',
  });

  const fetchMovimientos = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await autosService.obtenerMovimientos(auto.id);
      setMovimientos(data);
    } catch (error) {
      console.error('Error fetching movimientos:', error);
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

  const handleInputChange = React.useCallback((field: keyof AutoMovimientoInput, value: any) => {
    setNewMov(prev => ({ ...prev, [field]: value }));
  }, []);

  const total = movimientos.reduce((sum, m) => sum + m.monto, 0);
  const ultimoGasto = movimientos.length > 0 ? movimientos[0].monto : 0;
  const cantidadMovimientos = movimientos.length;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

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
                      No hay movimientos registrados para este auto.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Nuevo Movimiento */}
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
    </div>
  );
};
