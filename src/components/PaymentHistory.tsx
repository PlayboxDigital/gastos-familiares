import React, { useState, useMemo, useEffect } from 'react';
import { GastoPagoHistorial } from '../types';
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
  ChevronRight
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

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
}

interface HistoryGroup {
  key: string;
  label: string;
  year: number;
  month: number;
  items: GastoPagoHistorial[];
  total: number;
}

export function PaymentHistory({ history }: PaymentHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('Todos');
  const [selectedResponsible, setSelectedResponsible] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortConfig, setSortConfig] = useState<{
    key: 'fecha_pago' | 'monto_pagado';
    direction: 'asc' | 'desc';
  } | null>({ key: 'fecha_pago', direction: 'desc' });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const responsibles = useMemo(
    () => ['Todos', ...Array.from(new Set(history.map(h => h.responsable_snapshot).filter(Boolean)))],
    [history]
  );

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(history.map(h => h.categoria_snapshot).filter(Boolean)))],
    [history]
  );

  const methods = useMemo(
    () => ['Todos', ...Array.from(new Set(history.map(h => h.forma_pago).filter(Boolean)))],
    [history]
  );

  const filteredHistory = useMemo(() => {
    return history
      .filter(item => {
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
      })
      .sort((a, b) => {
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
    history,
    searchTerm,
    selectedResponsible,
    selectedCategory,
    selectedMethod,
    dateFrom,
    dateTo,
    sortConfig
  ]);

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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Historial de Pagos</h2>
          <p className="text-slate-500 text-sm font-medium">
            Consulta y analiza todos los desembolsos realizados.
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                  {(h.comprobante_transformado_url || h.comprobante_cloudinary_secure_url) ? (
                                    <a
                                      href={h.comprobante_transformado_url || h.comprobante_cloudinary_secure_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </a>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-300 uppercase italic">
                                      Sin doc
                                    </span>
                                  )}
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