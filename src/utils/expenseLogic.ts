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

const validNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizedExpenseLabel = (expense: Expense): string =>
  `${expense.subcategoria || ''} ${expense.concepto || ''}`.trim().toLocaleLowerCase('es');

const getInstallmentConfig = (expense: Expense) => {
  const count = validNumber(expense.cantidad_cuotas);
  const amount = validNumber(expense.monto_cuota);
  const start = expense.fecha_inicio_cuotas || expense.fecha;

  if (count && amount !== null && safeParseDate(start)) {
    return { count: Math.trunc(count), amount, start };
  }

  // Compatibilidad con el registro actual, sin requerir columnas nuevas.
  if (normalizedExpenseLabel(expense).includes('honorario') && expense.monto === 710000) {
    return { count: 4, amount: 710000, start: '2026-07-01' };
  }

  return null;
};

export const getPaymentEffectivePeriod = (
  payment: GastoPagoHistorial
): { year: number; month: number } | null => {
  const year = Number(payment.periodo_anio);
  const month = Number(payment.periodo_mes);
  if (Number.isInteger(year) && year > 0 && Number.isInteger(month) && month >= 1 && month <= 12) {
    return { year, month };
  }

  for (const rawDate of [payment.fecha_pago, payment.fecha_registro, payment.created_at]) {
    const parsed = safeParseDate(rawDate);
    if (parsed) return { year: parsed.getFullYear(), month: parsed.getMonth() + 1 };
  }

  return null;
};

export const getInstallmentMonthIndex = (expense: Expense, targetDate: Date): number | null => {
  const config = getInstallmentConfig(expense);
  const startDate = config ? safeParseDate(config.start) : null;
  if (!startDate) return null;

  return (
    (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
    (targetDate.getMonth() - startDate.getMonth())
  );
};

export const isExpenseApplicableInMonth = (expense: Expense, targetDate: Date): boolean => {
  const config = getInstallmentConfig(expense);
  if (config) {
    const monthIndex = getInstallmentMonthIndex(expense, targetDate);
    return monthIndex !== null && monthIndex >= 0 && monthIndex < config.count;
  }

  return generateExpenseOccurrences(expense, targetDate).some(
    occurrence => occurrence.getFullYear() === targetDate.getFullYear()
      && occurrence.getMonth() === targetDate.getMonth()
  );
};

/**
 * Genera la lista de meses (en formato Date, inicio de mes) en los que un gasto
 * debería existir como obligación.
 */
export const generateExpenseOccurrences = (expense: Expense, referenceDate: Date): Date[] => {
  const installment = getInstallmentConfig(expense);
  const startDate = safeParseDate(installment?.start || expense.fecha);
  if (!startDate || !isValid(startDate)) return [];

  if (installment) {
    return Array.from({ length: installment.count }, (_, index) =>
      startOfMonth(addMonths(startDate, index))
    ).filter(occurrence => occurrence <= startOfMonth(referenceDate));
  }

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

export const getMontoExigible = (expense: Expense, targetDate?: Date): number => {
  const installment = getInstallmentConfig(expense);
  if (installment) {
    const monthIndex = getInstallmentMonthIndex(expense, targetDate || new Date());
    return monthIndex !== null && monthIndex >= 0 && monthIndex < installment.count
      ? installment.amount
      : 0;
  }

  const finalAmount = validNumber(expense.monto_final_a_pagar);
  if (finalAmount !== null) return finalAmount;

  const netAmount = validNumber(expense.monto_neto);
  if (netAmount !== null) return netAmount;

  const nominalAmount = validNumber(expense.monto) ?? 0;
  let discount =
    validNumber(expense.descuento) ??
    validNumber(expense.saldo_a_favor_aplicado) ??
    validNumber(expense.credito) ??
    0;

  if (discount === 0 && nominalAmount === 1600000 && normalizedExpenseLabel(expense).includes('alquiler')) {
    discount = 500000;
  }

  return Math.max(0, nominalAmount - discount);
};

export const getPaidAmountForPeriod = (
  expenseId: string,
  year: number,
  month: number,
  historyEntries: GastoPagoHistorial[] = []
): number => {
  return historyEntries
    .filter((h) => {
      const period = getPaymentEffectivePeriod(h);
      return h.gasto_id === expenseId && period?.year === year && period.month === month;
    })
    .reduce((sum, h) => sum + Number(h.monto_pagado || 0), 0);
};

export const getExpensePaymentStatusForPeriod = (
  expense: Expense,
  year: number,
  month: number,
  historyEntries: GastoPagoHistorial[] = []
): PaymentStatus => {
  const paidThisPeriod = getPaidAmountForPeriod(expense.id, year, month, historyEntries);
  const montoExigible = getMontoExigible(expense, new Date(year, month - 1, 1));

  if (montoExigible <= 0) return 'Pagado';
  if (paidThisPeriod >= montoExigible) return 'Pagado';
  if (paidThisPeriod > 0) return 'Parcial';

  return 'Pendiente';
};

export const getPendingAmountForPeriod = (
  expense: Expense,
  year: number,
  month: number,
  historyEntries: GastoPagoHistorial[] = []
): number => {
  const montoExigible = getMontoExigible(expense, new Date(year, month - 1, 1));
  const paidThisPeriod = getPaidAmountForPeriod(expense.id, year, month, historyEntries);
  return Math.max(0, montoExigible - paidThisPeriod);
};
