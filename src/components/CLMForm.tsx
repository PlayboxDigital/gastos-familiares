import React, { useState, useEffect, useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CLMProspecto, CLMProspectoInput } from '../types';

interface CLMFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prospecto: CLMProspectoInput & { id?: string }) => void;
  prospectoToEdit?: CLMProspecto | null;
  rubrosDisponibles?: string[];
}

const RUBROS_BASE = [
  'Distribuidora',
  'Ferretería',
  'Refrigeración',
  'Herramientas de refrigeración',
  'Mueblería',
  'Repuestos de autos',
  'Avícola',
  'Bebidas',
  'Mayorista',
  'Mascotas',
  'Comercio',
  'Pescadería',
  'Corralón',
  'Electricidad',
  'Construcción',
  'Gimnasio',
];

const generarMensajeAutomatico = (nombreEmpresa: string, rubro: string) => {
  const empresa = nombreEmpresa.trim() || 'tu empresa';
  const actividad = rubro.trim() || 'tu rubro';

  return `Hola, ¿cómo estás? Te escribo por ${empresa}. Estamos ofreciendo un sistema/app para ayudar a negocios del rubro ${actividad} a ordenar clientes, ventas, pagos, tareas y seguimiento desde una herramienta simple y práctica. La idea es optimizar la gestión diaria y ahorrar tiempo. Si te interesa, te puedo contar brevemente cómo funciona.`;
};

export const CLMForm: React.FC<CLMFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  prospectoToEdit,
  rubrosDisponibles = [],
}) => {
  const rubrosOptions = useMemo(() => {
    const rubros = [...RUBROS_BASE, ...rubrosDisponibles]
      .map((rubro) => rubro?.trim())
      .filter((rubro): rubro is string => Boolean(rubro) && rubro !== 'Otro');

    return Array.from(new Set(rubros)).sort((a, b) => a.localeCompare(b, 'es'));
  }, [rubrosDisponibles]);

  const [formData, setFormData] = useState<CLMProspectoInput>({
    nombre_empresa: '',
    rubro: '',
    telefono: '',
    mensaje: '',
    observaciones: '',
    estado: 'pendiente',
  });

  const [rubroSeleccionado, setRubroSeleccionado] = useState('');
  const [nuevoRubro, setNuevoRubro] = useState('');
  const [mensajeEditadoManual, setMensajeEditadoManual] = useState(false);

  const rubroFinal = rubroSeleccionado === 'Otro'
    ? nuevoRubro.trim()
    : rubroSeleccionado;

  useEffect(() => {
    if (prospectoToEdit) {
      const rubroActual = prospectoToEdit.rubro || '';
      const existeEnLista = rubrosOptions.includes(rubroActual);

      setRubroSeleccionado(existeEnLista ? rubroActual : 'Otro');
      setNuevoRubro(existeEnLista ? '' : rubroActual);
      setMensajeEditadoManual(Boolean(prospectoToEdit.mensaje));

      setFormData({
        nombre_empresa: prospectoToEdit.nombre_empresa || '',
        rubro: rubroActual,
        telefono: prospectoToEdit.telefono || '',
        mensaje: prospectoToEdit.mensaje || '',
        observaciones: prospectoToEdit.observaciones || '',
        estado: prospectoToEdit.estado || 'pendiente',
      });
    } else {
      setRubroSeleccionado('');
      setNuevoRubro('');
      setMensajeEditadoManual(false);

      setFormData({
        nombre_empresa: '',
        rubro: '',
        telefono: '',
        mensaje: '',
        observaciones: '',
        estado: 'pendiente',
      });
    }
  }, [prospectoToEdit, isOpen, rubrosOptions]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      rubro: rubroFinal,
      mensaje: mensajeEditadoManual
        ? prev.mensaje
        : generarMensajeAutomatico(prev.nombre_empresa, rubroFinal),
    }));
  }, [rubroFinal, mensajeEditadoManual]);

  const handleNombreEmpresaChange = (value: string) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        nombre_empresa: value,
      };

      if (!mensajeEditadoManual) {
        next.mensaje = generarMensajeAutomatico(value, rubroFinal || prev.rubro || '');
      }

      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre_empresa.trim()) {
      alert('Por favor completa el nombre de la empresa');
      return;
    }

    if (!rubroFinal) {
      alert('Por favor selecciona un rubro o carga uno nuevo');
      return;
    }

    onSubmit({
      ...formData,
      rubro: rubroFinal,
      mensaje: formData.mensaje || generarMensajeAutomatico(formData.nombre_empresa, rubroFinal),
      id: prospectoToEdit?.id,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="text-2xl font-bold text-slate-900">
            {prospectoToEdit ? 'Editar Prospecto' : 'Nuevo Prospecto'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            {prospectoToEdit
              ? 'Actualiza la información del prospecto'
              : 'Registra un nuevo prospecto para contactar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa" className="text-sm font-semibold text-slate-700">
              Nombre de la Empresa *
            </Label>
            <Input
              id="empresa"
              required
              value={formData.nombre_empresa}
              onChange={(e) => handleNombreEmpresaChange(e.target.value)}
              placeholder="Ej: Distribuidora El Puente"
              className="h-10 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rubro" className="text-sm font-semibold text-slate-700">
                Rubro *
              </Label>
              <Select
                value={rubroSeleccionado}
                onValueChange={(value) => {
                  setRubroSeleccionado(value);
                  if (value !== 'Otro') {
                    setNuevoRubro('');
                  }
                }}
              >
                <SelectTrigger id="rubro" className="h-10 rounded-lg">
                  <SelectValue placeholder="Selecciona un rubro" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {rubrosOptions.map((rubro) => (
                    <SelectItem key={rubro} value={rubro}>
                      {rubro}
                    </SelectItem>
                  ))}
                  <SelectItem value="Otro">Otro / agregar nuevo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-sm font-semibold text-slate-700">
                Teléfono
              </Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                placeholder="+54 9..."
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          {rubroSeleccionado === 'Otro' && (
            <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <Label htmlFor="nuevo_rubro" className="text-sm font-semibold text-slate-700">
                ¿Qué rubro querés agregar? *
              </Label>
              <Input
                id="nuevo_rubro"
                required
                autoFocus
                value={nuevoRubro}
                onChange={(e) => setNuevoRubro(e.target.value)}
                placeholder="Ej: distribuidora, herramientas de refrigeración, taller..."
                className="h-10 rounded-lg bg-white"
              />
              <p className="text-xs text-slate-500">
                Este rubro se guarda con el prospecto. Después aparece como opción en la lista.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mensaje" className="text-sm font-semibold text-slate-700">
              Mensaje automático sugerido
            </Label>
            <textarea
              id="mensaje"
              value={formData.mensaje}
              onChange={(e) => {
                setMensajeEditadoManual(true);
                setFormData({ ...formData, mensaje: e.target.value });
              }}
              placeholder="El mensaje se genera automáticamente con la empresa y el rubro"
              className="w-full min-h-[110px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMensajeEditadoManual(false);
                  setFormData((prev) => ({
                    ...prev,
                    mensaje: generarMensajeAutomatico(prev.nombre_empresa, rubroFinal),
                  }));
                }}
                className="rounded-lg"
              >
                Regenerar mensaje
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones" className="text-sm font-semibold text-slate-700">
              Observaciones
            </Label>
            <Input
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) =>
                setFormData({ ...formData, observaciones: e.target.value })
              }
              placeholder="Notas internas..."
              className="h-10 rounded-lg"
            />
          </div>

          <Separator className="my-4" />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {prospectoToEdit ? 'Actualizar' : 'Crear'} Prospecto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
