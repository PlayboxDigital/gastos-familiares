import React, { useState, useEffect, useMemo } from 'react';
import { Auto, AutoMovimiento } from '../types';
import { autosService } from '../services/autos';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Car, ChevronRight, Hash, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AutoDetail } from './AutoDetail';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const AutoList: React.FC = () => {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [movimientos, setMovimientos] = useState<AutoMovimiento[]>([]);
  const [selectedAuto, setSelectedAuto] = useState<Auto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newAuto, setNewAuto] = useState({
    nombre: '',
    marca: '',
    modelo: '',
    patente: '',
    observaciones: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const autosData = await autosService.obtenerAutos();
      setAutos(autosData);
      
      const allMovs = await Promise.all(autosData.map(a => autosService.obtenerMovimientos(a.id)));
      setMovimientos(allMovs.flat());
    } catch (error) {
      console.error('Error fetching autos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalPorAuto = useMemo(() => {
    const map: Record<string, number> = {};
    movimientos.forEach(m => {
      map[m.auto_id] = (map[m.auto_id] || 0) + m.monto;
    });
    return map;
  }, [movimientos]);

  const handleCreateAuto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await autosService.crearAuto(newAuto);
      setIsFormOpen(false);
      setNewAuto({ nombre: '', marca: '', modelo: '', patente: '', observaciones: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating auto:', error);
    }
  };

  const handleDeleteAuto = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este auto?')) return;
    try {
      await autosService.eliminarAuto(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting auto:', error);
    }
  };

  if (selectedAuto) {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedAuto(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado
        </Button>
        <AutoDetail auto={selectedAuto} onUpdate={fetchData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mis Autos</h2>
          <p className="text-slate-500 text-sm font-medium">Gestiona los gastos y mantenimiento de tus vehículos.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Auto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {autos.map((auto) => (
              <motion.div
                key={auto.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="group overflow-hidden rounded-3xl border-slate-200 hover:border-blue-300 transition-all hover:shadow-xl hover:shadow-blue-50">
                  <CardHeader className="p-6 bg-slate-50 group-hover:bg-blue-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                        <Car className="w-6 h-6" />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-300 hover:text-red-500 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAuto(auto.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-4">
                      <CardTitle className="text-xl font-black text-slate-900 tracking-tight">{auto.nombre}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                        <Hash className="w-3 h-3" />
                        {auto.patente || 'Sin Patente'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Gastado</p>
                        <p className="text-2xl font-black text-slate-900">${(totalPorAuto[auto.id] || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Marca/Modelo</p>
                        <p className="text-sm font-bold text-slate-700">{auto.marca} {auto.modelo}</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-6"
                      onClick={() => setSelectedAuto(auto)}
                    >
                      Ver detalle
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {autos.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <Car className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium italic">No hay autos registrados aún.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Nuevo Auto */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Vehículo</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">Agrega un nuevo auto para realizar seguimiento de sus gastos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAuto} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-xs font-black uppercase text-slate-500 tracking-widest">Nombre (ej: Mi Auto)</Label>
              <Input 
                id="nombre" 
                value={newAuto.nombre} 
                onChange={e => setNewAuto({...newAuto, nombre: e.target.value})}
                required
                className="bg-slate-50 border-none rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marca" className="text-xs font-black uppercase text-slate-500 tracking-widest">Marca</Label>
                <Input 
                  id="marca" 
                  value={newAuto.marca} 
                  onChange={e => setNewAuto({...newAuto, marca: e.target.value})}
                  className="bg-slate-50 border-none rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo" className="text-xs font-black uppercase text-slate-500 tracking-widest">Modelo</Label>
                <Input 
                  id="modelo" 
                  value={newAuto.modelo} 
                  onChange={e => setNewAuto({...newAuto, modelo: e.target.value})}
                  className="bg-slate-50 border-none rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="patente" className="text-xs font-black uppercase text-slate-500 tracking-widest">Patente</Label>
              <Input 
                id="patente" 
                value={newAuto.patente} 
                onChange={e => setNewAuto({...newAuto, patente: e.target.value})}
                className="bg-slate-50 border-none rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs" className="text-xs font-black uppercase text-slate-500 tracking-widest">Observaciones</Label>
              <Input 
                id="obs" 
                value={newAuto.observaciones} 
                onChange={e => setNewAuto({...newAuto, observaciones: e.target.value})}
                className="bg-slate-50 border-none rounded-xl"
              />
            </div>
            <DialogFooter className="pt-6">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-2xl font-bold">
                Guardar Auto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
