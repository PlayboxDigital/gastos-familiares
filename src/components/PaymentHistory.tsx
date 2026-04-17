import React, { useState, useMemo, useEffect } from 'react';
import { GastoPagoHistorial, Expense } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Calendar,
  FileText,
  User,
  CreditCard,
  Hash,
  Folder,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  XCircle,
  History as HistoryIcon,
  RotateCcw,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { format, isWithinInterval, parseISO, addMonths, startOfMonth, differenceInMonths, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const StatusFilterButton = ({ 
  label, 
  count, 
  active, 
  onClick,
  colorClass
}: { 
  label: string; 
  count: number; 
  active: boolean; 
  onClick: () => void;
  colorClass: 'blue' | 'emerald' | 'amber' | 'rose';
}) => {
  const colorMaps = {
    blue: active ? 'bg-blue-600 text-white shadow-blue-100 border-blue-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100',
    emerald: active ? 'bg-emerald-600 text-white shadow-emerald-100 border-emerald-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100',
    amber: active ? 'bg-amber-500 text-white shadow-amber-100 border-amber-500' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100',
    rose: active ? 'bg-rose-600 text-white shadow-rose-100 border-rose-600' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2 border shadow-sm ${colorMaps[colorClass]}`}
    >
      {label}
      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] ${active ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
        {count}
      </span>
    </button>
  );
};

// Helpers locales para blindaje de fechas
const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const parsed = parseISO(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

const getSafeTimestamp = (dateStr: string | null | undefined): number => {
  const date = safeParseDate(dateStr);
  return date ? date.getTime() : 0;
};

const formatSafeDate = (dateStr: string, formatStr: string, options?: any): string => {
  const date = safeParseDate(dateStr);
  if (!date) return 'N/A';
  return format(date, formatStr, options);
};

interface PaymentHistoryProps {
  history: GastoPagoHistorial[];
  expenses: Expense[];
  onActionPayment: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onDeletePayment: (pagoId: string, gastoId: string) => void;
  onShowHistory: (expense: Expense) => void;
  onTogglePayment: (id: string, currentStatus: any) => void;
  onToggleArchive?: (id: string, archived: boolean) => void;
}

interface UnifiedItem extends Partial<GastoPagoHistorial> {
  id: string;
  sourceType: 'payment' | 'expense';
  status: 'pagado' | 'pendiente' | 'vencido';
  fecha_pago: string; // Used for unified sorting and filtering
  servicio_clave: string;
  categoria_snapshot: string;
  responsable_snapshot: string;
  monto_pagado: number;
  forma_pago: string;
  referencia_pago: string;
  originalExpense?: Expense;
  archived?: boolean;
}

interface HistoryGroup {
  key: string;
  label: string;
  year: number;
  month: number;
  items: UnifiedItem[];
  total: number;
}

export function PaymentHistory({ 
  history, 
  expenses, 
  onActionPayment,
  onEdit,
  onDelete,
  onDeletePayment,
  onShowHistory,
  onTogglePayment,
  onToggleArchive
}: PaymentHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('Todos');
  const [selectedResponsible, setSelectedResponsible] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'Todos' | 'pagado' | 'pendiente' | 'vencido'>('Todos');
  const [visibilityFilter, setVisibilityFilter] = useState<'Activos' | 'Archivados'>('Activos');
  const [sortConfig, setSortConfig] = useState<{
    key: 'fecha_pago' | 'monto_pagado';
    direction: 'asc' | 'desc';
  } | null>({ key: 'fecha_pago', direction: 'desc' });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const itemsUnificados = useMemo<UnifiedItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Registros provenientes del historial de pagos (Pagos reales e individuales)
    const historyItems: UnifiedItem[] = history.map(h => {
      const originalExpense = expenses.find(e => e.id === h.gasto_id);
      
      return {
        ...h,
        sourceType: 'payment', // Campo clave para identificar un pago real del historial
        status: 'pagado',
        fecha_pago: h.fecha_pago,
        servicio_clave: h.servicio_clave,
        categoria_snapshot: h.categoria_snapshot,
        responsable_snapshot: h.responsable_snapshot,
        monto_pagado: h.monto_pagado,
        forma_pago: h.forma_pago || 'N/A',
        referencia_pago: h.referencia_pago || '',
        originalExpense,
        archived: originalExpense?.archived || false
      };
    });

    // 2. Generación de registros Faltantes / Pendientes basados en Fecha de Inicio
    const gapItems: UnifiedItem[] = [];
    const todayStart = startOfMonth(new Date());

    expenses.forEach(e => {
      // Calculamos el inicio del devengamiento
      const startDate = safeParseDate(e.fecha);
      if (!startDate || !isValid(startDate)) return;

      const firstMonth = startOfMonth(startDate);
      const lastMonth = todayStart;

      // Iteramos mes a mes desde el inicio hasta hoy
      let current = firstMonth;
      while (current <= lastMonth) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;

        // ¿Existe ya un pago para este servicio en este período?
        // Buscamos en el historial real
        const isPaid = history.some(h => 
          h.gasto_id === e.id && 
          h.periodo_anio === year && 
          h.periodo_mes === month
        );

        if (!isPaid) {
          // Si no está pago, es un ítem pendiente o vencido
          const isVencido = current < todayStart;
          
          gapItems.push({
            id: `gap-${e.id}-${year}-${month}`,
            sourceType: 'expense',
            status: isVencido ? 'vencido' : 'pendiente',
            fecha_pago: format(current, 'yyyy-MM-dd'),
            servicio_clave: e.subcategoria,
            categoria_snapshot: e.categoria,
            responsable_snapshot: e.responsable,
            monto_pagado: e.monto,
            forma_pago: 'Faltante',
            referencia_pago: `Período ${month}/${year}`,
            originalExpense: e,
            archived: e.archived || false
          });
        }
        current = addMonths(current, 1);
      }
    });

    const unified = [...historyItems, ...gapItems];
    console.log("UNIFICACION_ITEMS_CON_GAPS:", unified.length);
    return unified;
  }, [history, expenses]);

  const responsibles = useMemo(
    () => ['Todos', ...Array.from(new Set(itemsUnificados.map(h => h.responsable_snapshot).filter(Boolean)))],
    [itemsUnificados]
  );

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(itemsUnificados.map(h => h.categoria_snapshot).filter(Boolean)))],
    [itemsUnificados]
  );

  const methods = useMemo(
    () => ['Todos', ...Array.from(new Set(itemsUnificados.map(h => h.forma_pago).filter(Boolean)))],
    [itemsUnificados]
  );

  const filteredHistory = useMemo(() => {
    const baseFiltered = itemsUnificados.filter(item => {
      const matchesSearch =
        (item.servicio_clave || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.gasto_concepto_snapshot || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.subcategoria_snapshot || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.referencia_pago || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.entidad_pago || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesResponsible =
        selectedResponsible === 'Todos' || item.responsable_snapshot === selectedResponsible;
      const matchesCategory =
        selectedCategory === 'Todos' || item.categoria_snapshot === selectedCategory;
      const matchesMethod =
        selectedMethod === 'Todos' || item.forma_pago === selectedMethod;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const itemDate = safeParseDate(item.fecha_pago);
        if (!itemDate) {
          matchesDate = false;
        } else {
          const start = safeParseDate(dateFrom) || new Date(0);
          const endObj = safeParseDate(dateTo) || new Date();
          const end = new Date(endObj);
          if (dateTo) end.setHours(23, 59, 59, 999);

          matchesDate = isWithinInterval(itemDate, { start, end });
        }
      }

      return matchesSearch && matchesResponsible && matchesCategory && matchesMethod && matchesDate;
    });

    const statusFiltered = baseFiltered.filter(item => {
      if (activeStatusFilter === 'Todos') return true;
      return item.status === activeStatusFilter;
    });

    const visibilityFiltered = statusFiltered.filter(item => {
      if (visibilityFilter === 'Activos') return !item.archived;
      if (visibilityFilter === 'Archivados') return item.archived;
      return true;
    });

    const itemsFinales = visibilityFiltered;

    console.log("FILTRO_HISTORIAL_MOVIMIENTOS:", activeStatusFilter);
    console.log("FILTRO_VISIBILIDAD:", visibilityFilter);

    return itemsFinales.sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      let comparison = 0;

      if (key === 'fecha_pago') {
        comparison = getSafeTimestamp(a.fecha_pago) - getSafeTimestamp(b.fecha_pago);
      } else {
        comparison = (a.monto_pagado || 0) - (b.monto_pagado || 0);
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [
    itemsUnificados,
    searchTerm,
    selectedResponsible,
    selectedCategory,
    selectedMethod,
    dateFrom,
    dateTo,
    sortConfig,
    activeStatusFilter,
    visibilityFilter
  ]);

  const statusCounts = useMemo(() => {
    const visiblePool = itemsUnificados.filter(i => 
      visibilityFilter === 'Activos' ? !i.archived : i.archived
    );
    
    return {
      Todos: visiblePool.length,
      pagado: visiblePool.filter(i => i.status === 'pagado').length,
      pendiente: visiblePool.filter(i => i.status === 'pendiente').length,
      vencido: visiblePool.filter(i => i.status === 'vencido').length,
    };
  }, [itemsUnificados, visibilityFilter]);

  const groupedHistory = useMemo<HistoryGroup[]>(() => {
    const groups = new Map<string, HistoryGroup>();

    filteredHistory.forEach((item) => {
      const parsedDate = safeParseDate(item.fecha_pago);
      const year = parsedDate ? parsedDate.getFullYear() : 0;
      const month = parsedDate ? parsedDate.getMonth() : -1;
      const key = parsedDate ? `${year}-${String(month + 1).padStart(2, '0')}` : 'sin-fecha';
      const label = parsedDate
        ? format(parsedDate, 'MMMM yyyy', { locale: es })
        : 'Sin fecha';

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label,
          year,
          month,
          items: [],
          total: 0,
        });
      }

      const group = groups.get(key)!;
      group.items.push(item);
      group.total += item.monto_pagado || 0;
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === 'sin-fecha') return 1;
      if (b.key === 'sin-fecha') return -1;

      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [filteredHistory]);

  useEffect(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    setOpenGroups(prev => {
      const next: Record<string, boolean> = {};

      groupedHistory.forEach((group, index) => {
        if (prev[group.key] !== undefined) {
          next[group.key] = prev[group.key];
        } else {
          next[group.key] = group.key === currentKey || (index === 0 && currentKey !== group.key);
        }
      });

      return next;
    });
  }, [groupedHistory]);

  const totalFiltered = useMemo(
    () => filteredHistory.reduce((sum, h) => sum + h.monto_pagado, 0),
    [filteredHistory]
  );

  const handleSort = (key: 'fecha_pago' | 'monto_pagado') => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todos');
    setSelectedMethod('Todos');
    setSelectedResponsible('Todos');
    setDateFrom('');
    setDateTo('');
    setActiveStatusFilter('Todos');
    setVisibilityFilter('Activos');
  };

  const handleToggleArchive = (item: UnifiedItem) => {
    if (!onToggleArchive || !item.originalExpense) return;
    const expenseId = item.id.startsWith('exp-') ? item.id.replace('exp-', '') : item.gasto_id;
    if (!expenseId) return;
    const nuevoArchived = !item.archived;
    
    console.log("ARCHIVAR_GASTO_ID:", expenseId);
    console.log("ARCHIVAR_NUEVO_VALOR:", nuevoArchived);
    
    onToggleArchive(expenseId, nuevoArchived);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Historial de movimientos</h2>
          <p className="text-slate-500 text-sm font-medium">
            Consulta y gestiona todos tus gastos, pagos y vencimientos en un solo lugar.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
              Total Filtrado
            </p>
            <p className="text-lg font-black text-emerald-600 leading-none">
              ${totalFiltered.toLocaleString()}
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
              Pagos
            </p>
            <p className="text-lg font-black text-slate-900 leading-none">
              {filteredHistory.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Filtros de Estado */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 pb-2">
            <StatusFilterButton 
              label="Todos" 
              count={statusCounts.Todos} 
              active={activeStatusFilter === 'Todos'} 
              onClick={() => setActiveStatusFilter('Todos')}
              colorClass="blue"
            />
            <StatusFilterButton 
              label="Pagados" 
              count={statusCounts.pagado} 
              active={activeStatusFilter === 'pagado'} 
              onClick={() => setActiveStatusFilter('pagado')}
              colorClass="emerald"
            />
            <StatusFilterButton 
              label="Por vencer" 
              count={statusCounts.pendiente} 
              active={activeStatusFilter === 'pendiente'} 
              onClick={() => setActiveStatusFilter('pendiente')}
              colorClass="amber"
            />
            <StatusFilterButton 
              label="Vencidos" 
              count={statusCounts.vencido} 
              active={activeStatusFilter === 'vencido'} 
              onClick={() => setActiveStatusFilter('vencido')}
              colorClass="rose"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setVisibilityFilter('Activos')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  visibilityFilter === 'Activos'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => setVisibilityFilter('Archivados')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  visibilityFilter === 'Archivados'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Archivados
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por concepto, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-xs font-medium"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-8 h-10 bg-slate-50/50 border-slate-200 text-[10px] font-bold"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-8 h-10 bg-slate-50/50 border-slate-200 text-[10px] font-bold"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 h-10 rounded-md border border-slate-200 bg-slate-50/50 px-3 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="flex-1 h-10 rounded-md border border-slate-200 bg-slate-50/50 px-3 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {methods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <select
            value={selectedResponsible}
            onChange={(e) => setSelectedResponsible(e.target.value)}
            className="h-10 rounded-md border border-slate-200 bg-slate-50/50 px-3 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {responsibles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-5">
        <AnimatePresence mode="popLayout">
          {groupedHistory.length > 0 ? (
            groupedHistory.map((group) => {
              const isOpen = !!openGroups[group.key];

              return (
                <motion.div
                  key={group.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200 hover:bg-slate-100/70 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50">
                        <Folder className="w-4 h-4 text-blue-600" />
                      </div>

                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}

                        <div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                            {group.label}
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {group.items.length} pago{group.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                        Total del mes
                      </p>
                      <p className="text-base font-black text-slate-900 leading-none">
                        ${group.total.toLocaleString()}
                      </p>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-blue-600 py-4 pl-6"
                                onClick={() => handleSort('fecha_pago')}
                              >
                                <div className="flex items-center gap-1">
                                  Fecha {sortConfig?.key === 'fecha_pago' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                              </TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">
                                Detalle / Origen
                              </TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4 text-center">
                                Método
                              </TableHead>
                              <TableHead
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer hover:text-blue-600 py-4"
                                onClick={() => handleSort('monto_pagado')}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Monto {sortConfig?.key === 'monto_pagado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                              </TableHead>
                              <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right py-4 pr-6">
                                Comprobante
                              </TableHead>
                            </TableRow>
                          </TableHeader>

                          <TableBody>
                            {group.items.map((h) => (
                              <motion.tr
                                key={h.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="group hover:bg-slate-50/50 transition-colors"
                              >
                                <TableCell className="py-5 pl-6">
                                  <div className="text-[11px] font-black text-slate-900 leading-tight">
                                    {formatSafeDate(h.fecha_pago, "dd 'de' MMM", { locale: es })}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                    {formatSafeDate(h.fecha_pago, 'yyyy')}
                                  </div>
                                </TableCell>

                                <TableCell className="py-5">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-900 text-sm">
                                      {h.servicio_clave}
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className="text-[8px] font-bold px-1.5 py-0 border-slate-200 text-slate-500 uppercase h-4"
                                      >
                                        {h.categoria_snapshot}
                                      </Badge>
                                      {h.archived && (
                                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4">
                                          Archivado
                                        </Badge>
                                      )}
                                      <span className="text-slate-300 text-[8px]">•</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                        <User className="w-2.5 h-2.5" /> {h.responsable_snapshot}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="py-5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[10px] uppercase">
                                      <CreditCard className="w-3 h-3 text-slate-400" />
                                      {h.forma_pago}
                                    </div>
                                    {h.referencia_pago && (
                                      <div className="flex items-center gap-1 text-[8px] text-slate-400 font-medium">
                                        <Hash className="w-2 h-2" /> {h.referencia_pago}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell className="py-5 text-right font-black text-slate-900 text-sm">
                                  ${h.monto_pagado.toLocaleString()}
                                </TableCell>

                                <TableCell className="py-5 text-right pr-6">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Botones de Gestión (Edit/Delete/History) */}
                                    <div className="flex items-center gap-1 mr-2 px-2 border-r border-slate-100">
                                      {h.originalExpense && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                            onClick={() => h.originalExpense && onShowHistory(h.originalExpense)}
                                            title="Ver historial de este gasto"
                                          >
                                            <HistoryIcon className="w-3.5 h-3.5" />
                                          </Button>
                                          
                                          {onToggleArchive && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className={`h-7 w-7 rounded-lg ${
                                                h.archived 
                                                  ? 'hover:bg-blue-50 text-blue-400 hover:text-blue-600' 
                                                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                                              }`}
                                              onClick={() => handleToggleArchive(h)}
                                              title={h.archived ? "Restaurar movimiento" : "Archivar movimiento"}
                                            >
                                              {h.archived ? (
                                                <ArchiveRestore className="w-3.5 h-3.5" />
                                              ) : (
                                                <Archive className="w-3.5 h-3.5" />
                                              )}
                                            </Button>
                                          )}

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                            onClick={() => h.originalExpense && onEdit(h.originalExpense)}
                                            title="Editar movimiento"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 border border-slate-100"
                                            onClick={() => {
                                              if (confirm('¿Estás seguro de que deseas eliminar este movimiento completo?\nSe borrará el gasto original y todo su historial de pagos asociado.')) {
                                                onDelete(h.originalExpense!.id);
                                              }
                                            }}
                                            title="Eliminar movimiento completo (Gasto + Historial)"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-black uppercase">Gasto</span>
                                          </Button>
                                          {h.sourceType === 'payment' && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 px-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 border border-rose-200"
                                              onClick={() => h.gasto_id && onDeletePayment(h.id, h.gasto_id)}
                                              title={`Eliminar solo este pago de $${h.monto_pagado.toLocaleString()} del ${formatSafeDate(h.fecha_pago, 'dd/MM')}`}
                                            >
                                              <XCircle className="w-3.5 h-3.5" />
                                              <span className="text-[9px] font-black uppercase">Pago</span>
                                            </Button>
                                          )}
                                          {h.status === 'pagado' && h.sourceType === 'expense' && (
                                            <div 
                                              className="h-7 w-7 flex items-center justify-center text-slate-300"
                                              title="Este registro corresponde al gasto original, no a un pago individual"
                                            >
                                              <Clock className="w-3.5 h-3.5 opacity-50" />
                                            </div>
                                          )}
                                          {h.status === 'pagado' && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                              onClick={() => h.originalExpense && onTogglePayment(h.originalExpense.id, h.originalExpense.estado_pago)}
                                              title="Marcar como pendiente"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5" />
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    {/* Botón de Comprobante / Pagar */}
                                    {h.status === 'pagado' ? (
                                      (h.comprobante_transformado_url || h.comprobante_cloudinary_secure_url) ? (
                                        <a
                                          href={h.comprobante_transformado_url || h.comprobante_cloudinary_secure_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                          title="Ver comprobante"
                                        >
                                          <FileText className="w-4 h-4" />
                                        </a>
                                      ) : (
                                        <div 
                                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600"
                                          title="Pagado (Sin doc)"
                                        >
                                          <FileText className="w-4 h-4" />
                                        </div>
                                      )
                                    ) : h.status === 'pendiente' ? (
                                      <div className="flex items-center justify-end gap-2">
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[8px] font-black uppercase tracking-widest px-2">
                                          Por vencer
                                        </Badge>
                                        <Button
                                          size="sm"
                                          onClick={() => h.originalExpense && onActionPayment(h.originalExpense)}
                                          className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-tight gap-1.5"
                                        >
                                          <Clock className="w-3 h-3" /> Pagar
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2">
                                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none text-[8px] font-black uppercase tracking-widest px-2">
                                          Vencido
                                        </Badge>
                                        <Button
                                          size="sm"
                                          onClick={() => h.originalExpense && onActionPayment(h.originalExpense)}
                                          className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-tight gap-1.5"
                                        >
                                          <AlertTriangle className="w-3 h-3" /> Pagar
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-full">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    No se encontraron pagos con estos filtros
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-[10px] font-black text-blue-600 uppercase"
                  >
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}