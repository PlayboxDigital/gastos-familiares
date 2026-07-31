import { z } from 'zod';

const nullableText = z.string().trim().min(1).nullable().optional().default(null);

const normalizeNumber = (value: unknown): unknown => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;

  const cleaned = value.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = cleaned.replaceAll(thousandsSeparator, '');
    const decimalIndex = normalized.lastIndexOf(decimalSeparator);
    normalized =
      normalized.slice(0, decimalIndex).replaceAll(decimalSeparator, '') +
      '.' +
      normalized.slice(decimalIndex + 1);
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? ',' : '.';
    const separatorIndex = cleaned.lastIndexOf(separator);
    const decimalDigits = cleaned.length - separatorIndex - 1;
    const occurrences = cleaned.split(separator).length - 1;
    if (occurrences > 1 && decimalDigits === 2) {
      normalized =
        cleaned.slice(0, separatorIndex).replaceAll(separator, '') +
        '.' +
        cleaned.slice(separatorIndex + 1);
    } else if (decimalDigits === 3 || occurrences > 1) {
      normalized = cleaned.replaceAll(separator, '');
    } else {
      normalized = cleaned.replace(separator, '.');
    }
  } else {
    normalized = cleaned;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : value;
};

const nullableNonNegativeNumber = z.preprocess(
  normalizeNumber,
  z.number().finite().nonnegative().nullable()
);

const nullablePositiveNumber = z.preprocess(
  normalizeNumber,
  z.number().finite().positive().nullable()
);

const nullableConfidence = z.preprocess(
  normalizeNumber,
  z.number().finite().min(0).max(1).nullable()
);

const isValidCalendarDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const nullableDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidCalendarDate, 'Fecha inválida')
  .nullable()
  .optional()
  .default(null);

const nullableTime = z
  .string()
  .trim()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
  .transform((value) => value.slice(0, 5))
  .nullable()
  .optional()
  .default(null);

export const ticketExtractedProductSchema = z.object({
  descripcion: z.string().trim().min(1),
  cantidad: nullablePositiveNumber,
  unidad: nullableText,
  precio_unitario: nullableNonNegativeNumber,
  descuento: nullableNonNegativeNumber,
  subtotal: nullableNonNegativeNumber,
});

export const ticketExtractionSchema = z.object({
  comercio: nullableText,
  fecha: nullableDate,
  hora: nullableTime,
  cuit: nullableText,
  numero_comprobante: nullableText,
  forma_pago: nullableText,
  subtotal: nullableNonNegativeNumber,
  descuento: nullableNonNegativeNumber,
  iva: nullableNonNegativeNumber,
  total: nullableNonNegativeNumber,
  observaciones: nullableText,
  texto_completo: nullableText,
  productos: z.array(ticketExtractedProductSchema).max(250).default([]),
  confianza_general: nullableConfidence,
  advertencias: z.array(z.string().trim().min(1)).max(50).default([]),
  campos_dudosos: z.array(z.string().trim().min(1)).max(50).default([]),
  formato_detectado: z.enum(['ticket_termico', 'desconocido']),
});

export type TicketExtraction = z.infer<typeof ticketExtractionSchema>;
export type TicketExtractedProduct = z.infer<typeof ticketExtractedProductSchema>;

export const parseTicketExtraction = (input: unknown): TicketExtraction => {
  const extraction = ticketExtractionSchema.parse(input);
  const productTotal = extraction.productos.reduce(
    (sum, product) => sum + (product.subtotal ?? 0),
    0
  );
  const calculatedTotal = Math.max(0, productTotal - (extraction.descuento ?? 0));
  const warnings = [...extraction.advertencias];

  if (
    extraction.total !== null &&
    extraction.productos.length > 0 &&
    Math.abs(extraction.total - calculatedTotal) >= 0.01
  ) {
    warnings.push(
      `La suma detectada de productos menos descuentos difiere del total en ${Math.abs(
        extraction.total - calculatedTotal
      ).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
    );
  }

  return {
    ...extraction,
    advertencias: Array.from(new Set(warnings)),
  };
};
