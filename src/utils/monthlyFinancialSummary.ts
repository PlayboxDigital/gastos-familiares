import { isSameMonth, parseISO } from 'date-fns';
import { Expense, GastoPagoHistorial, TicketCompra } from '../types';
import {
  getMontoExigible,
  getPaymentEffectivePeriod,
  isExpenseApplicableInMonth,
} from './expenseLogic';

export type MonthlyFinancialSource = 'fixed' | 'variable' | 'vehicle' | 'ticket';

export interface MonthlyFinancialMovement {
  id: string;
  expenseId?: string;
  paymentId?: string;
  date: string;
  concept: string;
  category: string;
  responsible: string;
  amount: number;
  source: MonthlyFinancialSource;
  paymentMethod?: string;
  paymentStatus: 'Completo' | 'Parcial';
}

export interface MonthlyFinancialSummary {
  totalGastado: number;
  subtotalFijos: number;
  subtotalVariablesComunes: number;
  subtotalVehiculos: number;
  subtotalTickets: number;
  movimientos: MonthlyFinancialMovement[];
}

interface MonthlyFinancialSummaryInput {
  expenses: Expense[];
  vehicleExpenses: Expense[];
  tickets: TicketCompra[];
  history: GastoPagoHistorial[];
  targetMonth: Date;
}

const safeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = parseISO(String(value).slice(0, 10));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const expenseConcept = (expense?: Expense, payment?: GastoPagoHistorial) =>
  expense?.subcategoria ||
  expense?.concepto ||
  payment?.gasto_concepto_snapshot ||
  payment?.subcategoria_snapshot ||
  payment?.categoria_snapshot ||
  'Gasto sin concepto';

const isVehicleExpense = (expense?: Expense) =>
  !!expense && (
    !!expense.movimiento_origen_id ||
    expense.origen === 'Vehículo' ||
    String(expense.servicio_clave || '').startsWith('vehiculo:')
  );

export const getMonthlyFinancialSummary = ({
  expenses,
  vehicleExpenses,
  tickets,
  history,
  targetMonth,
}: MonthlyFinancialSummaryInput): MonthlyFinancialSummary => {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth() + 1;
  const ticketExpenseIds = new Set(
    tickets.map((ticket) => ticket.gasto_id).filter(Boolean) as string[]
  );
  const ticketPaymentIds = new Set(
    tickets.map((ticket) => ticket.pago_id).filter(Boolean) as string[]
  );
  const expenseById = new Map(expenses.map((expense) => [expense.id, expense]));
  const representedVehicleIds = new Set(
    expenses.map((expense) => expense.movimiento_origen_id).filter(Boolean) as string[]
  );
  const isTicketExpense = (expense?: Expense) =>
    !!expense && (
      ticketExpenseIds.has(expense.id) ||
      String(expense.servicio_clave || '').startsWith('ticket:')
    );

  const seenPaymentIds = new Set<string>();
  const paymentMovements = history.flatMap<MonthlyFinancialMovement>((payment) => {
    if (seenPaymentIds.has(payment.id)) return [];
    const period = getPaymentEffectivePeriod(payment);
    if (period?.year !== year || period.month !== month) return [];
    const amount = Number(payment.monto_pagado || 0);
    if (amount <= 0) return [];
    seenPaymentIds.add(payment.id);

    const expense = expenseById.get(payment.gasto_id);
    const ticket =
      ticketExpenseIds.has(payment.gasto_id) ||
      ticketPaymentIds.has(payment.id) ||
      String(payment.servicio_clave || '').startsWith('ticket:') ||
      isTicketExpense(expense);
    const source: MonthlyFinancialSource = ticket
      ? 'ticket'
      : isVehicleExpense(expense)
        ? 'vehicle'
        : expense?.tipo === 'Fijo'
          ? 'fixed'
          : 'variable';
    const required = expense ? getMontoExigible(expense, targetMonth) : amount;

    return [{
      id: `payment:${payment.id}`,
      expenseId: payment.gasto_id,
      paymentId: payment.id,
      date:
        payment.fecha_pago ||
        payment.fecha_registro ||
        payment.created_at ||
        `${year}-${String(month).padStart(2, '0')}-01`,
      concept: expenseConcept(expense, payment),
      category: payment.categoria_snapshot || expense?.categoria || 'Sin categoría',
      responsible: payment.responsable_snapshot || expense?.responsable || 'Sin responsable',
      amount,
      source,
      paymentMethod: payment.forma_pago,
      paymentStatus: amount < required ? 'Parcial' : 'Completo',
    }];
  });

  const expenseIdsWithRealPayments = new Set(
    paymentMovements.map((movement) => movement.expenseId).filter(Boolean)
  );
  const paidWithoutHistory = expenses
    .filter(
      (expense) =>
        expense.archived !== true &&
        expense.estado_pago === 'Pagado' &&
        !expenseIdsWithRealPayments.has(expense.id) &&
        isExpenseApplicableInMonth(expense, targetMonth)
    )
    .flatMap<MonthlyFinancialMovement>((expense) => {
      const amount = getMontoExigible(expense, targetMonth);
      if (amount <= 0) return [];
      const source: MonthlyFinancialSource = isTicketExpense(expense)
        ? 'ticket'
        : isVehicleExpense(expense)
          ? 'vehicle'
          : expense.tipo === 'Fijo'
            ? 'fixed'
            : 'variable';

      return [{
        id: `paid-state:${expense.id}:${year}-${month}`,
        expenseId: expense.id,
        date: expense.fecha_pago || expense.fecha,
        concept: expenseConcept(expense),
        category: expense.categoria || 'Sin categoría',
        responsible: expense.responsable || 'Sin responsable',
        amount,
        source,
        paymentStatus: 'Completo',
      }];
    });

  const vehicleMovements = vehicleExpenses
    .filter((expense) => {
      const date = safeDate(expense.fecha);
      return (
        !!date &&
        isSameMonth(date, targetMonth) &&
        !representedVehicleIds.has(expense.movimiento_origen_id || '')
      );
    })
    .flatMap<MonthlyFinancialMovement>((expense) => {
      const amount = Number(expense.monto || 0);
      if (amount <= 0) return [];
      return [{
        id: `vehicle:${expense.id}`,
        expenseId: expense.id,
        date: expense.fecha,
        concept: expenseConcept(expense),
        category: expense.categoria || 'Transporte',
        responsible: expense.responsable || 'Vehículo',
        amount,
        source: 'vehicle',
        paymentStatus: 'Completo',
      }];
    });

  const movimientos = [
    ...paymentMovements,
    ...paidWithoutHistory,
    ...vehicleMovements,
  ].sort(
    (a, b) => (safeDate(b.date)?.getTime() || 0) - (safeDate(a.date)?.getTime() || 0)
  );
  const subtotal = (source: MonthlyFinancialSource) =>
    movimientos
      .filter((movement) => movement.source === source)
      .reduce((sum, movement) => sum + movement.amount, 0);
  const subtotalFijos = subtotal('fixed');
  const subtotalVariablesComunes = subtotal('variable');
  const subtotalVehiculos = subtotal('vehicle');
  const subtotalTickets = subtotal('ticket');

  return {
    totalGastado:
      subtotalFijos +
      subtotalVariablesComunes +
      subtotalVehiculos +
      subtotalTickets,
    subtotalFijos,
    subtotalVariablesComunes,
    subtotalVehiculos,
    subtotalTickets,
    movimientos,
  };
};
