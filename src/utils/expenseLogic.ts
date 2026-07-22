import { Expense, GastoPagoHistorial, PaymentStatus } from '../types';
import { startOfMonth, addMonths, isValid, parseISO } from 'date-fns';

/**
 * Determina si un gasto es de tipo variable.
 */
export const isVariableExpense = (expense: Expense) => {
  return expense.tipo === 'Variable';
};

/**
 * Determina si un gasto es de tipo fijo (recurrente).
 */
export const isFixedExpense = (expense: Expense) => {
  return expense.tipo === 'Fijo';
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

type ExpenseWithCredit = Expense & {
  saldo_a_favor_aplicado?: number;
  monto_final_a_pagar?: number;
};

export const getMontoExigible = (expense: ExpenseWithCredit): number => {
  if (typeof expense.monto_final_a_pagar === 'number') {
    return Math.max(0, expense.monto_final_a_pagar);
  }

  return Math.max(0, expense.monto - (expense.saldo_a_favor_aplicado ?? 0));
};

export const getPaidAmountForPeriod = (
  expenseId: string,
  year: number,
  month: number,
  historyEntries: GastoPagoHistorial[] = []
): number => {
  return historyEntries
    .filter(
      (h) =>
        h.gasto_id === expenseId &&
        h.periodo_anio === year &&
        h.periodo_mes === month
    )
    .reduce((sum, h) => sum + Number(h.monto_pagado || 0), 0);
};

export const getExpensePaymentStatusForPeriod = (
  expense: ExpenseWithCredit,
  year: number,
  month: number,
  historyEntries: GastoPagoHistorial[] = []
): PaymentStatus => {
  const paidThisPeriod = getPaidAmountForPeriod(expense.id, year, month, historyEntries);
  const montoExigible = getMontoExigible(expense);

  if (montoExigible <= 0) return 'Pagado';
  if (paidThisPeriod >= montoExigible) return 'Pagado';
  if (paidThisPeriod > 0) return 'Parcial';

  return 'Pendiente';
};

export const getPendingAmountForPeriod = (
  expense: ExpenseWithCredit,
  year: number,
  month: number,
  historyEntries: GastoPagoHistorial[] = []
): number => {
  const montoExigible = getMontoExigible(expense);
  const paidThisPeriod = getPaidAmountForPeriod(expense.id, year, month, historyEntries);
  return Math.max(0, montoExigible - paidThisPeriod);
};
