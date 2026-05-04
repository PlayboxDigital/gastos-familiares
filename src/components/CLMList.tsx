import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  MessageCircle,
  Phone,
  AlertCircle,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { CLMProspecto, CLMProspectoInput } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CLMForm } from './CLMForm';
import { clmProspectosService } from '../services/clmProspectos';

interface CLMListProps {
  // Props can be left empty for now, data fetched from service
}

const RUBROS_BASE = [
  'Distribuidora',
  'Ferretería',
  'Refrigeración',
  'Herramientas de refrigeración',
  'Mueblería',
  'Repuestos de autos',
  'Corralón',
  'Electricidad',
  'Construcción',
  'Gimnasio',
];

export const CLMList: React.FC<CLMListProps> = () => {
  const [prospectos, setProspectos] = useState<CLMProspecto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRubro, setFilterRubro] = useState('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [prospectoToEdit, setProspectoToEdit] = useState<CLMProspecto | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load prospectos on mount
  useEffect(() => {
    loadProspectos();
  }, []);

  const loadProspectos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await clmProspectosService.obtenerProspectos();
      setProspectos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar prospectos');
      console.error('Error loading prospectos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const rubrosDisponibles = useMemo(() => {
    const rubrosGuardados = prospectos
      .map((p) => p.rubro?.trim())
      .filter((rubro): rubro is string => Boolean(rubro));

    return Array.from(new Set([...RUBROS_BASE, ...rubrosGuardados])).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }, [prospectos]);

  // Filter and search
  const filtered = useMemo(() => {
    return prospectos.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.nombre_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rubro?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRubro = filterRubro === 'Todos' || p.rubro === filterRubro;

      return matchesSearch && matchesRubro;
    });
  }, [prospectos, searchTerm, filterRubro]);

  // Separate by estado
  const pendientes = useMemo(
    () => filtered.filter((p) => p.estado === 'pendiente'),
    [filtered]
  );

  const contactados = useMemo(
    () => filtered.filter((p) => p.estado === 'contactado'),
    [filtered]
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    const totalPendientes = prospectos.filter((p) => p.estado === 'pendiente').length;
    const totalContactados = prospectos.filter(
      (p) => p.estado === 'contactado'
    ).length;
    const contactadosHoy = prospectos.filter(
      (p) =>
        p.estado === 'contactado' &&
        p.fecha_contacto &&
        format(parseISO(p.fecha_contacto), 'yyyy-MM-dd') === hoy
    ).length;
    const contactadosMacarenaHoy = prospectos.filter(
      (p) =>
        p.estado === 'contactado' &&
        p.contactado_por === 'Macarena' &&
        p.fecha_contacto &&
        format(parseISO(p.fecha_contacto), 'yyyy-MM-dd') === hoy
    ).length;

    return {
      totalPendientes,
      totalContactados,
      contactadosHoy,
      contactadosMacarenaHoy,
    };
  }, [prospectos]);

  // Handle actions
  const handleCreate = () => {
    setProspectoToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (prospecto: CLMProspecto) => {
    setProspectoToEdit(prospecto);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: CLMProspectoInput & { id?: string }) => {
    try {
      if (data.id) {
        // Update
        const updated = await clmProspectosService.actualizarProspecto(
          data.id,
          {
            nombre_empresa: data.nombre_empresa,
            rubro: data.rubro,
            telefono: data.telefono,
            mensaje: data.mensaje,
            observaciones: data.observaciones,
            estado: data.estado as 'pendiente' | 'contactado',
          }
        );
        setProspectos((prev) =>
          prev.map((p) => (p.id === data.id ? updated : p))
        );
      } else {
        // Create
        const newProspecto = await clmProspectosService.crearProspecto({
          nombre_empresa: data.nombre_empresa,
          rubro: data.rubro,
          telefono: data.telefono,
          mensaje: data.mensaje,
          observaciones: data.observaciones,
          estado: 'pendiente',
        });
        setProspectos((prev) => [newProspecto, ...prev]);
      }
      setIsFormOpen(false);
      setProspectoToEdit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar prospecto');
    }
  };

  const handleDelete = async () => {
    if (!idToDelete) return;
    try {
      await clmProspectosService.eliminarProspecto(idToDelete);
      setProspectos((prev) => prev.filter((p) => p.id !== idToDelete));
      setShowDeleteConfirm(false);
      setIdToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar prospecto');
    }
  };

  const handleContactar = async (prospecto: CLMProspecto) => {
    if (!prospecto.telefono) {
      alert('No hay teléfono registrado para este prospecto');
      return;
    }

    try {
      // Mark as contacted
      const hoy = format(new Date(), 'yyyy-MM-dd');
      await clmProspectosService.marcarContactado(
        prospecto.id,
        'Macarena',
        hoy
      );

      // Update local state
      setProspectos((prev) =>
        prev.map((p) =>
          p.id === prospecto.id
            ? {
                ...p,
                estado: 'contactado',
                contactado_por: 'Macarena',
                fecha_contacto: hoy,
              }
            : p
        )
      );

      // Open WhatsApp
      const mensaje = prospecto.mensaje || '¡Hola! Te escribo para presentar nuestros servicios...';
      const telefonoLimpio = prospecto.telefono.replace(/\D/g, '');
      const urlWhatsApp = `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
      window.open(urlWhatsApp, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al contactar prospecto');
    }
  };

  const generateAutoMessage = (empresa: string, rubro: string): string => {
    const messages: { [key: string]: string } = {
      'Distribuidora': `¡Hola ${empresa}! Te escribo para presentar nuestros servicios de refrigeración. ¿Cuándo podemos agendar una reunión?`,
      'Ferretería': `¡Hola ${empresa}! Somos especialistas en refrigeración y te ofrecemos soluciones de calidad. ¿Podemos conversar?`,
      'Refrigeración': `¡Hola ${empresa}! Contamos con servicios profesionales de refrigeración. ¿Te interesa conocer más?`,
      'Herramientas de refrigeración': `¡Hola ${empresa}! Disponemos de herramientas especializadas para refrigeración. ¿Cuándo nos vemos?`,
      'Mueblería': `¡Hola ${empresa}! Te ofrecemos soluciones en refrigeración para tu negocio. ¿Podemos agendar?`,
      'Repuestos de autos': `¡Hola ${empresa}! También ofrecemos refrigeración para vehículos. ¿Nos reunimos?`,
      'Corralón': `¡Hola ${empresa}! Contamos con servicios de refrigeración profesionales. ¿Te interesa?`,
      'Electricidad': `¡Hola ${empresa}! Ofrecemos soluciones integrales en refrigeración. ¿Cuándo disponés?`,
      'Construcción': `¡Hola ${empresa}! Nuestros servicios de refrigeración son ideales para tu rubro. ¿Podemos hablar?`,
      'Gimnasio': `¡Hola ${empresa}! Ofrecemos soluciones de refrigeración para espacios comerciales. ¿Nos contactamos?`,
    };
    return messages[rubro] || `¡Hola ${empresa}! Te escribo para presentar nuestros servicios. ¿Cuándo podemos agendar una reunión?`;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setError(null);

      const text = await file.text();
      const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

      if (lines.length < 2) {
        alert('El archivo CSV debe contener al menos un encabezado y una fila de datos');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const nombreIdx = headers.indexOf('nombre_empresa');
      const rubroIdx = headers.indexOf('rubro');
      const telefonoIdx = headers.indexOf('telefono');

      if (nombreIdx === -1 || rubroIdx === -1) {
        alert('El CSV debe contener las columnas: nombre_empresa, rubro, telefono');
        return;
      }

      const newProspectos: typeof prospectos = [];
      let omitidas = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const nombre = cols[nombreIdx];
        const rubro = cols[rubroIdx];
        const telefono = telefonoIdx !== -1 ? cols[telefonoIdx] : '';

        if (!nombre || !rubro) {
          omitidas++;
          continue;
        }

        const mensaje = generateAutoMessage(nombre, rubro);

        newProspectos.push({
          nombre_empresa: nombre,
          rubro,
          telefono: telefono || undefined,
          mensaje,
          estado: 'pendiente',
          observaciones: 'Importado por CSV',
        } as any);
      }

      if (newProspectos.length === 0) {
        alert('No hay filas válidas para importar');
        return;
      }

      // Import to Supabase
      const created = await clmProspectosService.createCLMProspectosBulk(newProspectos);

      // Update local state
      setProspectos((prev) => [...created, ...prev]);

      alert(`✅ Importación exitosa!\n\nImportados: ${created.length}\nOmitidos: ${omitidas}`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al importar CSV';
      setError(errorMsg);
      alert(`❌ Error al importar: ${errorMsg}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Cargando prospectos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Pendientes
          </p>
          <p className="text-2xl font-bold text-amber-600">{metrics.totalPendientes}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Contactados
          </p>
          <p className="text-2xl font-bold text-emerald-600">{metrics.totalContactados}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Hoy
          </p>
          <p className="text-2xl font-bold text-blue-600">
            {metrics.contactadosHoy}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Macarena Hoy
          </p>
          <p className="text-2xl font-bold text-indigo-600">
            {metrics.contactadosMacarenaHoy}
          </p>
        </motion.div>
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={loadProspectos}
              className="text-xs font-medium underline hover:no-underline mt-1"
            >
              Reintentar
            </button>
          </div>
        </motion.div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por empresa o rubro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-lg"
          />
        </div>

        <Select value={filterRubro} onValueChange={setFilterRubro}>
          <SelectTrigger className="w-full md:w-56 h-10 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            <SelectItem value="Todos">Todos</SelectItem>
            {rubrosDisponibles.map((rubro) => (
              <SelectItem key={rubro} value={rubro}>
                {rubro}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="hidden"
          disabled={isImporting}
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-10 w-full md:w-auto"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isImporting ? 'Importando...' : 'Importar CSV'}
        </Button>

        <Button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {/* Pendientes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900">Pendientes ({pendientes.length})</h3>
        </div>

        <AnimatePresence mode="popLayout">
          {pendientes.length === 0 ? (
            <motion.div
              key="empty-pendientes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100"
            >
              <p className="text-slate-500">
                {searchTerm ? 'No hay prospectos pendientes con esos criterios' : 'Todos contactados! 🎉'}
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-3">
              {pendientes.map((prospecto, i) => (
                <motion.div
                  key={prospecto.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h4 className="font-bold text-slate-900 truncate">
                          {prospecto.nombre_empresa}
                        </h4>
                        <Badge variant="outline" className="shrink-0 bg-amber-50">
                          {prospecto.rubro}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        {prospecto.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {prospecto.telefono}
                          </div>
                        )}
                        {prospecto.mensaje && (
                          <p className="text-xs text-slate-500 italic">
                            &quot;{prospecto.mensaje.substring(0, 80)}...&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleContactar(prospecto)}
                        disabled={!prospecto.telefono}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Contactar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(prospecto)}
                        className="rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIdToDelete(prospecto.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      <Separator />

      {/* Contactados Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-slate-900">Contactados ({contactados.length})</h3>
        </div>

        <AnimatePresence mode="popLayout">
          {contactados.length === 0 ? (
            <motion.div
              key="empty-contactados"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100"
            >
              <p className="text-slate-500">
                Aún no hay prospectos contactados
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-3">
              {contactados.map((prospecto, i) => (
                <motion.div
                  key={prospecto.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h4 className="font-bold text-slate-900 truncate">
                          {prospecto.nombre_empresa}
                        </h4>
                        <Badge className="shrink-0 bg-emerald-100 text-emerald-700">
                          {prospecto.rubro}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        {prospecto.contactado_por && (
                          <div className="text-xs">
                            <span className="font-semibold">Contactó:</span>{' '}
                            {prospecto.contactado_por}
                          </div>
                        )}
                        {prospecto.fecha_contacto && (
                          <div className="text-xs">
                            <span className="font-semibold">Fecha:</span>{' '}
                            {format(parseISO(prospecto.fecha_contacto), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(prospecto)}
                        className="rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIdToDelete(prospecto.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* CLMForm Modal */}
      <CLMForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setProspectoToEdit(null);
        }}
        onSubmit={handleFormSubmit}
        prospectoToEdit={prospectoToEdit}
        rubrosDisponibles={rubrosDisponibles}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              ¿Eliminar prospecto?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
