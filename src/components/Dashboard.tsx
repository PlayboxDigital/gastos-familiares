import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  CheckCircle2,
  Zap,
  Flame,
  AlertTriangle,
  Coffee,
  Pizza,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Expense, CategoryConfig, PaymentStatus, GastoPagoHistorial, Income, Debt, IngresoPago } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isSameMonth, differenceInDays, isBefore, isSameDay, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { getEstadoVencimiento } from '../estadoVencimiento';
import { generateExpenseOccurrences, isVariableExpense } from '../utils/expenseLogic';

interface DashboardProps {
  expenses: Expense[];
  categories: CategoryConfig[];
  incomes?: Income[];
  incomePayments?: IngresoPago[];
  debts?: Debt[];
  history?: GastoPagoHistorial[];
  onQuickPayExpense?: (expense: Expense) => void;
  onTabChange?: (tab: string) => void;
  onSelectIncome?: (clientName: string) => void;
}

type ExpenseWithCredit = Expense & {
  saldo_a_favor_aplicado?: number;
  monto_final_a_pagar?: number;
};

const getMontoExigible = (expense: ExpenseWithCredit): number => {
  if (typeof expense.monto_final_a_pagar === 'number') {
    return Math.max(0, expense.monto_final_a_pagar);
  }

  return Math.max(0, expense.monto - (expense.saldo_a_favor_aplicado ?? 0));
};

const getEstadoPagoReal = (
  expense: ExpenseWithCredit, 
  history: GastoPagoHistorial[] = [],
  currentMonth: Date = new Date()
): PaymentStatus => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  // Calculamos cuánto se ha pagado en este periodo específico
  const paidThisPeriod = history
    .filter(h => 
      h.gasto_id === expense.id && 
      h.periodo_anio === year && 
      h.periodo_mes === month
    )
    .reduce((sum, h) => sum + h.monto_pagado, 0);

  const montoExigible = getMontoExigible(expense);

  // Regla automática: Prioridad al monto pagado en el periodo
  if (montoExigible <= 0) return 'Pagado';
  if (paidThisPeriod >= montoExigible) return 'Pagado';
  if (paidThisPeriod > 0) return 'Parcial';

  // Fallback para gastos que pudieran haber sido marcados como pagados manualmente 
  // o que el total_abonado general ya cubra el monto exigible (aunque no haya historial de este mes)
  if (expense.estado_pago === 'Pagado') return 'Pagado';
  if (expense.estado_pago === 'Parcial') return 'Parcial';
  
  const totalAbonadoGral = expense.total_abonado ?? 0;
  if (totalAbonadoGral >= montoExigible) return 'Pagado';
  if (totalAbonadoGral > 0) return 'Parcial';

  return 'Pendiente';
};

export const Dashboard: React.FC<DashboardProps> = ({
  expenses = [],
  categories = [],
  incomes = [],
  incomePayments = [],
  debts = [],
  history = [],
  onQuickPayExpense,
  onTabChange,
  onSelectIncome,
}) => {
  const currentMonth = new Date();
  const currentPeriod = format(currentMonth, 'yyyy-MM');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthlyExpenses = useMemo(() => {
    console.log("DASHBOARD_CALC_1_START: monthlyExpenses", expenses.length);
    try {
      const result = expenses.filter((e) => {
        if (!e.fecha || e.archived) return false;
        try {
          // Usamos la lógica centralizada de ocurrencias para determinar si el gasto aplica a este mes
          const occurrences = generateExpenseOccurrences(e, currentMonth);
          return occurrences.some(occ => isSameMonth(occ, currentMonth));
        } catch (err) {
          console.error('Error parsing date:', e.fecha, err);
          return false;
        }
      });
      console.log("DASHBOARD_CALC_1_END: monthlyExpenses", result.length);
      return result;
    } catch (e) {
      console.error("APP_ERROR_DERIVADO_EXPENSES_monthlyExpenses:", e, expenses);
      return [];
    }
  }, [expenses, currentMonth]);

  const getStatus = (e: Expense) => getEstadoPagoReal(e as ExpenseWithCredit, history, currentMonth);

  const totalMonthly = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + getMontoExigible(e as ExpenseWithCredit), 0),
    [monthlyExpenses]
  );

  const totalPagado = useMemo(
    () =>
      monthlyExpenses.reduce((sum, e) => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const paidThisMonth = history
          .filter(h => h.gasto_id === e.id && h.periodo_anio === year && h.periodo_mes === month)
          .reduce((s, h) => s + h.monto_pagado, 0);
        
        const montoExigible = getMontoExigible(e as ExpenseWithCredit);
        return sum + Math.min(paidThisMonth, montoExigible);
      }, 0),
    [monthlyExpenses, history, currentMonth]
  );

  const totalPendiente = useMemo(
    () =>
      monthlyExpenses.reduce((sum, e) => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const paidThisMonth = history
          .filter(h => h.gasto_id === e.id && h.periodo_anio === year && h.periodo_mes === month)
          .reduce((s, h) => s + h.monto_pagado, 0);

        const montoExigible = getMontoExigible(e as ExpenseWithCredit);
        const saldo = Math.max(0, montoExigible - paidThisMonth);
        return sum + saldo;
      }, 0),
    [monthlyExpenses, history, currentMonth]
  );

  // --- CÁLCULO DE LÍMITES POR RUBRO (Prompt 094) ---
  const categoryMetrics = useMemo(() => {
    return categories
      .map(cat => {
        const spent = monthlyExpenses
          .filter(e => e.categoria === cat.categoria)
          .reduce((sum, e) => sum + e.monto, 0);
        
        const limit = cat.limite_mensual || 0;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        
        let status: 'ok' | 'warning' | 'exceeded' | 'no-limit' = 'ok';
        if (limit === 0) status = 'no-limit';
        else if (percent >= 100) status = 'exceeded';
        else if (percent >= 80) status = 'warning';
        
        return {
          ...cat,
          spent,
          limit,
          percent: Math.min(100, percent),
          realPercent: percent,
          status
        };
      })
      .sort((a, b) => {
        // Ordenar: Excedidos primero, luego porcentajes altos, luego sin límite al final
        if (a.status === 'no-limit' && b.status !== 'no-limit') return 1;
        if (a.status !== 'no-limit' && b.status === 'no-limit') return -1;
        return b.realPercent - a.realPercent;
      });
  }, [categories, monthlyExpenses]);
  const activeIncomes = useMemo(() => {
    return (incomes || []).filter(i => {
      const isStatusActive = (i.estado?.toLowerCase() || 'activo') === 'activo';
      return isStatusActive;
    });
  }, [incomes]);

  const totalCobroMensualClientes = useMemo(() => {
    return activeIncomes.reduce((sum, i) => {
      const monto = i.monto_mensual || i.monto_mensual_ars || i.monto || i.monto_total || 0;
      return sum + monto;
    }, 0);
  }, [activeIncomes]);

  const libreEstimado = totalCobroMensualClientes - totalMonthly;

  const pendingDebtsSum = useMemo(() => 
    debts.filter(d => d.estado !== 'pagada').reduce((sum, d) => sum + (d.saldo_pendiente || 0), 0),
  [debts]);

  const pendingDebtsCount = useMemo(() => 
    debts.filter(d => d.estado !== 'pagada').length,
  [debts]);

  const pagosRealizados = useMemo(
    () =>
      monthlyExpenses
        .filter((e) => {
          const estadoPagoReal = getStatus(e);
          return estadoPagoReal === 'Pagado';
        })
        .sort((a, b) => {
          const aMonto = Math.min(
            a.total_abonado ?? 0,
            getMontoExigible(a as ExpenseWithCredit)
          );
          const bMonto = Math.min(
            b.total_abonado ?? 0,
            getMontoExigible(b as ExpenseWithCredit)
          );
          return bMonto - aMonto;
        }),
    [monthlyExpenses]
  );

  const pagosPendientes = useMemo(
    () =>
      monthlyExpenses
        .filter((e) => getStatus(e) !== 'Pagado')
        .sort((a, b) => {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth() + 1;
          
          const paidA = history.filter(h => h.gasto_id === a.id && h.periodo_anio === year && h.periodo_mes === month).reduce((s, h) => s + h.monto_pagado, 0);
          const paidB = history.filter(h => h.gasto_id === b.id && h.periodo_anio === year && h.periodo_mes === month).reduce((s, h) => s + h.monto_pagado, 0);

          const saldoA = Math.max(0, getMontoExigible(a as ExpenseWithCredit) - paidA);
          const saldoB = Math.max(0, getMontoExigible(b as ExpenseWithCredit) - paidB);
          return saldoB - saldoA;
        }),
    [monthlyExpenses, history, currentMonth]
  );

  const proximosVencimientos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return pagosPendientes
      .map(e => {
        let deadlineDate: Date;
        
        if (e.dia_vencimiento) {
          // Si tiene día de vencimiento, asumimos este mes
          deadlineDate = new Date(today.getFullYear(), today.getMonth(), e.dia_vencimiento);
        } else {
          // Si no, usamos la fecha original
          deadlineDate = parseISO(e.fecha);
        }
        deadlineDate.setHours(0, 0, 0, 0);

        const diff = differenceInDays(deadlineDate, today);
        
        let urgency: 'vencido' | 'hoy' | 'pronto';
        if (isBefore(deadlineDate, today)) {
          urgency = 'vencido';
        } else if (isSameDay(deadlineDate, today)) {
          urgency = 'hoy';
        } else if (diff <= 31) { // Aumentado de 7 a 31 para que no "desaparezcan" al editar vencimientos lejanos (Prompt 082)
          urgency = 'pronto';
        } else {
          return null; // Demasiado lejos
        }

        return {
          ...e,
          deadlineDate,
          urgency,
          diff
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => {
        // Orden: vencidos primero, luego hoy, luego pronto
        const order = { vencido: 0, hoy: 1, pronto: 2 };
        if (order[a.urgency] !== order[b.urgency]) {
          return order[a.urgency] - order[b.urgency];
        }
        // Dentro de la misma categoría, por fecha más cercana
        return a.deadlineDate.getTime() - b.deadlineDate.getTime();
      })
      .slice(0, 5);
  }, [pagosPendientes, history, currentMonth]);

  const pendingEssentialExpenses = useMemo(() => {
    return monthlyExpenses.filter((e) => {
      const esEsencial =
        e.prioridad === 'Esencial' ||
        (e as any).esencial === true ||
        (e as any).tipo === 'esencial';

      return esEsencial && getStatus(e) !== 'Pagado';
    });
  }, [monthlyExpenses, history, currentMonth]);

  const totalPendingEssentialAmount = useMemo(() => {
    return pendingEssentialExpenses.reduce((sum, e) => {
      const saldo = Math.max(
        0,
        getMontoExigible(e as ExpenseWithCredit) - (e.total_abonado ?? 0)
      );
      return sum + saldo;
    }, 0);
  }, [pendingEssentialExpenses]);

  const clientesPorCobrar = useMemo(() => {
    return incomes
      .filter((income) => (income.estado?.toLowerCase() || 'activo') === 'activo')
      .map((income) => {
        const payment = incomePayments.find((p) =>
          p.ingreso_id === income.id &&
          p.periodo === currentPeriod
        );

        const monto = income.monto_mensual || income.monto_mensual_ars || income.monto || income.monto_total || 0;
        const pagado = payment?.monto_pagado || 0;
        const saldo = Math.max(0, monto - pagado);
        const estado = payment?.estado || income.estado_pago || 'Pendiente';

        return {
          ...income,
          saldo,
          estado,
        };
      })
      .filter((income) => income.estado !== 'Pagado' && income.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 6);
  }, [incomes, incomePayments, currentPeriod]);

  const currentMonthName = useMemo(() => {
    try {
      return format(currentMonth, 'MMMM', { locale: es });
    } catch {
      return 'Mes';
    }
  }, [currentMonth]);

  const diaActual = new Date().getDate();

  const essentialOverdueExpenses = useMemo(() => {
    return monthlyExpenses.filter((e) => {
      const esEsencial =
        e.prioridad === 'Esencial' ||
        (e as any).esencial === true ||
        (e as any).tipo === 'esencial';

      return esEsencial && getEstadoVencimiento(e) === 'vencido';
    });
  }, [monthlyExpenses]);

  const mostUrgentExpense = useMemo(() => {
    return essentialOverdueExpenses[0] || pendingEssentialExpenses[0] || pagosPendientes[0];
  }, [essentialOverdueExpenses, pendingEssentialExpenses, pagosPendientes]);

  const riesgoFinanciero = useMemo(() => {
    return essentialOverdueExpenses.reduce((sum, e) => {
      const saldo = Math.max(
        0,
        getMontoExigible(e as ExpenseWithCredit) - (e.total_abonado ?? 0)
      );
      return sum + saldo;
    }, 0);
  }, [essentialOverdueExpenses]);

  const hasPendingEssentials = pendingEssentialExpenses.length > 0;
  const hasOverdueEssentials = essentialOverdueExpenses.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">
            ¡Hola, Familia!
          </h2>
          <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
            Resumen de actividad • {currentMonthName} {new Date().getFullYear()}
          </p>
        </div>

        <div className="flex items-center gap-2">
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
        <KPICard
          title="Cobro Mensual Clientes"
          value={`$${totalCobroMensualClientes.toLocaleString()}`}
          icon={<Users className="h-5 w-5 text-indigo-500" />}
          description="Potencial bruto mensual"
          color="indigo"
        />
        <KPICard
          title="Gastos del Mes"
          value={`$${totalMonthly.toLocaleString()}`}
          icon={<TrendingDown className="h-5 w-5 text-rose-500" />}
          description="Total gastos mensuales"
          color="rose"
        />
        <KPICard
          title="Libre Estimado"
          value={`$${libreEstimado.toLocaleString()}`}
          icon={<Wallet className="h-5 w-5 text-emerald-500" />}
          description="Balance proyectado"
          color={libreEstimado >= 0 ? "emerald" : "rose"}
        />
      </div>

      <div className="space-y-4">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm"
        >
          {/* Background pattern */}
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-slate-50 opacity-50" />
          <div className="absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-slate-50 opacity-50" />

          <div className="relative z-10 flex items-start gap-5">
            <div className="rounded-2xl bg-slate-800 p-4 shadow-lg text-white">
              <Activity className="h-7 w-7" />
            </div>

            <div className="flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">
                    Seguimiento Crítico <span className="text-slate-400">/</span> {currentMonthName}
                  </h4>
                  <p className="text-xs font-medium text-slate-500 italic">Control de gastos esenciales por fecha de vencimiento</p>
                </div>

                <span className={`rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                  hasOverdueEssentials ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {hasOverdueEssentials ? 'Estado Crítico' : 'Todo en Orden'}
                </span>
              </div>

              <div className="mt-6 text-sm">
                {hasPendingEssentials ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                      <span className="text-slate-600">
                        Tenés <span className="font-bold text-slate-900">{pendingEssentialExpenses.length}</span> pendientes por un total de
                      </span>
                      <span className="rounded-xl bg-slate-900 px-3 py-1 text-lg font-black tabular-nums text-white">
                        ${totalPendingEssentialAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {pendingEssentialExpenses.map((e) => {
                        const estado = getEstadoVencimiento(e);
                        const saldo = Math.max(
                          0,
                          getMontoExigible(e as ExpenseWithCredit) - (e.total_abonado ?? 0)
                        );

                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => onQuickPayExpense?.(e)}
                            className={`group flex items-center justify-between rounded-2xl border-2 p-4 transition-all hover:shadow-lg active:scale-95 text-left border-slate-100 bg-white ${
                              estado === 'vencido'
                                ? 'border-rose-200 ring-4 ring-rose-50/50'
                                : estado === 'por_vencer'
                                ? 'border-amber-200 ring-4 ring-amber-50/50'
                                : 'hover:border-slate-300'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <p className={`truncate text-sm font-black tracking-tight ${
                                  estado === 'vencido' ? 'text-rose-900' : estado === 'por_vencer' ? 'text-amber-800' : 'text-slate-800'
                                }`}
                              >
                                {e.subcategoria}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5 opacity-60">
                                {estado === 'vencido' ? <Flame className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                                <p className="truncate text-[10px] font-bold uppercase tracking-wider">
                                  {e.categoria}
                                </p>
                              </div>
                            </div>

                            <p className="ml-3 text-sm font-black tabular-nums text-slate-900 bg-slate-50 px-2 py-1 rounded-lg">
                              ${saldo.toLocaleString()}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="mb-4 rounded-full bg-emerald-100 p-6 text-emerald-600 shadow-inner">
                      <CheckCircle2 className="h-12 w-12" />
                    </div>
                    <span className="text-lg font-black text-emerald-900 uppercase tracking-tight">¡Misión Cumplida!</span>
                    <p className="font-medium text-emerald-600 italic">Todos los esenciales de este mes están pagados.</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full">
          <CardHeader className="p-4 md:px-5 md:pt-5 md:pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm md:text-base font-black text-slate-900 tracking-tight">Clientes por cobrar</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-4 pt-0 flex-1 overflow-hidden">
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {clientesPorCobrar.length > 0 ? (
                clientesPorCobrar.map((i) => {
                  const config = {
                    text: i.estado === 'Parcial' ? 'Parcial' : 'Pendiente',
                    color: i.estado === 'Parcial'
                      ? 'text-amber-600 bg-amber-50 border-amber-100'
                      : 'text-blue-600 bg-blue-50 border-blue-100',
                    icon: i.estado === 'Parcial'
                      ? <Activity className="w-2.5 h-2.5" />
                      : <Calendar className="w-2.5 h-2.5" />
                  };

                  return (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => onSelectIncome?.(i.cliente)}
                      className="group w-full flex items-center justify-between rounded-xl border border-slate-50 bg-white p-3 transition-all hover:bg-slate-50 text-left active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-[10px] ${config.color}`}>
                          {i.cliente?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-slate-900 leading-tight">{i.cliente}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`flex items-center gap-0.5 rounded px-1 py-0 text-[8px] font-black uppercase tracking-wider border ${config.color}`}>
                              {config.icon}
                              {config.text}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="text-[13px] font-black tabular-nums text-emerald-600">
                          ${i.saldo.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-[11px] font-bold italic">Sin cobros pendientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full">
          <CardHeader className="p-4 md:px-5 md:pt-5 md:pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                  <Calendar className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm md:text-base font-black text-slate-900 tracking-tight">Próximos Vencimientos</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-4 pt-0 flex-1 overflow-hidden">
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {proximosVencimientos.length > 0 ? (
                proximosVencimientos.map((e) => {
                  const saldo = Math.max(
                    0,
                    getMontoExigible(e as ExpenseWithCredit) - (e.total_abonado ?? 0)
                  );

                  const urgencyLabels = {
                    vencido: { text: 'Vencido', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: <Flame className="w-2.5 h-2.5" /> },
                    hoy: { text: 'Hoy', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Zap className="w-2.5 h-2.5" /> },
                    pronto: { text: `En ${e.diff}d`, color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Activity className="w-2.5 h-2.5" /> }
                  };

                  const config = urgencyLabels[e.urgency];

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onQuickPayExpense?.(e)}
                      className="group w-full flex items-center justify-between rounded-xl border border-slate-50 bg-white p-3 transition-all hover:bg-slate-50 text-left active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-[10px] ${config.color}`}>
                          {e.subcategoria?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-slate-900 leading-tight">{e.subcategoria}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`flex items-center gap-0.5 rounded px-1 py-0 text-[8px] font-black uppercase tracking-wider border ${config.color}`}>
                              {config.icon}
                              {config.text}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 italic">
                               {format(e.deadlineDate, "dd MMM", { locale: es })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="text-[13px] font-black tabular-nums text-slate-900">
                          ${saldo.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-[11px] font-bold italic">Sin vencimientos...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full">
          <CardHeader className="p-4 md:px-5 md:pt-5 md:pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-200">
                  <Activity className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm md:text-base font-black text-slate-900 tracking-tight">Pendientes</CardTitle>
              </div>
              {pagosPendientes.length > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600 border border-amber-100">
                  {pagosPendientes.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-4 pt-0 flex-1 overflow-hidden">
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {pagosPendientes.length > 0 ? (
                pagosPendientes.slice(0, 8).map((e) => {
                  const saldo = Math.max(
                    0,
                    getMontoExigible(e as ExpenseWithCredit) - (e.total_abonado ?? 0)
                  );

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onQuickPayExpense?.(e)}
                      className="group w-full flex items-center justify-between rounded-xl border border-slate-50 bg-white p-3 transition-all hover:bg-amber-50/30 text-left active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 font-black text-slate-400 text-[10px] group-hover:bg-amber-100 group-hover:text-amber-600">
                          {e.subcategoria?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-slate-900 leading-tight">{e.subcategoria}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="rounded px-1 py-0 text-[8px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 truncate group-hover:bg-white">
                              {e.categoria}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className="text-[13px] font-black tabular-nums text-slate-900">
                          ${saldo.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Pizza className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-[11px] font-bold italic">Todo al día...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full">
          <CardHeader className="p-4 md:px-5 md:pt-5 md:pb-3">
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm md:text-base font-black text-slate-900 tracking-tight">Realizados</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 md:px-4 pb-4 pt-0 flex-1 overflow-hidden">
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {pagosRealizados.length > 0 ? (
                pagosRealizados.slice(0, 8).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl border border-slate-50 bg-white p-3 transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 font-black text-emerald-600 text-[10px]">
                         <TrendingDown className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-black text-slate-900 leading-tight">{e.subcategoria}</p>
                         <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="rounded px-1 py-0 text-[8px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 truncate">
                              {e.categoria}
                            </span>
                          </div>
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-[13px] font-black tabular-nums text-emerald-600">
                        ${Math.min(
                          e.total_abonado ?? 0,
                          getMontoExigible(e as ExpenseWithCredit)
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Coffee className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-[11px] font-bold italic">Nada pagado aún...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {categoryMetrics.length > 0 && (
        <div className="grid grid-cols-1 mb-6">
          <Card className="rounded-2xl md:rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            <CardHeader className="p-4 md:px-8 md:pt-8 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl font-black text-slate-900 tracking-tight underline decoration-emerald-200 decoration-8 underline-offset-[-2px] decoration-skip-ink-none">Control de Presupuesto Mensual</CardTitle>
                  <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Control por rubro / categoría</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> OK
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 80%+
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> CRÍTICO
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-8 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categoryMetrics.map((cat) => (
                  <div key={cat.categoria} className="space-y-3 group p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all hover:bg-white hover:shadow-md">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-700 truncate">{cat.categoria}</span>
                      </div>
                      <span className={
                        cat.status === 'exceeded' ? 'text-rose-600' : 
                        cat.status === 'warning' ? 'text-amber-600' : 
                        'text-slate-400 font-bold'
                      }>
                        ${cat.spent.toLocaleString()} <span className="text-slate-300">/</span> {cat.limit > 0 ? `$${cat.limit.toLocaleString()}` : <span className="text-slate-300 opacity-50">—</span>}
                      </span>
                    </div>

                    {cat.limit > 0 ? (
                      <>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percent}%` }}
                            className={`h-full rounded-full transition-all ${
                              cat.status === 'exceeded' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 
                              cat.status === 'warning' ? 'bg-amber-500' : 
                              'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <div className="flex justify-between items-center h-4">
                          <span className={`text-[9px] font-bold ${
                            cat.status === 'exceeded' ? 'text-rose-500' : 'text-slate-400'
                          }`}>
                            {cat.status === 'exceeded' ? 'Límite excedido' : `${Math.round(cat.realPercent)}% consumido`}
                          </span>
                          {cat.status === 'exceeded' && <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" />}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between h-5">
                        <span className="text-[9px] font-bold text-slate-400 italic">Sin límite configurado</span>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter bg-slate-100 px-1 rounded">Budget Off</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 pb-12">
        <Card className="rounded-2xl md:rounded-[2.5rem] border-none bg-white shadow-xl shadow-slate-200/50">
          <CardHeader className="p-4 md:px-8 md:pt-8">
            <CardTitle className="text-lg md:text-xl font-black text-slate-900 tracking-tight underline decoration-indigo-200 decoration-8 underline-offset-[-2px] decoration-skip-ink-none">Ranking de Gastos</CardTitle>
            <CardDescription className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Los 5 más caros del mes</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-4 md:pb-8 pt-2 md:pt-4">
            <div className="space-y-3">
              {[...monthlyExpenses]
                .sort((a, b) => b.monto - a.monto)
                .slice(0, 5)
                .map((e, i) => (
                  <div
                    key={e.id}
                    className="group flex items-center justify-between rounded-2xl border-2 border-slate-50 p-4 transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 font-black text-white text-sm shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{e.subcategoria}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {e.categoria}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                        <span className="rounded-xl bg-slate-100 px-3 py-1 text-sm font-black tabular-nums text-slate-900 group-hover:bg-indigo-100 group-hover:text-indigo-900 transition-colors">
                            ${e.monto.toLocaleString()}
                        </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Subcomponente de Icono para Props
const FlagIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
);

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  trendUp?: boolean;
  compact?: boolean;
  color?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'orange' | 'slate';
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ 
    title, 
    value, 
    icon, 
    description, 
    trendUp, 
    compact,
    color = 'slate',
    onClick
}) => {
  const colorStyles = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/50 overflow-hidden',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/50',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-100/50',
    orange: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-100/50',
    slate: 'bg-slate-50 text-slate-600 border-slate-100 shadow-slate-100/50',
  };

  const iconBgStyles = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    rose: 'bg-rose-500',
    orange: 'bg-orange-500',
    slate: 'bg-slate-800',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <Card className={`relative h-full overflow-hidden border-none bg-white p-3 md:p-5 shadow-xl transition-all duration-300 ${compact ? 'rounded-xl md:rounded-[1.5rem]' : 'rounded-2xl md:rounded-[2rem]'}`}>
        <div className={`absolute -right-6 -top-6 h-12 w-12 md:h-20 md:w-20 rounded-full opacity-[0.03] ${iconBgStyles[color]}`} />
        
        <div className="relative z-10 flex flex-col h-full bg-white">
          <div className="mb-2 md:mb-4 flex items-center justify-between">
            <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-400">{title}</h3>
            <div className={`flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl md:rounded-2xl shadow-lg transition-transform hover:rotate-12 ${color === 'slate' ? 'bg-slate-800' : iconBgStyles[color]} text-white`}>
              {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4 md:h-5 md:w-5' })}
            </div>
          </div>
          
          <div className="flex-1">
            <div className={`flex items-baseline gap-1 ${compact ? 'text-sm md:text-xl' : 'text-lg md:text-3xl'} font-black tracking-tighter text-slate-900`}>
              {value}
            </div>
          </div>

          <div className="mt-1 md:mt-2 flex items-center gap-1 md:gap-1.5">
            {trendUp !== undefined && (
              <div className={`flex items-center gap-0.5 rounded-md md:rounded-lg px-1 md:px-1.5 py-0.5 text-[8px] md:text-[9px] font-black uppercase tracking-tight ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {trendUp ? <TrendingUp className="h-2 w-2 md:h-2.5 md:w-2.5" /> : <TrendingDown className="h-2 w-2 md:h-2.5 md:w-2.5" />}
                {trendUp ? '+2%' : '-1%'}
              </div>
            )}
            <p className="text-[8px] md:text-[10px] font-bold italic text-slate-400 truncate">
               {description}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
