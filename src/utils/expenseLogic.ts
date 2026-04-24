import { Expense } from '../types';
import { startOfMonth, addMonths, isValid, parseISO } from 'date-fns';

/**
 * Determina si un gasto es de tipo variable.
 */
export const isVariableExpense = (expense: Expense) => {
  return expense.tipo_gasto === 'variable';
};

/**
 * Determina si un gasto es de tipo fijo (recurrente).
 */
export const isFixedExpense = (expense: Expense) => {
  return expense.tipo_gasto !== 'variable';
};

/**
 * Helper interno para parseo seguro de fechas.
 */
const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

/**
 * Genera la lista de meses (en formato Date, inicio de mes) en los que un gasto
 * debería existir como obligación.
 */
export const generateExpenseOccurrences = (expense: Expense, referenceDate: Date): Date[] => {
  const startDate = safeParseDate(expense.fecha);
  if (!startDate || !isValid(startDate)) return [];

  // SI ES VARIABLE: Solo existe en su mes original.
  if (isVariableExpense(expense)) {
    return [startOfMonth(startDate)];
  }

  // SI ES FIJO: Se devenga desde su mes de inicio hasta el mes de la fecha de referencia (hoy).
  const occurrences: Date[] = [];
  const firstMonth = startOfMonth(startDate);
  const lastMonth = startOfMonth(referenceDate);

  let current = firstMonth;
  while (current <= lastMonth) {
    occurrences.push(new Date(current));
    current = addMonths(current, 1);
  }

  return occurrences;
};
