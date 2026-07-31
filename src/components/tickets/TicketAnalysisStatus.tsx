import React from 'react';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TicketAnalysisState = 'idle' | 'analyzing' | 'success' | 'error';

interface TicketAnalysisStatusProps {
  state: TicketAnalysisState;
  warnings?: string[];
  error?: string;
  onRetry?: () => void;
}

export const TicketAnalysisStatus: React.FC<TicketAnalysisStatusProps> = ({
  state,
  warnings = [],
  error,
  onRetry,
}) => {
  if (state === 'idle') return null;

  const isAnalyzing = state === 'analyzing';
  const isError = state === 'error';

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isError
          ? 'border-red-200 bg-red-50'
          : isAnalyzing
            ? 'border-blue-200 bg-blue-50'
            : 'border-emerald-200 bg-emerald-50'
      }`}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {isAnalyzing ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600" />
        ) : isError ? (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-black text-slate-900">
            {!isAnalyzing && !isError && <Sparkles className="h-4 w-4" />}
            {isAnalyzing
              ? 'Analizando comprobante'
              : isError
                ? 'No se pudo completar el análisis'
                : 'Análisis inteligente completado'}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {isAnalyzing
              ? 'Estamos interpretando los datos y productos del ticket.'
              : isError
                ? error || 'Podés reintentar o continuar con la carga manual.'
                : `Se precargaron los datos detectados${
                    warnings.length ? ` con ${warnings.length} advertencia(s)` : ''
                  }. Revisalos antes de guardar.`}
          </p>
        </div>
        {isError && onRetry && (
          <Button type="button" size="sm" variant="outline" onClick={onRetry} className="shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        )}
      </div>
    </div>
  );
};
