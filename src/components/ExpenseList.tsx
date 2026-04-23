import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Search, Filter, Edit2,
  CheckCircle2, Clock, Activity, History as HistoryIcon
} from 'lucide-react';
import { Expense, Priority, PaymentStatus } from '../types';
import { CATEGORIES, RESPONSIBLES, PRIORITIES } from '../constants';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { getEstadoVencimiento, getColorVencimiento } from '../estadoVencimiento';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onTogglePayment: (id: string, currentStatus: PaymentStatus) => void;
  onShowHistory: (expense: Expense) => void;
  onActionPayment: (expense: Expense) => void;
  updatingPaymentIds: Set<string>;
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

const getEstadoPagoReal = (expense: ExpenseWithCredit): PaymentStatus => {
  const montoExigible = getMontoExigible(expense);
  const totalAbonado = expense.total_abonado ?? 0;

  if (montoExigible <= 0) return 'Pagado';
  if (totalAbonado >= montoExigible) return 'Pagado';
  if (totalAbonado > 0) return 'Parcial';

  return 'Pendiente';
};

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses = [],
  onEdit,
  onTogglePayment,
  onShowHistory,
  onActionPayment,
  updatingPaymentIds
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: 'asc' | 'desc' } | null>({
    key: 'fecha',
    direction: 'desc'
  });

  const handleSort = (key: keyof Expense) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredExpenses = useMemo(() => {
    console.log("EXPENSELIST_CALC_FILTER_START", expenses.length);
    try {
      const result = expenses.filter((e) => {
        const subcategoria = e.subcategoria || '';
        const concepto = e.concepto || '';
        const estadoPagoReal = getEstadoPagoReal(e as ExpenseWithCredit);

        const matchesSearch =
          subcategoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
          concepto.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = !categoryFilter || categoryFilter === 'all' || e.categoria === categoryFilter;
        const matchesResponsible = !responsibleFilter || responsibleFilter === 'all' || e.responsable === responsibleFilter;
        const matchesPriority = !priorityFilter || priorityFilter === 'all' || e.prioridad === priorityFilter;
        const matchesStatus = !statusFilter || statusFilter === 'all' || estadoPagoReal === statusFilter;

        return matchesSearch && matchesCategory && matchesResponsible && matchesPriority && matchesStatus;
      });

      if (sortConfig) {
        result.sort((a, b) => {
          const aValue = a[sortConfig.key] || '';
          const bValue = b[sortConfig.key] || '';

          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      console.log("EXPENSELIST_CALC_FILTER_END", result.length);
      return result;
    } catch (e) {
      console.error("APP_ERROR_DERIVADO_EXPENSES_filteredExpenses:", e, expenses);
      return [];
    }
  }, [expenses, searchTerm, categoryFilter, responsibleFilter, priorityFilter, statusFilter, sortConfig]);

  const totalFiltered = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.monto, 0),
    [filteredExpenses]
  );

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'Esencial':
        return 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-200';
      case 'Importante':
        return 'bg-amber-500 text-white border-transparent shadow-sm shadow-amber-200';
      case 'Prescindible':
        return 'bg-slate-400 text-white border-transparent shadow-sm shadow-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatDate = (dateStr: string, formatStr: string) => {
    if (!dateStr) return '';
    try {
      const date = parseISO(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, formatStr, { locale: es });
    } catch {
      return dateStr;
    }
  };

  const getVencimientoLabel = (expense: Expense) => {
    const estado = getEstadoVencimiento(expense);
    const dia = expense.dia_vencimiento;

    switch (estado) {
      case 'vencido':
        return `Vencido ${dia ? `(Día ${dia})` : ''}`;
      case 'por_vencer':
        return `Por vencer ${dia ? `(Día ${dia})` : ''}`;
      case 'en_plazo':
        return dia ? `Vence día ${dia}` : 'Pendiente';
      case 'pagado':
        return 'Pagado';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar gasto..."
            className="pl-9 bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="bg-slate-50 border-none">
            <SelectValue placeholder="Categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Categorías</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.categoria} value={c.categoria}>
                {c.categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
          <SelectTrigger className="bg-slate-50 border-none">
            <SelectValue placeholder="Responsables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Responsables</SelectItem>
            {RESPONSIBLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="bg-slate-50 border-none">
            <SelectValue placeholder="Prioridades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Prioridades</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-slate-50 border-none">
            <SelectValue placeholder="Estado Pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado Pago</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="Parcial">Parcial</SelectItem>
            <SelectItem value="Pagado">Pagado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Filter className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
              Total Selección
            </p>
            <p className="text-xs font-semibold text-slate-600">
              {categoryFilter && categoryFilter !== 'all'
                ? `Filtrado por: ${categoryFilter}`
                : 'Todos los movimientos'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-slate-900 leading-tight">
            ${totalFiltered.toLocaleString()}
          </p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
            {filteredExpenses.length} operaciones
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors py-4 pl-4"
                onClick={() => handleSort('fecha')}
              >
                Fecha {sortConfig?.key === 'fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>

              <TableHead
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors py-4"
                onClick={() => handleSort('subcategoria')}
              >
                Concepto / Movimiento {sortConfig?.key === 'subcategoria' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>

              <TableHead
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors py-4"
                onClick={() => handleSort('prioridad')}
              >
                Prioridad {sortConfig?.key === 'prioridad' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>

              <TableHead
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 transition-colors py-4"
                onClick={() => handleSort('estado_pago')}
              >
                Estado {sortConfig?.key === 'estado_pago' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>

              <TableHead
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right cursor-pointer hover:text-blue-600 transition-colors py-4"
                onClick={() => handleSort('monto')}
              >
                Monto {sortConfig?.key === 'monto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>

              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right py-4 pr-4">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <AnimatePresence mode="popLayout">
              {filteredExpenses.map((e) => {
                const estadoVencimiento = getEstadoVencimiento(e);
                const colorVencimiento = getColorVencimiento(estadoVencimiento);
                const estadoPagoReal = getEstadoPagoReal(e as ExpenseWithCredit);
                const montoExigible = getMontoExigible(e as ExpenseWithCredit);
                const saldoPendiente = Math.max(0, montoExigible - (e.total_abonado ?? 0));

                return (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="text-[11px] text-slate-400 font-medium py-4">
                      {formatDate(e.fecha, 'dd MMM')}
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="font-bold text-slate-900 text-[15px] leading-tight mb-1">
                        {e.subcategoria}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 opacity-80">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: CATEGORIES.find((c) => c.categoria === e.categoria)?.color }}
                          />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                            {e.categoria}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-300">•</span>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          {e.responsable}
                        </span>

                        <span className="text-[10px] text-slate-300">•</span>

                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${colorVencimiento}`}
                        >
                          {getVencimientoLabel(e)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${getPriorityColor(e.prioridad)}`}>
                        {e.prioridad}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingPaymentIds.has(e.id)}
                          onClick={() => {
                            if (estadoPagoReal === 'Pendiente' || estadoPagoReal === 'Parcial') {
                              onActionPayment(e);
                            } else {
                              onTogglePayment(e.id, estadoPagoReal);
                            }
                          }}
                          className={`h-7 px-3 text-[10px] font-bold transition-all duration-300 rounded-full active:scale-95 ${
                            updatingPaymentIds.has(e.id) ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            estadoPagoReal === 'Pagado'
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : estadoPagoReal === 'Parcial'
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}
                          title={estadoPagoReal === 'Pagado' ? 'Marcar como Pendiente' : 'Registrar Pago'}
                        >
                          <span className="flex items-center gap-1.5">
                            {updatingPaymentIds.has(e.id) ? (
                              <Activity className="w-3 h-3 animate-spin" />
                            ) : estadoPagoReal === 'Pagado' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : estadoPagoReal === 'Parcial' ? (
                              <Activity className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}

                            <span>
                              {updatingPaymentIds.has(e.id)
                                ? '...'
                                : estadoPagoReal === 'Pagado'
                                ? 'Pagado'
                                : estadoPagoReal === 'Parcial'
                                ? 'Abonar'
                                : 'Pagar'}
                            </span>
                          </span>
                        </Button>

                        {estadoPagoReal === 'Pagado' && e.fecha_pago && (
                          <div className="text-[8px] text-slate-400 ml-1 font-bold uppercase tracking-tighter">
                            {formatDate(e.fecha_pago, 'dd/MM')}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right py-4">
                      <div className="flex flex-col items-end">
                        <div className="flex flex-col items-end leading-none gap-0.5">
                          <span className="font-black text-slate-900 text-sm">
                            ${e.monto.toLocaleString()}
                          </span>

                          {(e.total_abonado ?? 0) > 0 && estadoPagoReal !== 'Pagado' && (
                            <span className="text-[9px] font-medium text-slate-400">
                              Abonado: ${(e.total_abonado ?? 0).toLocaleString()}
                            </span>
                          )}

                          {estadoPagoReal === 'Parcial' && (
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">
                              Saldo: ${saldoPendiente.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {(e.total_abonado ?? 0) > 0 && estadoPagoReal !== 'Pagado' && (
                          <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-amber-400 transition-all duration-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  montoExigible > 0 ? ((e.total_abonado ?? 0) / montoExigible) * 100 : 100
                                )}%`
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right py-4">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-lg"
                          title="Ver Historial"
                          onClick={() => onShowHistory(e)}
                        >
                          <HistoryIcon className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                          onClick={() => onEdit(e)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>

            {filteredExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                  No se encontraron gastos con los filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};