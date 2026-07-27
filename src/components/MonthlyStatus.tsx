import React, { useMemo, useState } from 'react';
import { addMonths, format, isSameMonth, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  History,
  Pencil,
  Receipt,
  Search,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Expense, GastoPagoHistorial, PaymentStatus, TicketCompra } from '../types';
import {
  getExpensePaymentStatusForPeriod,
  getMontoExigible,
  getPaidAmountForPeriod,
  getPaymentEffectivePeriod,
  getPendingAmountForPeriod,
  isExpenseApplicableInMonth,
} from '../utils/expenseLogic';
import {
  getMonthlyFinancialSummary,
  MonthlyFinancialSource,
} from '../utils/monthlyFinancialSummary';

type SourceKind = MonthlyFinancialSource;
type DetailKind =
  | 'spent'
  | 'paid'
  | 'pending'
  | 'committed'
  | 'fixed'
  | 'variable'
  | 'vehicle'
  | 'ticket';
type QuickFilter = 'all' | 'paid' | 'pending' | SourceKind;

interface MonthlyStatusProps {
  expenses: Expense[];
  vehicleExpenses: Expense[];
  tickets: TicketCompra[];
  history: GastoPagoHistorial[];
  currentMonth: Date;
  updatingPaymentIds: Set<string>;
  onEdit: (expense: Expense) => void;
  onPay: (expense: Expense) => void;
  onHistory: (expense: Expense) => void;
}

interface FinancialEvent {
  id: string;
  expenseId?: string;
  paymentId?: string;
  date: string;
  concept: string;
  category: string;
  responsible: string;
  amount: number;
  source: SourceKind;
  status: 'Pagado' | 'Pendiente';
}

interface MonthlyRow {
  id: string;
  date: string;
  concept: string;
  category: string;
  responsible: string;
  type: string;
  status: PaymentStatus | 'Vencido';
  amount: number;
  paid: number;
  pending: number;
  source: SourceKind;
  origin: string;
  expense?: Expense;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#64748b'];

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

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

const sourceLabel: Record<SourceKind, string> = {
  fixed: 'Gasto fijo',
  variable: 'Gasto variable',
  ticket: 'Ticket',
  vehicle: 'Vehículo',
};

const sourceBadge: Record<SourceKind, string> = {
  fixed: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  variable: 'bg-sky-50 text-sky-700 border-sky-100',
  ticket: 'bg-violet-50 text-violet-700 border-violet-100',
  vehicle: 'bg-orange-50 text-orange-700 border-orange-100',
};

const statusBadge: Record<MonthlyRow['status'], string> = {
  Pagado: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Pendiente: 'bg-amber-50 text-amber-700 border-amber-100',
  Parcial: 'bg-blue-50 text-blue-700 border-blue-100',
  Vencido: 'bg-rose-50 text-rose-700 border-rose-100',
};

const aggregateEvents = (events: FinancialEvent[], key: 'category' | 'responsible') => {
  const grouped = new Map<string, { name: string; amount: number; count: number }>();
  events.forEach((event) => {
    const name = event[key] || (key === 'responsible' ? 'Sin responsable' : 'Sin categoría');
    const current = grouped.get(name) || { name, amount: 0, count: 0 };
    current.amount += event.amount;
    current.count += 1;
    grouped.set(name, current);
  });
  const total = events.reduce((sum, event) => sum + event.amount, 0);
  return Array.from(grouped.values())
    .map((item) => ({ ...item, percentage: total > 0 ? (item.amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
};

export const MonthlyStatus: React.FC<MonthlyStatusProps> = ({
  expenses,
  vehicleExpenses,
  tickets,
  history,
  currentMonth,
  updatingPaymentIds,
  onEdit,
  onPay,
  onHistory,
}) => {
  const [activeDetail, setActiveDetail] = useState<DetailKind | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ));

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;
  const periodLabel = format(selectedMonth, 'MMMM yyyy', { locale: es });

  const ticketExpenseIds = useMemo(
    () => new Set(tickets.map((ticket) => ticket.gasto_id).filter(Boolean) as string[]),
    [tickets]
  );
  const isTicketExpense = React.useCallback(
    (expense?: Expense) =>
      !!expense && (
        ticketExpenseIds.has(expense.id) ||
        String(expense.servicio_clave || '').startsWith('ticket:')
      ),
    [ticketExpenseIds]
  );
  const isVehicleExpense = React.useCallback(
    (expense?: Expense) =>
      !!expense && (
        !!expense.movimiento_origen_id ||
        expense.origen === 'Vehículo' ||
        String(expense.servicio_clave || '').startsWith('vehiculo:')
      ),
    []
  );
  const applicableExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          expense.archived !== true && isExpenseApplicableInMonth(expense, selectedMonth)
      ),
    [expenses, selectedMonth]
  );

  const representedVehicleIds = useMemo(
    () =>
      new Set(
        expenses
          .map((expense) => expense.movimiento_origen_id)
          .filter(Boolean) as string[]
      ),
    [expenses]
  );

  const monthVehicleExpenses = useMemo(
    () =>
      vehicleExpenses.filter((expense) => {
        const date = safeDate(expense.fecha);
        return (
          !!date &&
          isSameMonth(date, selectedMonth) &&
          !representedVehicleIds.has(expense.movimiento_origen_id || '')
        );
      }),
    [vehicleExpenses, selectedMonth, representedVehicleIds]
  );

  const financialSummary = useMemo(
    () =>
      getMonthlyFinancialSummary({
        expenses,
        vehicleExpenses,
        tickets,
        history,
        targetMonth: selectedMonth,
      }),
    [expenses, vehicleExpenses, tickets, history, selectedMonth]
  );
  const paidEvents = useMemo<FinancialEvent[]>(
    () =>
      financialSummary.movimientos.map((movement) => ({
        ...movement,
        status: 'Pagado',
      })),
    [financialSummary]
  );

  const monthlyRows = useMemo<MonthlyRow[]>(() => {
    const expenseRows = applicableExpenses.map((expense) => {
      const paid = getPaidAmountForPeriod(expense.id, year, month, history);
      const pending = getPendingAmountForPeriod(expense, year, month, history);
      let status: MonthlyRow['status'] = getExpensePaymentStatusForPeriod(
        expense,
        year,
        month,
        history
      );
      const dueDay = Number(expense.dia_vencimiento || 0);
      if (
        status === 'Pendiente' &&
        dueDay > 0 &&
        new Date().getFullYear() === year &&
        new Date().getMonth() + 1 === month &&
        new Date().getDate() > dueDay
      ) {
        status = 'Vencido';
      }

      const source: SourceKind = isTicketExpense(expense)
        ? 'ticket'
        : isVehicleExpense(expense)
          ? 'vehicle'
        : expense.tipo === 'Fijo'
          ? 'fixed'
          : 'variable';
      const originalDate = safeDate(expense.fecha);
      const date =
        source === 'fixed'
          ? new Date(year, month - 1, Math.min(Math.max(dueDay || originalDate?.getDate() || 1, 1), 28))
          : originalDate || selectedMonth;

      return {
        id: expense.id,
        date: format(date, 'yyyy-MM-dd'),
        concept: expenseConcept(expense),
        category: expense.categoria || 'Sin categoría',
        responsible: expense.responsable || 'Sin responsable',
        type: expense.tipo || 'Variable',
        status,
        amount: getMontoExigible(expense, selectedMonth),
        paid,
        pending,
        source,
        origin: sourceLabel[source],
        expense,
      };
    });

    const vehicleRows: MonthlyRow[] = monthVehicleExpenses.map((expense) => ({
      id: expense.id,
      date: expense.fecha,
      concept: expenseConcept(expense),
      category: expense.categoria || 'Transporte',
      responsible: expense.responsable || 'Vehículo',
      type: 'Variable',
      status: 'Pagado',
      amount: Number(expense.monto || 0),
      paid: Number(expense.monto || 0),
      pending: 0,
      source: 'vehicle',
      origin: sourceLabel.vehicle,
      expense,
    }));

    return [...expenseRows, ...vehicleRows].sort(
      (a, b) => (safeDate(b.date)?.getTime() || 0) - (safeDate(a.date)?.getTime() || 0)
    );
  }, [
    applicableExpenses,
    monthVehicleExpenses,
    year,
    month,
    history,
    selectedMonth,
    isTicketExpense,
    isVehicleExpense,
  ]);

  const paidTotal = useMemo(
    () => paidEvents.reduce((sum, event) => sum + event.amount, 0),
    [paidEvents]
  );
  const pendingEvents = useMemo<FinancialEvent[]>(
    () =>
      monthlyRows
        .filter((row) => row.pending > 0 && row.source !== 'vehicle')
        .map((row) => ({
          id: `pending:${row.id}`,
          expenseId: row.id,
          date: row.date,
          concept: row.concept,
          category: row.category,
          responsible: row.responsible,
          amount: row.pending,
          source: row.source,
          status: 'Pendiente',
        })),
    [monthlyRows]
  );
  const pendingTotal = useMemo(
    () => pendingEvents.reduce((sum, event) => sum + event.amount, 0),
    [pendingEvents]
  );
  const committedTotal = paidTotal + pendingTotal;

  const sourceTotals = useMemo(
    () =>
      (['fixed', 'variable', 'vehicle', 'ticket'] as SourceKind[]).reduce(
        (result, source) => {
          const events = paidEvents.filter((event) => event.source === source);
          result[source] = {
            total: events.reduce((sum, event) => sum + event.amount, 0),
            count: events.length,
            events,
          };
          return result;
        },
        {} as Record<SourceKind, { total: number; count: number; events: FinancialEvent[] }>
      ),
    [paidEvents]
  );

  const categoryData = useMemo(() => aggregateEvents(paidEvents, 'category'), [paidEvents]);
  const responsibleData = useMemo(
    () => aggregateEvents(paidEvents, 'responsible'),
    [paidEvents]
  );

  const evolutionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) =>
      subMonths(selectedMonth, 5 - index)
    );
    return months.map((date) => {
      const targetYear = date.getFullYear();
      const targetMonth = date.getMonth() + 1;
      const payments = history
        .filter((payment) => {
          const period = getPaymentEffectivePeriod(payment);
          return period?.year === targetYear && period.month === targetMonth;
        })
        .reduce((sum, payment) => sum + Number(payment.monto_pagado || 0), 0);
      const vehicles = vehicleExpenses
        .filter((expense) => {
          const expenseDate = safeDate(expense.fecha);
          return (
            !!expenseDate &&
            expenseDate.getFullYear() === targetYear &&
            expenseDate.getMonth() + 1 === targetMonth &&
            !representedVehicleIds.has(expense.movimiento_origen_id || '')
          );
        })
        .reduce((sum, expense) => sum + Number(expense.monto || 0), 0);

      return {
        month: format(date, 'MMM', { locale: es }).replace('.', '').toUpperCase(),
        total: payments + vehicles,
      };
    });
  }, [selectedMonth, history, vehicleExpenses, representedVehicleIds]);

  const categories = useMemo(
    () => Array.from(new Set(monthlyRows.map((row) => row.category))).sort(),
    [monthlyRows]
  );
  const responsibles = useMemo(
    () => Array.from(new Set(monthlyRows.map((row) => row.responsible))).sort(),
    [monthlyRows]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es');
    return monthlyRows.filter((row) => {
      if (quickFilter === 'paid' && row.status !== 'Pagado') return false;
      if (quickFilter === 'pending' && row.pending <= 0) return false;
      if (
        ['fixed', 'variable', 'ticket', 'vehicle'].includes(quickFilter) &&
        row.source !== quickFilter
      ) return false;
      if (categoryFilter !== 'all' && row.category !== categoryFilter) return false;
      if (responsibleFilter !== 'all' && row.responsible !== responsibleFilter) return false;
      if (
        normalizedSearch &&
        !`${row.concept} ${row.category} ${row.responsible} ${row.origin}`
          .toLocaleLowerCase('es')
          .includes(normalizedSearch)
      ) return false;
      return true;
    });
  }, [monthlyRows, quickFilter, categoryFilter, responsibleFilter, search]);

  const topExpenses = useMemo(
    () => [...paidEvents].sort((a, b) => b.amount - a.amount).slice(0, 10),
    [paidEvents]
  );

  const detailConfig = useMemo(() => {
    if (!activeDetail) return null;
    const configs: Record<DetailKind, {
      title: string;
      subtotal: number;
      events: FinancialEvent[];
      breakdown?: { label: string; value: number }[];
    }> = {
      spent: {
        title: 'Total gastado en el mes',
        subtotal: paidTotal,
        events: paidEvents,
        breakdown: [
          { label: 'Gastos fijos', value: sourceTotals.fixed.total },
          { label: 'Variables comunes', value: sourceTotals.variable.total },
          { label: 'Vehículos', value: sourceTotals.vehicle.total },
          { label: 'Tickets', value: sourceTotals.ticket.total },
        ],
      },
      paid: { title: 'Pagado', subtotal: paidTotal, events: paidEvents },
      pending: { title: 'Pendiente', subtotal: pendingTotal, events: pendingEvents },
      committed: {
        title: 'Comprometido',
        subtotal: committedTotal,
        events: [...paidEvents, ...pendingEvents],
      },
      fixed: { title: 'Gastos fijos pagados', subtotal: sourceTotals.fixed.total, events: sourceTotals.fixed.events },
      variable: { title: 'Gastos variables pagados', subtotal: sourceTotals.variable.total, events: sourceTotals.variable.events },
      vehicle: { title: 'Gastos de vehículos', subtotal: sourceTotals.vehicle.total, events: sourceTotals.vehicle.events },
      ticket: { title: 'Tickets confirmados', subtotal: sourceTotals.ticket.total, events: sourceTotals.ticket.events },
    };
    return configs[activeDetail];
  }, [activeDetail, paidTotal, paidEvents, pendingTotal, pendingEvents, committedTotal, sourceTotals]);

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-600">
            Período seleccionado
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
            {periodLabel}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Resumen financiero</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={() => setSelectedMonth((value) => addMonths(value, -1))} aria-label="Mes anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" className="rounded-xl text-xs font-black uppercase" onClick={() => setSelectedMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))}>
            Mes actual
          </Button>
          <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={() => setSelectedMonth((value) => addMonths(value, 1))} aria-label="Mes siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ExecutiveCard
        title="TOTAL GASTADO EN EL MES"
        value={paidTotal}
        description="Incluye gastos fijos, variables, vehículos y tickets pagados."
        icon={<Wallet className="h-7 w-7" />}
        featured
        onClick={() => setActiveDetail('spent')}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <ExecutiveCard title="PAGADO" value={paidTotal} description="Dinero efectivamente abonado" icon={<CheckCircle2 />} color="emerald" onClick={() => setActiveDetail('paid')} />
        <ExecutiveCard title="PENDIENTE" value={pendingTotal} description="Saldo que resta pagar" icon={<Clock3 />} color="amber" onClick={() => setActiveDetail('pending')} />
        <ExecutiveCard title="COMPROMETIDO" value={committedTotal} description="Pagado + pendiente" icon={<CreditCard />} color="indigo" onClick={() => setActiveDetail('committed')} />
      </div>

      <section className="space-y-3">
        <SectionTitle title="Análisis del gasto" description="Distribución del dinero abonado por origen" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AnalysisCard title="Total gastos fijos" data={sourceTotals.fixed} icon={<Activity />} onClick={() => setActiveDetail('fixed')} />
          <AnalysisCard title="Total gastos variables" data={sourceTotals.variable} icon={<TrendingUp />} onClick={() => setActiveDetail('variable')} />
          <AnalysisCard title="Total vehículos" data={sourceTotals.vehicle} icon={<Car />} onClick={() => setActiveDetail('vehicle')} />
          <AnalysisCard title="Total tickets" data={sourceTotals.ticket} icon={<Receipt />} onClick={() => setActiveDetail('ticket')} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Distribución por categorías" description="Monto, porcentaje y cantidad de pagos">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} margin={{ left: 0, right: 8, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => money.format(value)} />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend data={categoryData} />
        </ChartCard>

        <ChartCard title="Distribución por responsable" description="Participación sobre el gasto abonado">
          <div className="grid items-center gap-3 sm:grid-cols-[1fr_1.1fr]">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={responsibleData} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {responsibleData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => money.format(value)} />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend data={responsibleData} />
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Evolución mensual" description="Comparación del dinero efectivamente gastado en los últimos seis meses">
        <ResponsiveContainer width="100%" height={290}>
          <LineChart data={evolutionData} margin={{ left: 0, right: 16, top: 12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value: number) => money.format(value)} />
            <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <section className="space-y-4">
        <SectionTitle title="Movimientos del mes" description={`${filteredRows.length} de ${monthlyRows.length} registros`} />
        <Card className="overflow-hidden rounded-3xl border-none shadow-xl shadow-slate-200/50">
          <div className="space-y-3 border-b border-slate-100 bg-white p-4 md:p-5">
            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'Todos'],
                ['paid', 'Pagados'],
                ['pending', 'Pendientes'],
                ['fixed', 'Fijos'],
                ['variable', 'Variables'],
                ['ticket', 'Tickets'],
                ['vehicle', 'Vehículos'],
              ] as [QuickFilter, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQuickFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
                    quickFilter === value
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar concepto, categoría u origen..." className="pl-9" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
                <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los responsables</SelectItem>
                  {responsibles.map((responsible) => <SelectItem key={responsible} value={responsible}>{responsible}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                {['Fecha', 'Concepto', 'Categoría', 'Responsable', 'Tipo', 'Estado', 'Monto', 'Origen', 'Acciones'].map((heading) => (
                  <TableHead key={heading} className="whitespace-nowrap text-[10px] font-black uppercase tracking-wider">{heading}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs font-semibold text-slate-500">
                    {safeDate(row.date) ? format(safeDate(row.date)!, 'dd/MM/yyyy') : '—'}
                  </TableCell>
                  <TableCell className="min-w-52 font-black text-slate-900">{row.concept}</TableCell>
                  <TableCell className="text-xs text-slate-600">{row.category}</TableCell>
                  <TableCell className="text-xs text-slate-600">{row.responsible}</TableCell>
                  <TableCell className="text-xs font-semibold">{row.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadge[row.status]}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-black">{money.format(row.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={sourceBadge[row.source]}>{row.origin}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.expense && row.source !== 'vehicle' ? (
                      <div className="flex gap-1">
                        {row.pending > 0 && (
                          <Button size="icon" variant="ghost" aria-label="Pagar" disabled={updatingPaymentIds.has(row.expense.id)} onClick={() => onPay(row.expense!)}>
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" aria-label="Historial" onClick={() => onHistory(row.expense!)}>
                          <History className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit(row.expense!)}>
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-slate-400">Registrado</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-slate-400">No hay movimientos para estos filtros.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50">
        <CardHeader>
          <CardTitle className="text-xl font-black">Top 10 gastos del mes</CardTitle>
          <CardDescription>Mayores pagos efectivos del período</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {topExpenses.map((event, index) => (
            <div key={event.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[32px_1fr_160px_160px]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-400">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{event.concept}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400 md:hidden">{event.category}</p>
              </div>
              <span className="hidden text-xs font-semibold text-slate-500 md:block">{safeDate(event.date) ? format(safeDate(event.date)!, 'dd/MM/yyyy') : '—'}</span>
              <span className="hidden text-xs font-semibold text-slate-500 md:block">{event.category}</span>
              <span className="font-black text-slate-900">{money.format(event.amount)}</span>
            </div>
          ))}
          {topExpenses.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Todavía no hay pagos registrados este mes.</p>}
        </CardContent>
      </Card>

      <DetailDialog
        open={activeDetail !== null}
        onClose={() => setActiveDetail(null)}
        period={periodLabel}
        config={detailConfig}
      />
    </div>
  );
};

const ExecutiveCard: React.FC<{
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color?: 'emerald' | 'amber' | 'indigo';
  featured?: boolean;
  onClick: () => void;
}> = ({ title, value, description, icon, color = 'indigo', featured, onClick }) => {
  const iconStyles = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative z-10 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-left text-slate-950 shadow-xl shadow-slate-200/60 outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:p-7 ${featured ? 'mx-auto max-w-4xl md:p-9' : ''}`}
    >
      <div className="relative z-20 flex items-center justify-between gap-4">
        <div className="relative z-20 min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">{title}</p>
          <p className={`${featured ? 'text-4xl md:text-6xl' : 'text-3xl'} mt-2 font-black tracking-tighter text-slate-950`}>
            {money.format(value)}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
        </div>
        <div className={`${featured ? 'h-16 w-16' : 'h-12 w-12'} relative z-20 flex shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-110 ${iconStyles[color]}`}>
          {icon}
        </div>
      </div>
    </button>
  );
};

const AnalysisCard: React.FC<{
  title: string;
  data: { total: number; count: number };
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, data, icon, onClick }) => (
  <button type="button" onClick={onClick} className="group text-left outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
    <Card className="h-full rounded-2xl border-none shadow-lg shadow-slate-200/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{money.format(data.total)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{data.count} pagos</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  </button>
);

const SectionTitle: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div>
    <h2 className="text-xl font-black tracking-tight text-slate-900">{title}</h2>
    <p className="text-xs font-semibold text-slate-400">{description}</p>
  </div>
);

const ChartCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <Card className="rounded-3xl border-none shadow-xl shadow-slate-200/50">
    <CardHeader>
      <CardTitle className="text-lg font-black">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const ChartLegend: React.FC<{
  data: { name: string; amount: number; percentage: number; count: number }[];
}> = ({ data }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {data.map((item, index) => (
      <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-slate-700">{item.name}</p>
            <p className="text-[10px] font-semibold text-slate-400">{item.count} gastos · {item.percentage.toFixed(1)}%</p>
          </div>
        </div>
        <span className="whitespace-nowrap text-xs font-black">{money.format(item.amount)}</span>
      </div>
    ))}
  </div>
);

const DetailDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  period: string;
  config: {
    title: string;
    subtotal: number;
    events: FinancialEvent[];
    breakdown?: { label: string; value: number }[];
  } | null;
}> = ({ open, onClose, period, config }) => (
  <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
    <DialogContent showCloseButton={false} className="max-h-[92dvh] w-[calc(100vw-16px)] max-w-3xl gap-0 overflow-hidden rounded-3xl border-none p-0 shadow-2xl">
      <DialogHeader className="relative border-b border-slate-100 bg-white px-6 py-5 pr-16">
        <DialogTitle className="text-xl font-black">{config?.title || 'Detalle'}</DialogTitle>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{period}</p>
        <DialogClose className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </DialogClose>
      </DialogHeader>
      <div className="max-h-[calc(92dvh-100px)] overflow-y-auto bg-slate-50/60 p-4 md:p-6">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subtotal</p>
            <p className="mt-1 text-xl font-black">{money.format(config?.subtotal || 0)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Registros</p>
            <p className="mt-1 text-xl font-black">{config?.events.length || 0}</p>
          </div>
        </div>
        {config?.breakdown && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {config.breakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {item.label}
                </span>
                <span className="text-sm font-black text-slate-900">{money.format(item.value)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {config?.events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{event.concept}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  {event.category} · {event.responsible} · {sourceLabel[event.source]} · {event.status}
                </p>
              </div>
              <span className="whitespace-nowrap font-black">{money.format(event.amount)}</span>
            </div>
          ))}
          {!config?.events.length && <p className="py-10 text-center text-sm text-slate-400">No hay movimientos para este período.</p>}
        </div>
        <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">Total</span>
          <span className="text-xl font-black">{money.format(config?.subtotal || 0)}</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
