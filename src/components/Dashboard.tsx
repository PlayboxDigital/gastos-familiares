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
  Phone,
  ArrowRight,
  MessageSquare,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Expense, CategoryConfig, PaymentStatus, GastoPagoHistorial, Income, Debt, IngresoPago } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isSameMonth, differenceInDays, isBefore, isSameDay, addDays, isValid, addMonths, lastDayOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { getEstadoVencimiento } from '../estadoVencimiento';
import { generateExpenseOccurrences, isVariableExpense, isFixedExpense, getMontoExigible, getPaidAmountForPeriod, getExpensePaymentStatusForPeriod, getPendingAmountForPeriod } from '../utils/expenseLogic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  onSelectDebtors?: () => void;
}

type ExpenseWithCredit = Expense & {
  saldo_a_favor_aplicado?: number;
  monto_final_a_pagar?: number;
};

const Dashboard: React.FC<DashboardProps> = ({
    expenses = [],
  categories = [],
  incomes = [],
  incomePayments = [],
  debts = [],
  history = [],
  onQuickPayExpense,
  onTabChange,
  onSelectIncome,
  onSelectDebtors,
}) => {
  const [isCobroModalOpen, setIsCobroModalOpen] = React.useState(false);
  const [activeCobroTab, setActiveCobroTab] = React.useState<string>("debtors");

  const { currentMonth, currentPeriod } = useMemo(() => {
    const d = new Date();
    return {
      currentMonth: d,
      currentPeriod: format(d, 'yyyy-MM')
    };
  }, []);

  const getPaidForMonth = React.useCallback((
    expense: Expense,
    targetMonth: Date,
    historyEntries: GastoPagoHistorial[] = []
  ): number => {
    if (!expense || expense.archived) return 0;

    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth() + 1;
    const occurrences = generateExpenseOccurrences(expense, targetMonth);

    if (!occurrences.some((occ) => isSameMonth(occ, targetMonth))) {
      return 0;
    }

    return getPaidAmountForPeriod(expense.id, year, month, historyEntries);
  }, []);

  const getPendingForMonth = React.useCallback(
    (
      expense: Expense,
      targetMonth: Date,
      historyEntries: GastoPagoHistorial[] = []
    ): number => {
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth() + 1;
      return getPendingAmountForPeriod(expense as ExpenseWithCredit, year, month, historyEntries);
    },
    []
  );

  const clientesStatus = useMemo(() => {
    const todayNum = new Date().getDate();

    const stats = (incomes || [])
      .filter((income) => (income.estado?.toLowerCase() || 'activo') === 'activo')
      .map((income) => {
        const payment = (incomePayments || []).find((p) =>
          p.ingreso_id === income.id &&
          p.periodo === currentPeriod
        );

        const montoMensual = income.monto_mensual || income.monto_mensual_ars || income.monto || income.monto_total || 0;
        const cobrado = payment?.monto_pagado || 0;
        const saldo = Math.max(0, montoMensual - cobrado);
        
        let estado: 'Pagado' | 'Parcial' | 'Vencido' | 'Pendiente' = 'Pendiente';
        if (payment?.estado === 'Pagado') estado = 'Pagado';
        else if (payment?.estado === 'Parcial') estado = 'Parcial';
        else if (todayNum >= 15) estado = 'Vencido';
        
        return {
          ...income,
          montoMensual,
          cobrado,
          saldo,
          estado,
          isDeudor: estado !== 'Pagado'
        };
      });

    const alDia = stats.filter(s => s.estado === 'Pagado');
    const conDeuda = stats.filter(s => s.estado !== 'Pagado');

    return {
      all: stats,
      alDia: {
        list: alDia,
        count: alDia.length,
        total: alDia.reduce((sum, s) => sum + s.montoMensual, 0)
      },
      conDeuda: {
        list: conDeuda,
        count: conDeuda.length,
        totalMensual: conDeuda.reduce((sum, s) => sum + s.montoMensual, 0),
        totalAdeudado: conDeuda.reduce((sum, s) => sum + s.saldo, 0)
      }
    };
  }, [incomes, incomePayments, currentPeriod]);

  React.useEffect(() => {
    if (isCobroModalOpen) {
      setActiveCobroTab(clientesStatus.conDeuda.count > 0 ? "debtors" : "paid");
    }
  }, [isCobroModalOpen, clientesStatus.conDeuda.count]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.fecha || e.archived) return false;

      try {
        const occurrences = generateExpenseOccurrences(e, currentMonth);
        return occurrences.some(occ => isSameMonth(occ, currentMonth));
      } catch (err) {
        console.error('Error parsing date:', e.fecha, err);
        return false;
      }
    });
  }, [expenses, currentMonth]);

  const getStatus = (e: Expense) => getExpensePaymentStatusForPeriod(e as ExpenseWithCredit, currentMonth.getFullYear(), currentMonth.getMonth() + 1, history);

  const promedioMensualData = useMemo(() => {
    const monthsWithData: number[] = [];
    const earliestMonth = expenses.reduce<Date | null>((acc, expense) => {
      if (!expense.fecha || expense.archived) return acc;
      try {
        const parsed = parseISO(expense.fecha);
        if (!isValid(parsed)) return acc;
        const monthStart = startOfMonth(parsed);
        return acc && acc < monthStart ? acc : monthStart;
      } catch {
        return acc;
      }
    }, null);

    const startCursor = earliestMonth ? startOfMonth(earliestMonth) : startOfMonth(currentMonth);
    const endCursor = startOfMonth(currentMonth);
    let cursor = new Date(startCursor);

    while (cursor < endCursor) {
      const monthlyPaid = expenses.reduce((sum, expense) => {
        if (!expense.fecha || expense.archived) return sum;
        const occurrences = generateExpenseOccurrences(expense, cursor);
        if (!occurrences.some((occ) => isSameMonth(occ, cursor))) return sum;
        return sum + getPaidAmountForPeriod(expense, cursor, history);
      }, 0);

      if (monthlyPaid > 0) {
        monthsWithData.push(monthlyPaid);
      }

      cursor = addMonths(cursor, 1);
    }

    const average = monthsWithData.length > 0
      ? monthsWithData.reduce((sum, value) => sum + value, 0) / monthsWithData.length
      : 0;

    return {
      average,
      monthsCount: monthsWithData.length,
    };
  }, [expenses, history, currentMonth, getPaidAmountForPeriod]);

  const promedioMensual = promedioMensualData.average;
  const gastadoMesActual = useMemo(
    () =>
      monthlyExpenses.reduce((sum, expense) => {
        return sum + getPaidForMonth(expense, currentMonth, history);
      }, 0),
    [monthlyExpenses, currentMonth, history, getPaidForMonth]
  );
  const totalPendienteReal = useMemo(
    () =>
      monthlyExpenses.reduce((sum, expense) => {
        return sum + getPendingForMonth(expense, currentMonth, history);
      }, 0),
    [monthlyExpenses, currentMonth, history, getPendingForMonth]
  );
  const restantePromedio = Math.max(promedioMensual - gastadoMesActual, 0);
  const faltaPagar = Math.max(restantePromedio, totalPendienteReal);
  const promedioDescription = promedioMensualData.monthsCount > 0
    ? `Calculado sobre ${promedioMensualData.monthsCount} ${promedioMensualData.monthsCount === 1 ? 'mes' : 'meses'}`
    : 'Sin meses completos con datos';
  const faltaPagarDescription = totalPendienteReal <= restantePromedio
    ? 'Dentro del promedio mensual'
    : 'Este mes se proyecta por encima del promedio';

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

  const fixedMonthlyExpenses = useMemo(
    () =>
      monthlyExpenses
        .filter((e) => isFixedExpense(e))
        .reduce((sum, e) => sum + getMontoExigible(e as ExpenseWithCredit), 0),
    [monthlyExpenses]
  );

  const expenseCategoryTotals = useMemo(() => {
    const normalize = (value: string | undefined) => (value || '').toLowerCase();
    const contains = (value: string | undefined, keyword: string) => normalize(value).includes(keyword);

    const supermarketTotal = monthlyExpenses
      .filter((e) => contains(e.categoria, 'supermercado') || contains(e.subcategoria, 'supermercado'))
      .reduce((sum, e) => sum + getMontoExigible(e as ExpenseWithCredit), 0);

    const foodTotal = monthlyExpenses
      .filter((e) => contains(e.categoria, 'comida') || contains(e.subcategoria, 'comida'))
      .reduce((sum, e) => sum + getMontoExigible(e as ExpenseWithCredit), 0);

    const cleaningTotal = monthlyExpenses
      .filter((e) => contains(e.categoria, 'limpieza') || contains(e.subcategoria, 'limpieza'))
      .reduce((sum, e) => sum + getMontoExigible(e as ExpenseWithCredit), 0);

    return {
      supermarketTotal,
      foodTotal,
      cleaningTotal,
      hasSpecificTotals: supermarketTotal > 0 || foodTotal > 0 || cleaningTotal > 0,
    };
  }, [monthlyExpenses]);

  const historicMonthlyPayments = useMemo(() => {
    const months = Array.from({ length: 4 }, (_, index) =>
      startOfMonth(addMonths(currentMonth, index - 3))
    );

    return months.map((date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const total = history
        .filter(
          (payment) =>
            Number(payment.periodo_anio) === year &&
            Number(payment.periodo_mes) === month
        )
        .reduce((sum, payment) => sum + Number(payment.monto_pagado || 0), 0);

      return {
        key: `${year}-${String(month).padStart(2, '0')}`,
        label: format(date, 'MMMM', { locale: es }),
        total,
        isCurrentMonth: isSameMonth(date, currentMonth),
      };
    });
  }, [history, currentMonth]);


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

  const monthlyIncome = totalCobroMensualClientes;
  const pendingReal = totalPendiente;
  const currentSurplus = monthlyIncome - totalPagado;
  const projectedSurplus = monthlyIncome - totalPagado - pendingReal;

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
          const paidA = getPaidForMonth(a, currentMonth, history);
          const paidB = getPaidForMonth(b, currentMonth, history);
          const aMonto = Math.min(paidA, getMontoExigible(a as ExpenseWithCredit));
          const bMonto = Math.min(paidB, getMontoExigible(b as ExpenseWithCredit));
          return bMonto - aMonto;
        }),
    [monthlyExpenses, currentMonth, history, getPaidForMonth]
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

  const getExpenseDeadlineForPeriod = (expense: Expense, referenceDate: Date): Date => {
    const deadline = expense.dia_vencimiento
      ? new Date(referenceDate.getFullYear(), referenceDate.getMonth(), expense.dia_vencimiento)
      : parseISO(expense.fecha);

    if (expense.dia_vencimiento) {
      const d = new Date(deadline);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    if (!isValid(deadline)) {
      const fallback = new Date(referenceDate);
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }

    if (isFixedExpense(expense)) {
      const originalDay = deadline.getDate();
      const lastDay = lastDayOfMonth(referenceDate).getDate();
      return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), Math.min(originalDay, lastDay));
    }

    deadline.setHours(0, 0, 0, 0);
    return deadline;
  };

  const proximosVencimientos = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return pagosPendientes
      .map(e => {
        const deadlineDate = getExpenseDeadlineForPeriod(e, today);

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

  // Unificado: Pagos pendientes con estado y orden
  const pagosPendientesUnified = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return pagosPendientes.map(e => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const paid = history.filter(h => h.gasto_id === e.id && h.periodo_anio === year && h.periodo_mes === month).reduce((s, h) => s + h.monto_pagado, 0);
      const saldo = Math.max(0, getMontoExigible(e as ExpenseWithCredit) - paid);
      const tienePagoParcial = paid > 0 && saldo > 0;

      const deadlineDate = getExpenseDeadlineForPeriod(e, today);

      const diff = differenceInDays(deadlineDate, today);
      const isVencido = isBefore(deadlineDate, today);
      const isHoy = isSameDay(deadlineDate, today);

      // Determinar estado
      let status: 'VENCIDO' | 'PENDIENTE' | 'PARCIAL';
      if (tienePagoParcial) {
        status = 'PARCIAL';
      } else if (isVencido) {
        status = 'VENCIDO';
      } else {
        status = 'PENDIENTE';
      }

      // Orden: 0=vencido, 1=hoy, 2=pronto/pendiente
      let urgencyOrder: number;
      if (isVencido) urgencyOrder = 0;
      else if (isHoy) urgencyOrder = 1;
      else urgencyOrder = 2;

      return {
        ...e,
        deadlineDate,
        diff,
        isVencido,
        isHoy,
        status,
        urgencyOrder,
        saldo
      };
    })
    .sort((a, b) => {
      // Primero por urgencia (vencido -> hoy -> pendiente)
      if (a.urgencyOrder !== b.urgencyOrder) {
        return a.urgencyOrder - b.urgencyOrder;
      }
      // Luego por fecha ascendente
      return a.deadlineDate.getTime() - b.deadlineDate.getTime();
    })
    .slice(0, 8);
  }, [pagosPendientes, history, currentMonth]);

  const getPagadoPeriodoActual = (expense: Expense): number => {
    return getPaidForMonth(expense, currentMonth, history);
  };

  const getSaldoPendientePeriodoActual = (expense: Expense): number => {
    return getPendingForMonth(expense, currentMonth, history);
  };

  const pendingEssentialExpenses = useMemo(() => {
    return monthlyExpenses.filter((e) => {
      const esEsencial =
        e.prioridad === 'Esencial' ||
        (e as any).esencial === true ||
        (e as any).tipo === 'esencial';

      return esEsencial && getSaldoPendientePeriodoActual(e) > 0;
    });
  }, [monthlyExpenses, history, currentMonth]);

  const totalPendingEssentialAmount = useMemo(() => {
    return pendingEssentialExpenses.reduce((sum, e) => {
      return sum + getSaldoPendientePeriodoActual(e);
    }, 0);
  }, [pendingEssentialExpenses, history, currentMonth]);

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
      const saldo = Number(e.monto || 0);
      return sum + saldo;
    }, 0);
  }, [essentialOverdueExpenses]);

  const hasPendingEssentials = pendingEssentialExpenses.length > 0;
  const hasOverdueEssentials = essentialOverdueExpenses.length > 0;

  const latestPayments = useMemo(() => {
    return [...history]
      .filter((payment) => Number(payment.monto_pagado || 0) > 0)
      .sort((a, b) => {
        const dateA = new Date(a.fecha_pago || a.fecha_registro || a.created_at || 0).getTime();
        const dateB = new Date(b.fecha_pago || b.fecha_registro || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 8)
      .map((payment) => {
        const expense = expenses.find((item) => item.id === payment.gasto_id);
        return {
          ...payment,
          concept: payment.gasto_concepto_snapshot || expense?.subcategoria || expense?.categoria || 'Pago',
          category: payment.categoria_snapshot || expense?.categoria || 'Sin categoría',
        };
      });
  }, [history, expenses]);


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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Ingresos del mes"
          value={`$${monthlyIncome.toLocaleString('es-AR')}`}
          icon={<DollarSign className="h-5 w-5" />}
          description="Ingresos mensuales activos"
          color="emerald"
        />
        <KPICard
          title="Pagado este mes"
          value={`$${totalPagado.toLocaleString('es-AR')}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          description="Pagos reales registrados"
          color="indigo"
        />
        <KPICard
          title="Pendiente real"
          value={`$${pendingReal.toLocaleString('es-AR')}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          description={pagosPendientesUnified.some((item) => item.isVencido) ? 'Incluye pagos vencidos' : 'Saldo pendiente del mes'}
          color={pendingReal > 0 ? 'amber' : 'emerald'}
        />
        <KPICard
          title="Disponible proyectado"
          value={`$${projectedSurplus.toLocaleString('es-AR')}`}
          icon={<Wallet className="h-5 w-5" />}
          description={`Disponible hoy: $${currentSurplus.toLocaleString('es-AR')}`}
          color={projectedSurplus >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {(pagosPendientesUnified.length > 0 || clientesPorCobrar.length > 0) && (
        <Card className="overflow-hidden rounded-3xl border-none bg-white shadow-xl shadow-slate-200/50">
          <CardHeader className="border-b border-slate-100 px-5 py-5 md:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tight text-slate-900">
                  Próximos movimientos
                </CardTitle>
                <CardDescription className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Lo que tenés que pagar y cobrar
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-2xl bg-rose-50 px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-rose-500">Por pagar</p>
                  <p className="text-sm font-black text-rose-700">
                    ${pagosPendientesUnified.reduce((sum, item) => sum + item.saldo, 0).toLocaleString('es-AR')}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Por cobrar</p>
                  <p className="text-sm font-black text-emerald-700">
                    ${clientesPorCobrar.reduce((sum, item) => sum + item.saldo, 0).toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
            <section className="overflow-hidden rounded-3xl bg-slate-950 text-white">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h3 className="text-sm font-black">Pagos próximos</h3>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Ordenados por vencimiento
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black">
                  {pagosPendientesUnified.length}
                </span>
              </div>

              <div className="divide-y divide-white/10">
                {pagosPendientesUnified.slice(0, 5).map((expense) => (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => onQuickPayExpense?.(expense)}
                    className="group flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/5"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        expense.isVencido
                          ? 'bg-rose-400'
                          : expense.status === 'PARCIAL'
                          ? 'bg-sky-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">{expense.subcategoria}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {expense.isVencido
                          ? 'Vencido'
                          : expense.status === 'PARCIAL'
                          ? 'Pago parcial'
                          : `Vence ${format(expense.deadlineDate, 'dd MMM', { locale: es })}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black tabular-nums text-white">
                        ${expense.saldo.toLocaleString('es-AR')}
                      </p>
                      <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Cobros pendientes</h3>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Clientes con saldo del mes
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
                  {clientesPorCobrar.length}
                </span>
              </div>

              <div className="divide-y divide-slate-200/70">
                {clientesPorCobrar.slice(0, 5).map((income) => (
                  <button
                    key={income.id}
                    type="button"
                    onClick={() => onSelectIncome?.(income.cliente)}
                    className="group flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-700">
                      {income.cliente?.charAt(0) || 'C'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{income.cliente}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {income.estado === 'Parcial' ? 'Cobro parcial' : 'Pendiente de cobro'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black tabular-nums text-emerald-600">
                        ${income.saldo.toLocaleString('es-AR')}
                      </p>
                      <ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50">
        <CardHeader className="px-4 py-4 md:px-6">
          <CardTitle className="text-lg font-black text-slate-900">Evolución de gastos</CardTitle>
          <CardDescription className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Gastos pagados en los últimos cuatro meses
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-5 md:px-6">
          {historicMonthlyPayments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {historicMonthlyPayments.map((month) => {
                const maxValue = Math.max(...historicMonthlyPayments.map((item) => item.total), 1);
                const width = Math.max(4, Math.round((month.total / maxValue) * 100));

                return (
                  <div key={month.key} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2 capitalize text-slate-500">
                        {month.label}
                        {month.isCurrentMonth && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[8px] font-black uppercase text-indigo-600">
                            Actual
                          </span>
                        )}
                      </span>
                      <span className="text-slate-900">${month.total.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Todavía no hay pagos registrados en estos meses.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCobroModalOpen} onOpenChange={setIsCobroModalOpen}>
        <DialogContent showCloseButton={false} className="max-w-[calc(100vw-16px)] sm:max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl max-h-[75dvh] sm:h-auto flex flex-col">
          <DialogHeader className="p-6 md:p-8 bg-indigo-600 text-white relative shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Users className="w-32 h-32" />
            </div>
            <DialogClose className="absolute right-4 top-4 rounded-full p-2.5 text-white/70 hover:text-white hover:bg-white/15 transition-all z-50">
              <X className="w-5 h-5" />
            </DialogClose>
            <DialogTitle className="text-2xl md:text-3xl font-black tracking-tighter pr-8">Cobro Mensual Clientes</DialogTitle>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">
              Resumen de cobranzas • {currentMonthName} {new Date().getFullYear()}
            </p>
          </DialogHeader>

          <Tabs value={activeCobroTab} onValueChange={setActiveCobroTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 md:px-8 mt-4 shrink-0">
              <TabsList className="w-full h-12 p-1 bg-slate-100 rounded-2xl grid grid-cols-2">
                <TabsTrigger 
                  value="debtors" 
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm"
                >
                  Con deuda ({clientesStatus.conDeuda.count})
                </TabsTrigger>
                <TabsTrigger 
                  value="paid" 
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm"
                >
                  Al día ({clientesStatus.alDia.count})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden p-6 md:p-8 pt-4 md:pt-4">
              <TabsContent value="debtors" className="h-full m-0 focus-visible:outline-none flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pendiente de cobro</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-rose-600 tracking-tighter">${clientesStatus.conDeuda.totalAdeudado.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Restante</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar space-y-2">
                  {clientesStatus.conDeuda.list.map(c => (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/50 transition-all text-left group"
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => {
                          setIsCobroModalOpen(false);
                          onSelectIncome?.(c.cliente);
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-[10px] font-black text-rose-600">
                          {c.cliente?.charAt(0)}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.cliente}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{c.telefono_cliente || 'Sin WhatsApp'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-black text-rose-600">${c.saldo.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Debe de ${c.montoMensual.toLocaleString()}</p>
                        </div>
                        
                        <div className="w-8 h-8 flex items-center justify-center">
                          {c.telefono_cliente ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-8 h-8 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanedPhone = c.telefono_cliente?.replace(/\D/g, '');
                                const monthName = format(new Date(), 'MMMM', { locale: es });
                                const day = new Date().getDate();
                                const msg = `Hola, estamos a ${day} de ${monthName} y todavía no me llegó el pago. ¿Podés confirmarme si ya lo realizaste? Gracias.`;
                                window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 cursor-not-allowed" title="Sin WhatsApp">
                              <Phone className="w-4 h-4 opacity-50" />
                            </div>
                          )}
                        </div>

                        <Badge className={`border-none text-[8px] font-black uppercase ${c.estado === 'Vencido' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {clientesStatus.conDeuda.list.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-black text-slate-900 uppercase">¡Al día!</p>
                      <p className="text-xs text-slate-400 font-medium italic">No hay clientes con deuda este mes.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="paid" className="h-full m-0 focus-visible:outline-none flex flex-col justify-center items-center text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Cobranzas realizadas</h4>
                
                <div className="space-y-1 mb-8">
                  <p className="text-4xl font-black text-emerald-600 tracking-tighter">${clientesStatus.alDia.total.toLocaleString()}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cobrado en {currentMonthName}</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 font-black">
                    {clientesStatus.alDia.count}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 uppercase">Clientes al día</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Sin deudas pendientes</p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-6 bg-slate-50 flex-col sm:flex-row gap-3 shrink-0">
            <Button 
              variant="outline" 
              className="rounded-2xl h-12 flex-1 font-black uppercase text-[10px] tracking-widest border-slate-200 text-slate-500 active:scale-95 transition-transform"
              onClick={() => setIsCobroModalOpen(false)}
            >
              Cerrar resumen
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 flex-1 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 gap-2 active:scale-95 transition-transform"
              onClick={() => {
                setIsCobroModalOpen(false);
                onSelectDebtors?.();
              }}
            >
              Ver todos los clientes
              <ArrowRight className="w-3 h-3" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <div className="grid grid-cols-1 pb-12">
        <Card className="rounded-2xl border-none bg-white shadow-xl shadow-slate-200/50 md:rounded-[2.5rem]">
          <CardHeader className="p-4 md:px-8 md:pt-8">
            <CardTitle className="text-lg font-black tracking-tight text-slate-900 md:text-xl">
              Detalle del mes
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 md:text-xs">
              Mayores gastos y últimos pagos
            </CardDescription>
          </CardHeader>

          <CardContent className="px-3 pb-4 pt-0 md:px-6 md:pb-8">
            <Tabs defaultValue="ranking" className="w-full">
              <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-slate-100 p-1 sm:w-[360px]">
                <TabsTrigger value="ranking" className="rounded-lg text-xs font-black">
                  Mayores gastos
                </TabsTrigger>
                <TabsTrigger value="latest" className="rounded-lg text-xs font-black">
                  Últimos pagos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ranking" className="m-0 space-y-3">
                {[...monthlyExpenses]
                  .sort(
                    (a, b) =>
                      getMontoExigible(b as ExpenseWithCredit) -
                      getMontoExigible(a as ExpenseWithCredit)
                  )
                  .slice(0, 5)
                  .map((expense, index) => {
                    const amount = getMontoExigible(expense as ExpenseWithCredit);
                    const participation = totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0;

                    return (
                      <div
                        key={expense.id}
                        className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                              #{index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">{expense.subcategoria}</p>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                {expense.categoria} · {Math.round(participation)}% del mes
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-black tabular-nums text-slate-900">
                            ${amount.toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-slate-800"
                            style={{ width: `${Math.min(100, participation)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                {monthlyExpenses.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No hay gastos registrados para este mes.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="latest" className="m-0 space-y-3">
                {latestPayments.map((payment) => {
                  const paymentDate = payment.fecha_pago || payment.fecha_registro || payment.created_at;
                  const parsedDate = paymentDate ? new Date(paymentDate) : null;

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{payment.concept}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {payment.category}
                            {parsedDate && isValid(parsedDate)
                              ? ` · ${format(parsedDate, 'dd MMM yyyy', { locale: es })}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-black tabular-nums text-emerald-600">
                        ${Number(payment.monto_pagado || 0).toLocaleString('es-AR')}
                      </span>
                    </div>
                  );
                })}

                {latestPayments.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Todavía no hay pagos registrados.
                  </p>
                )}
              </TabsContent>
            </Tabs>
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

export { Dashboard };
export default Dashboard;