import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Check } from 'lucide-react';
import { CategoryConfig } from '../types';
import { CATEGORIES } from '../constants';

interface SettingsProps {
  categories: CategoryConfig[];
  onUpdateLimit: (categoryName: string, limit: number) => void;
}

export const Settings: React.FC<SettingsProps> = ({ categories = [], onUpdateLimit }) => {
  // Tarea 5: Usar estado local para strings temporales
  const [tempLimits, setTempLimits] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Combinar categorías de la DB con la lista maestra de CATEGORIES (Prompt 093)
  const allCategories = CATEGORIES.map(masterCat => {
    const dbCat = categories.find(c => c.categoria === masterCat.categoria);
    return dbCat || { ...masterCat, limite_mensual: 0 };
  });

  // Inicializar estado local cuando llegan las categorías
  useEffect(() => {
    const limits: Record<string, string> = {};
    allCategories.forEach(cat => {
      limits[cat.categoria] = cat.limite_mensual ? cat.limite_mensual.toString() : '';
    });
    setTempLimits(limits);
  }, [categories]);

  const handleSave = () => {
    Object.entries(tempLimits).forEach(([categoryName, value]) => {
      const numericValue = value === '' ? 0 : parseFloat(value as string);
      if (!isNaN(numericValue)) {
        onUpdateLimit(categoryName, numericValue);
      }
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="glass-card">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg md:text-xl font-bold">Límites de Presupuesto</CardTitle>
              <CardDescription className="text-xs">
                Configura el monto máximo mensual para cada categoría.
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={handleSave}
              className={`w-full sm:w-auto ${isSaved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-xl transition-all h-10 px-6`}
            >
              {isSaved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaved ? 'Guardado' : 'Guardar Todo'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {allCategories.map((cat) => (
              <div key={cat.categoria} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl sm:rounded-xl bg-slate-50 border border-slate-100 group transition-all gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 sm:w-3 sm:h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-black text-slate-700">{cat.categoria}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                  <Label htmlFor={`limit-${cat.categoria}`} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Límite Mensual ($)</Label>
                  <Input 
                    id={`limit-${cat.categoria}`}
                    type="text"
                    inputMode="numeric"
                    className="w-32 sm:w-24 h-10 sm:h-9 bg-white text-right font-black text-sm border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
                    value={tempLimits[cat.categoria] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setTempLimits(prev => ({ ...prev, [cat.categoria]: val }));
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Acerca de Gastos Familiares</CardTitle>
          <CardDescription>Versión 2.0.0</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Gastos Familiares es tu aliado para el control financiero colaborativo de la Familia Ayestarán. 
          Tus datos están sincronizados en la nube para acceso desde cualquier dispositivo.
        </CardContent>
      </Card>
    </div>
  );
};
