import { ZodError } from 'zod';
import { requireActiveSession, supabase } from '../lib/supabase';
import {
  parseTicketExtraction,
  TicketExtraction,
} from '../schemas/ticketExtraction';

const readableError = (cause: unknown): string => {
  if (cause instanceof ZodError) {
    return 'El análisis devolvió datos incompletos o inválidos. Podés reintentar o continuar manualmente.';
  }
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return 'No se pudo analizar el comprobante. Podés reintentar o continuar manualmente.';
};

export const ticketOcrService = {
  async analyzeTicket(ticketId: string, imageUrl: string): Promise<TicketExtraction> {
    await requireActiveSession();
    const { data, error } = await supabase.functions.invoke('analyze-ticket', {
      body: { ticketId, imageUrl },
    });

    if (error) {
      const context = (error as { context?: Response }).context;
      if (context?.json) {
        try {
          const payload = await context.json();
          const row = payload && typeof payload === 'object'
            ? payload as { error?: unknown; message?: unknown }
            : {};
          const message = row.error ? String(row.error) : row.message ? String(row.message) : '';
          if (message) throw new Error(message);
        } catch (cause) {
          if (cause instanceof Error && cause.message !== 'Unexpected end of JSON input') {
            throw cause;
          }
        }
      }
      if (context?.status === 401) {
        throw new Error('La sesión venció o no es válida. Volvé a iniciar sesión e intentá nuevamente.');
      }
      throw new Error(error.message || 'La función de análisis no pudo procesar el ticket.');
    }

    try {
      const payload =
        data && typeof data === 'object' && 'extraction' in data
          ? (data as { extraction: unknown }).extraction
          : data;
      return parseTicketExtraction(payload);
    } catch (cause) {
      throw new Error(readableError(cause));
    }
  },
};
