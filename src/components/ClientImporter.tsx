import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, Check, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Income, IncomeInput } from '../types';

interface ClientImporterProps {
  onImport: (clients: IncomeInput[]) => Promise<{ success: number; skipped: number; errors: string[] }>;
  existingIncomes: Income[];
}

const parseMoney = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  const str = String(value).trim();
  if (!str) return 0;

  // Limpiar símbolos de moneda y espacios
  let cleaned = str.replace(/[^0-9,.]/g, '');
  
  // Detectar formato:
  // Si tiene coma y punto, el último suele ser el decimal.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Formato ES: 1.000,50
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Formato EN: 1,000.50
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Solo tiene uno o ninguno. 
    // Si tiene una coma, la pasamos a punto (asumimos decimal si es pequeño o miles si es grande?)
    // Para simplificar: si hay una coma, es decimal (estilo ES local).
    if (lastComma !== -1) cleaned = cleaned.replace(',', '.');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const ClientImporter: React.FC<ClientImporterProps> = ({ onImport, existingIncomes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<IncomeInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsParsing(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsing(false);
        const rawData = results.data as any[];
        
        try {
          const mappedData: IncomeInput[] = rawData.map(row => {
            const cliente = row.empresa || row.nombre || 'Sin nombre';
            const descripcionServicio = row.link_app || 'Servicio mensual';
            const monto = parseMoney(row.monto || row.precio_original || 0);
            const refDolar = parseMoney(row.ref_dolar || 1);
            
            // Tarea 2 y 3: Construcción robusta de concepto (NOT NULL)
            const concepto = row.link_app || row.empresa || row.nombre || 'Servicio mensual';

            // Mapeo según Prompt 098, 099 y 100
            return {
              cliente: cliente,
              cliente_contacto: row.nombre || '',
              telefono_cliente: row.telefono || '',
              logo_url: row.logo || '',
              moneda: (row.moneda?.toUpperCase() === 'USD' ? 'USD' : 'ARS') as 'ARS' | 'USD',
              monto_mensual: monto,
              monto_mensual_ars: row.moneda?.toUpperCase() === 'USD' ? (monto * refDolar) : monto,
              descripcion_servicio: descripcionServicio,
              
              // Tarea 2: Asegurar concepto (Not Null Constraint fix)
              concepto: concepto,
              monto: monto, // Asegurar campo monto explícito si existe
              monto_total: monto,
              monto_cobrado: 0,
              fecha_vencimiento: new Date().toISOString().split('T')[0],
              estado_pago: 'Pendiente' as const,

              // Links técnicos
              project_url: row.link_app || '',
              ai_studio_url: row.link_editor || '',
              ai_studio_email: row.email_editor || '',
              supabase_url: row.link_db || '',
              supabase_email: row.email_db || '',
              cloudinary_url: row.url_server_image || '',
              cloudinary_email: row.correo_image || '',
              
              // Estado
              estado: (row.estado || 'activo') as 'activo' | 'inactivo' | 'finalizado',
              
              // Defaults
              metodo_pago: 'Transferencia',
              fecha_inicio: new Date().toISOString().split('T')[0],
              dia_vencimiento: 10
            };
          });

          setPreviewData(mappedData);
          setIsOpen(true);
        } catch (err) {
          setError('Error al procesar el formato del CSV');
          console.error(err);
        }
      },
      error: (err) => {
        setIsParsing(false);
        setError('Error al leer el archivo');
        console.error(err);
      }
    });

    // Reset input
    e.target.value = '';
  };

  const confirmImport = async () => {
    setIsImporting(true);
    setError(null);
    
    try {
      const stats = await onImport(previewData);
      setResults(stats);
      setPreviewData([]);
    } catch (err) {
      setError('Error crítico durante la importación');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isParsing || isImporting}
        />
        <Button 
          variant="outline" 
          className="bg-white border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl px-4 font-bold flex items-center gap-2 group transition-all"
          disabled={isParsing || isImporting}
        >
          {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />}
          {isParsing ? 'Procesando...' : 'Importar CSV'}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={(v) => !isImporting && setIsOpen(v)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">Vista Previa de Importación</DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Detectamos {previewData.length} clientes en el archivo
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 mt-4">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-700">{error}</p>
            </div>
          )}

          {results ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                  <span className="block text-2xl font-black text-emerald-600">{results.success}</span>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Importados</span>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center">
                  <span className="block text-2xl font-black text-amber-600">{results.skipped}</span>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Omitidos (Duplicados)</span>
                </div>
              </div>
              {results.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto p-3 bg-slate-50 rounded-xl text-[10px] text-slate-400 font-mono">
                  {results.errors.map((err, i) => <div key={i}>• {err}</div>)}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-xs text-slate-500">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-bold text-slate-700">Se detectaron {previewData.length} entradas.</p>
                  <p>La lógica evitará duplicar empresas o links de app ya registrados.</p>
                </div>
              </div>
              
              <div className="max-h-40 overflow-y-auto pr-2">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase tracking-tighter">
                      <th className="pb-2">Empresa</th>
                      <th className="pb-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.slice(0, 10).map((p, i) => (
                      <tr key={i}>
                        <td className="py-2 font-bold text-slate-600">{p.cliente}</td>
                        <td className="py-2 text-slate-400">{p.moneda} {p.monto_mensual.toLocaleString()}</td>
                      </tr>
                    ))}
                    {previewData.length > 10 && (
                      <tr>
                        <td colSpan={2} className="py-2 text-center text-slate-300 italic">Y {previewData.length - 10} más...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            {results ? (
              <Button 
                onClick={() => setIsOpen(false)} 
                className="w-full bg-slate-900 text-white rounded-2xl font-black uppercase tracking-tight h-12"
              >
                Cerrar
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsOpen(false)} 
                  disabled={isImporting}
                  className="flex-1 rounded-2xl font-bold"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmImport} 
                  disabled={isImporting}
                  className="flex-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-tight h-12 shadow-lg shadow-blue-200"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirmar Importación
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
