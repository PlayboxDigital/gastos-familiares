import React, { useState, useMemo } from 'react';
import { GastoPagoHistorial, Expense, PaymentStatus } from '../types';
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
  Filter,
  Trash2,
  Edit2,
  ExternalLink,
  History as HistoryIcon,
  Archive,
  RotateCcw,
  Calendar,
  CreditCard,
  Tag,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentHistoryProps {
  history: GastoPagoHistorial[];
  expenses: Expense[];
  onActionPayment: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onShowHistory: (expense: Expense) => void;
  onTogglePayment: (id: string, status: PaymentStatus) => void;
  onToggleArchive: (id: string, archived: boolean) => void;
  onDeletePayment: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  history = [],
  expenses = [],
  onActionPayment,
  onEdit,
  onShowHistory,
  onTogglePayment,
  onToggleArchive,
  onDeletePayment,
  onDeleteExpense
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'month' | 'category'>('month');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  const toggleGroup = (groupId: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }
    setExpandedGroups(next);
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const concept = (item.gasto_concepto_snapshot || '').toLowerCase();
      const subcat = (item.subcategoria_snapshot || '').toLowerCase();
      const entity = (item.entidad_pago || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      return concept.includes(search) || 
             subcat.includes(search) || 
             entity.includes(search) ||
             item.periodo_anio.toString().includes(search);
    }).sort((a, b) => {
      // Sort by date descending
      return b.fecha_pago.localeCompare(a.fecha_pago);
    });
  }, [history, searchTerm]);

  const groupedHistory = useMemo(() => {
    if (groupBy === 'none') return { 'Todos los registros': filteredHistory };

    const groups: Record<string, GastoPagoHistorial[]> = {};

    filteredHistory.forEach(item => {
      let key = '';
      if (groupBy === 'month') {
        // Formato: "Octubre 2024"
        const date = new Date(item.periodo_anio, item.periodo_mes - 1);
        key = format(date, 'MMMM yyyy', { locale: es });
      } else if (groupBy === 'category') {
        key = item.categoria_snapshot || 'Sin categoría';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return groups;
  }, [filteredHistory, groupBy]);

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'dd MMM, yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const getExpenseForPayment = (payment: GastoPagoHistorial) => {
    return expenses.find(e => e.id === payment.gasto_id);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar en el historial..."
            className="pl-10 bg-white border-slate-200 rounded-2xl h-11 transition-all focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <Button
            variant={groupBy === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            className={`rounded-xl px-4 h-8 text-[10px] font-black uppercase tracking-wider transition-all ${groupBy === 'month' ? 'shadow-sm text-indigo-600 bg-white' : 'text-slate-500'}`}
            onClick={() => setGroupBy('month')}
          >
            Por Mes
          </Button>
          <Button
            variant={groupBy === 'category' ? 'secondary' : 'ghost'}
            size="sm"
            className={`rounded-xl px-4 h-8 text-[10px] font-black uppercase tracking-wider transition-all ${groupBy === 'category' ? 'shadow-sm text-indigo-600 bg-white' : 'text-slate-500'}`}
            onClick={() => setGroupBy('category')}
          >
            Por Categoría
          </Button>
          <Button
            variant={groupBy === 'none' ? 'secondary' : 'ghost'}
            size="sm"
            className={`rounded-xl px-4 h-8 text-[10px] font-black uppercase tracking-wider transition-all ${groupBy === 'none' ? 'shadow-sm text-indigo-600 bg-white' : 'text-slate-500'}`}
            onClick={() => setGroupBy('none')}
          >
            Lista Plana
          </Button>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pagado', value: filteredHistory.reduce((sum, item) => sum + item.monto_pagado, 0), icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Transacciones', value: filteredHistory.length, icon: HistoryIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Mes Actual', value: filteredHistory.filter(i => i.periodo_mes === new Date().getMonth() + 1 && i.periodo_anio === new Date().getFullYear()).reduce((sum, item) => sum + item.monto_pagado, 0), icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Promedio', value: Math.round(filteredHistory.length > 0 ? filteredHistory.reduce((sum, item) => sum + item.monto_pagado, 0) / filteredHistory.length : 0), icon: TrendingDown, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 ${stat.bg} rounded-2xl`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-xl font-black text-slate-900 leading-none">
                {stat.label.includes('Transacciones') ? stat.value : `$${stat.value.toLocaleString()}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="space-y-4 pb-20">
        {(Object.entries(groupedHistory) as [string, GastoPagoHistorial[]][]).map(([groupName, items]) => {
          const isExpanded = expandedGroups.has(groupName) || items.length < 5;
          const groupTotal = items.reduce((sum, i) => sum + i.monto_pagado, 0);

          return (
            <div key={groupName} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              {/* Group Header */}
              <div 
                className="px-6 py-4 bg-slate-50/50 flex items-center justify-between cursor-pointer group"
                onClick={() => toggleGroup(groupName)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{groupName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{items.length} movimientos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-indigo-600Leading-none mb-0.5">${groupTotal.toLocaleString()}</p>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Total del grupo</p>
                </div>
              </div>

              {/* Group Table */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <Table>
                      <TableHeader className="bg-slate-50/30">
                        <TableRow className="hover:bg-transparent border-slate-50">
                          <TableHead className="w-[120px] text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10">Fecha</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio / Concepto</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medio de Pago</TableHead>
                          <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</TableHead>
                          <TableHead className="w-[100px] text-right pr-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((pago) => {
                          const expense = getExpenseForPayment(pago);
                          return (
                            <TableRow key={pago.id} className="group hover:bg-slate-50/50 border-slate-50 transition-colors">
                              <TableCell className="pl-10">
                                <div className="space-y-0.5">
                                  <p className="text-[11px] font-black text-slate-900">{formatDate(pago.fecha_pago)}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                    Periodo {pago.periodo_mes}/{pago.periodo_anio.toString().substring(2)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-slate-800">{pago.subcategoria_snapshot || pago.gasto_concepto_snapshot}</span>
                                    {expense?.archived && (
                                      <Badge variant="secondary" className="text-[8px] font-black bg-slate-100 text-slate-400 border-none px-1.5 py-0 rounded-md">ARCHIVADO</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] font-bold border-slate-100 text-slate-400 py-0 px-1.5 rounded-lg">
                                      {pago.categoria_snapshot}
                                    </Badge>
                                    {pago.observaciones && (
                                      <span className="text-[10px] text-slate-300 italic truncate max-w-[150px]">• {pago.observaciones}</span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">
                                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-slate-700 uppercase leading-none">{pago.forma_pago}</p>
                                    {pago.entidad_pago && (
                                      <p className="text-[9px] font-bold text-slate-400 leading-none">{pago.entidad_pago}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <p className="text-base font-black text-slate-900">${pago.monto_pagado.toLocaleString()}</p>
                              </TableCell>
                              <TableCell className="pr-6">
                                <div className="flex justify-end gap-1">
                                  {(pago.comprobante_cloudinary_url || pago.comprobante_cloudinary_secure_url) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                                      onClick={() => window.open(pago.comprobante_cloudinary_secure_url || pago.comprobante_cloudinary_url, '_blank')}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  )}
                                  
                                  <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all p-0.5 ml-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-blue-600 rounded-lg"
                                      onClick={() => expense && onEdit(expense)}
                                      disabled={!expense}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-lg"
                                      onClick={() => onDeletePayment(pago.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
            <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center">
              <Search className="w-10 h-10 text-slate-200" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">No se encontraron registros</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">Prueba ajustando los filtros o buscando un término diferente.</p>
            </div>
            <Button 
              variant="outline" 
              className="rounded-2xl font-black uppercase text-xs tracking-wider h-11 px-8 border-slate-200"
              onClick={() => setSearchTerm('')}
            >
              LIMPIAR BÚSQUEDA
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
