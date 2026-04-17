import { supabase } from '../lib/supabase';
import { Expense, ExpenseInput } from '../types';

export type EstadoPago = 'Pendiente' | 'Pagado' | 'Parcial';

export interface PaymentInput {
  expenseId: string;
  montoPagado: number;
  fechaPago: string;
}

const getPeriodKey = (fecha: string) => {
  const d = new Date(fecha);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getNextPeriodKey = (fecha: string) => {
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const sameService = (a: Expense, b: Expense) => {
  return a.categoria === b.categoria && a.subcategoria === b.subcategoria;
};

export const getAvailableCreditForExpense = (
  currentExpense: Expense,
  allExpenses: Expense[]
): number => {
  const currentPeriod = getPeriodKey(currentExpense.fecha);

  return allExpenses.reduce((acc, exp) => {
    if (!sameService(currentExpense, exp)) return acc;

    const generated = (exp as any).saldo_a_favor_generado ?? 0;
    if (generated <= 0) return acc;

    const nextPeriod = getNextPeriodKey(exp.fecha);

    if (nextPeriod === currentPeriod) {
      return acc + generated;
    }

    return acc;
  }, 0);
};

export const calculateExpenseWithCredit = (
  currentExpense: Expense,
  allExpenses: Expense[]
): Expense & {
  saldo_a_favor_aplicado?: number;
  monto_final_a_pagar?: number;
} => {
  const availableCredit = getAvailableCreditForExpense(currentExpense, allExpenses);
  const appliedCredit = Math.min(currentExpense.monto, availableCredit);
  const finalAmount = Math.max(0, currentExpense.monto - appliedCredit);

  return {
    ...currentExpense,
    saldo_a_favor_aplicado: appliedCredit,
    monto_final_a_pagar: finalAmount,
  };
};

export const registerPaymentWithCredit = (
  expense: Expense,
  montoPagado: number,
  allExpenses: Expense[]
): Expense & {
  saldo_a_favor_generado?: number;
  saldo_a_favor_aplicado?: number;
  monto_final_a_pagar?: number;
} => {
  const expenseWithCredit = calculateExpenseWithCredit(expense, allExpenses);

  const expectedAmount =
    expenseWithCredit.monto_final_a_pagar ?? expenseWithCredit.monto;

  const previousPaid = expense.total_abonado ?? 0;
  const newTotalPaid = previousPaid + montoPagado;

  const overpayment = Math.max(0, newTotalPaid - expectedAmount);
  const remaining = Math.max(0, expectedAmount - newTotalPaid);

  let estado_pago: EstadoPago = 'Pendiente';
  if (remaining === 0 && newTotalPaid > 0) estado_pago = 'Pagado';
  else if (newTotalPaid > 0) estado_pago = 'Parcial';

  return {
    ...expenseWithCredit,
    total_abonado: newTotalPaid,
    estado_pago,
    saldo_a_favor_generado: overpayment,
  };
};

export const gastosService = {
  async obtenerGastos(): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener gastos: ${error.message}`);
    }

    return (data as Expense[]) || [];
  },

  async crearGasto(gasto: ExpenseInput): Promise<Expense> {
    const { data, error } = await supabase
      .from('gastos')
      .insert(gasto)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear gasto: ${error.message}`);
    }

    return data as Expense;
  },

  async actualizarGasto(id: string, gasto: Partial<ExpenseInput>): Promise<void> {
    const { error } = await supabase
      .from('gastos')
      .update(gasto)
      .eq('id', id);

    if (error) {
      throw new Error(`Error al actualizar gasto: ${error.message}`);
    }
  },

  async eliminarGasto(id: string): Promise<void> {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar gasto: ${error.message}`);
    }
  },
};