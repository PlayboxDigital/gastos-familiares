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
    console.log("SERVICIO_ACTIVO: src/services/gastos.ts");
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    console.log("TABLA:", "gastos")
    console.log("ERROR:", error)
    console.log("ROWS:", Array.isArray(data) ? data.length : null)
    console.log("DATA:", data)

    if (error) {
      throw new Error(`Error al obtener gastos: ${error.message}`);
    }

    return (data as Expense[]) || [];
  },

  async crearGasto(gasto: ExpenseInput): Promise<Expense> {
    // Excluir tipo_gasto del payload enviado a Supabase ya que la columna no existe
    const { tipo_gasto, ...payload } = gasto;

    const { data, error } = await supabase
      .from('gastos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear gasto: ${error.message}`);
    }

    return data as Expense;
  },

  async actualizarGasto(id: string, gasto: Partial<ExpenseInput>): Promise<Expense> {
    console.log("SAVE_GASTO_ID:", id);
    console.log("SAVE_PAYLOAD:", gasto);

    // Excluir tipo_gasto del payload enviado a Supabase ya que la columna no existe
    const { tipo_gasto, ...payload } = gasto;

    const { data: responseData, error } = await supabase
      .from('gastos')
      .update(payload)
      .eq('id', id)
      .select();

    console.log("SAVE_RESPONSE_DATA:", responseData);
    console.log("SAVE_RESPONSE_ERROR:", error);

    if (error) {
      throw new Error(`Error al actualizar gasto: ${error.message}`);
    }

    // Si data es nulo o vacío, intentamos verificar si el ID existe realmente
    if (!responseData || responseData.length === 0) {
      console.warn("Supabase update no devolvió datos con .select(). Verificando existencia...");
      
      const { data: checkData, error: checkError } = await supabase
        .from('gastos')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (checkError) {
        console.error("Error al verificar existencia del gasto:", checkError);
      }

      if (!checkData) {
        throw new Error(`No se encontró el gasto con ID ${id} en la base de datos para actualizar.`);
      }

      // Si existe pero select() falló tras update, puede ser RLS o delay
      console.warn("El gasto existe pero .select() tras .update() falló. Usando fallback local.");
      
      // Intentamos recuperar el objeto completo para devolver algo válido
      const { data: fullRecord } = await supabase.from('gastos').select('*').eq('id', id).single();
      if (fullRecord) return fullRecord as Expense;

      // Fallback extremo
      return { id, ...gasto } as any as Expense;
    }

    return responseData[0] as Expense;
  },
  
  async archivarGasto(id: string, archived: boolean): Promise<void> {
    console.log("ARCHIVAR_GASTO_ID:", id);
    console.log("ARCHIVAR_NUEVO_VALOR:", archived);
    
    const { error } = await supabase
      .from('gastos')
      .update({ archived })
      .eq('id', id);

    if (error) {
      throw new Error(`Error al archivar gasto: ${error.message}`);
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