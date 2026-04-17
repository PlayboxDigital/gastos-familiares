import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryConfig } from '../types';
import { CATEGORIES } from '../constants';

interface SettingsProps {
  categories: CategoryConfig[];
  onUpdateLimit: (categoryName: string, limit: number) => void;
}

export const Settings: React.FC<SettingsProps> = ({ categories = [], onUpdateLimit }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Límites de Presupuesto</CardTitle>
          <CardDescription>
            Configura el monto máximo mensual para cada categoría. Recibirás una alerta si lo superas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.categoria} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-sm font-medium text-slate-700">{cat.categoria}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor={`limit-${cat.categoria}`} className="text-xs text-slate-400">Límite ($)</Label>
                <Input 
                  id={`limit-${cat.categoria}`}
                  type="number"
                  className="w-24 h-8 bg-white text-right font-bold text-sm"
                  value={cat.limite_mensual || ''}
                  onChange={(e) => onUpdateLimit(cat.categoria, parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          ))}
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
