import React, { useState, useEffect } from 'react';
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
}

const RUBROS = [
  'Tecnología',
  'Finanzas',
  'Retail',
  'Salud',
  'Educación',
  'Inmobiliaria',
  'Logística',
  'Otro',
];

export const CLMForm: React.FC<CLMFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  prospectoToEdit,
}) => {
  const [formData, setFormData] = useState<CLMProspectoInput>({
    nombre_empresa: '',
    rubro: '',
    telefono: '',
    mensaje: '',
    observaciones: '',
    estado: 'pendiente',
  });

  useEffect(() => {
    if (prospectoToEdit) {
      setFormData({
        nombre_empresa: prospectoToEdit.nombre_empresa || '',
        rubro: prospectoToEdit.rubro || '',
        telefono: prospectoToEdit.telefono || '',
        mensaje: prospectoToEdit.mensaje || '',
        observaciones: prospectoToEdit.observaciones || '',
        estado: prospectoToEdit.estado || 'pendiente',
      });
    } else {
      setFormData({
        nombre_empresa: '',
        rubro: '',
        telefono: '',
        mensaje: '',
        observaciones: '',
        estado: 'pendiente',
      });
    }
  }, [prospectoToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre_empresa || !formData.rubro) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    onSubmit({ ...formData, id: prospectoToEdit?.id });
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
              onChange={(e) =>
                setFormData({ ...formData, nombre_empresa: e.target.value })
              }
              placeholder="Ingresa el nombre de la empresa"
              className="h-10 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rubro" className="text-sm font-semibold text-slate-700">
                Rubro *
              </Label>
              <Select value={formData.rubro || ''} onValueChange={(v) => setFormData({ ...formData, rubro: v })}>
                <SelectTrigger id="rubro" className="h-10 rounded-lg">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {RUBROS.map((rubro) => (
                    <SelectItem key={rubro} value={rubro}>
                      {rubro}
                    </SelectItem>
                  ))}
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

          <div className="space-y-2">
            <Label htmlFor="mensaje" className="text-sm font-semibold text-slate-700">
              Mensaje Sugerido
            </Label>
            <Input
              id="mensaje"
              value={formData.mensaje}
              onChange={(e) =>
                setFormData({ ...formData, mensaje: e.target.value })
              }
              placeholder="Ej: Hola, te escribo para presentar nuestros servicios..."
              className="h-10 rounded-lg"
            />
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
