import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TicketExtractionWarningsProps {
  warnings: string[];
  doubtfulFields: string[];
}

export const TicketExtractionWarnings: React.FC<TicketExtractionWarningsProps> = ({
  warnings,
  doubtfulFields,
}) => {
  if (warnings.length === 0 && doubtfulFields.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-2">
          <p className="text-sm font-black">Revisá estos datos antes de continuar</p>
          {warnings.length > 0 && (
            <ul className="list-disc space-y-1 pl-4 text-xs font-semibold">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          {doubtfulFields.length > 0 && (
            <p className="text-xs font-semibold">
              Campos dudosos: {doubtfulFields.join(', ')}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
